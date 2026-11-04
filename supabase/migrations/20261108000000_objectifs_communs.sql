-- Objectifs communs entre deux amis : chacun garde son objectif (rappels, coches, widgets),
-- et les deux sont reliés. La flamme commune ne monte que si les deux le font.

create table public.commun (
  id                bigint generated always as identity primary key,
  cree_par          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  invite            uuid not null references auth.users (id) on delete cascade,
  objectif_createur bigint not null references public.objectif (id) on delete cascade,
  objectif_invite   bigint references public.objectif (id) on delete cascade, -- null tant que l'invitation n'est pas acceptée
  depuis            date,                                                     -- jour d'acceptation
  cree_le           timestamptz not null default now(),
  check (cree_par <> invite)
);
create unique index commun_objectif_createur_idx on public.commun (objectif_createur);
create unique index commun_objectif_invite_idx on public.commun (objectif_invite);
create index commun_invite_idx on public.commun (invite);
alter table public.commun enable row level security;
create policy "mes objectifs communs, lecture" on public.commun
  for select to authenticated using ((select auth.uid()) in (cree_par, invite));
grant select on public.commun to authenticated;

-- Propose à un ami de faire un de mes objectifs ensemble.
create function public.inviter_commun(p_objectif bigint, p_ami uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_id bigint;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if not exists (select 1 from public.objectif where id = p_objectif and utilisateur_id = auth.uid() and not archive) then
    raise exception 'Objectif introuvable' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.amitie where a = least(auth.uid(), p_ami) and b = greatest(auth.uid(), p_ami)) then
    raise exception 'Vous devez d''abord être amis.' using errcode = '22023';
  end if;
  if exists (select 1 from public.commun where p_objectif in (objectif_createur, objectif_invite)) then
    raise exception 'Cet objectif est déjà fait en commun.' using errcode = '22023';
  end if;
  insert into public.commun (cree_par, invite, objectif_createur) values (auth.uid(), p_ami, p_objectif)
  returning id into v_id;
  return v_id;
end $$;

-- Accepte une invitation : crée mon objectif, réglé comme celui de mon ami, et relie les deux.
create function public.accepter_commun(p_id bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_c public.commun;
  v_o public.objectif;
  v_mien bigint;
begin
  select * into v_c from public.commun where id = p_id and invite = auth.uid() and objectif_invite is null;
  if not found then raise exception 'Invitation introuvable' using errcode = 'P0002'; end if;
  select * into v_o from public.objectif where id = v_c.objectif_createur;
  insert into public.objectif (utilisateur_id, nom, categorie, type_frequence, cible, heure, couleur, mesure, objectif_quantite, date_creation, visible_amis)
  values (auth.uid(), v_o.nom, v_o.categorie, v_o.type_frequence, v_o.cible, v_o.heure, v_o.couleur, v_o.mesure, v_o.objectif_quantite, current_date, v_o.visible_amis)
  returning id into v_mien;
  update public.commun set objectif_invite = v_mien, depuis = current_date where id = p_id;
  return v_mien;
end $$;

-- Refuse une invitation, l'annule, ou arrête un objectif commun. Chacun garde son objectif perso.
create function public.quitter_commun(p_id bigint)
returns void language sql security definer set search_path = '' as $$
  delete from public.commun where id = p_id and auth.uid() in (cree_par, invite);
$$;

-- Mes objectifs communs et invitations, avec les jours cochés des deux côtés.
create function public.mes_communs()
returns table (
  id bigint, statut text, ami_id uuid, ami text, mon_objectif bigint, nom text, categorie text,
  type_frequence text, cible integer, heure text, depuis date, mes_jours date[], jours_ami date[]
)
language sql stable security definer set search_path = '' as $$
  select c.id,
         case when c.objectif_invite is not null then 'ACTIF'
              when c.cree_par = auth.uid() then 'ENVOYEE' else 'RECUE' end,
         u.id, initcap(split_part(u.email, '@', 1)),
         case when c.cree_par = auth.uid() then c.objectif_createur else c.objectif_invite end,
         o.nom, o.categorie, o.type_frequence, o.cible, to_char(o.heure, 'HH24:MI'), c.depuis,
         coalesce((select array_agg(v.jour order by v.jour) from public.validation v
                    where v.objectif_id = case when c.cree_par = auth.uid() then c.objectif_createur else c.objectif_invite end), '{}'),
         coalesce((select array_agg(v.jour order by v.jour) from public.validation v
                    where v.objectif_id = case when c.cree_par = auth.uid() then c.objectif_invite else c.objectif_createur end), '{}')
    from public.commun c
    join public.objectif o on o.id = c.objectif_createur
    join auth.users u on u.id = case when c.cree_par = auth.uid() then c.invite else c.cree_par end
   where auth.uid() in (c.cree_par, c.invite)
   order by c.cree_le;
$$;

-- Retirer un ami arrête aussi les objectifs communs avec lui.
create or replace function public.retirer_ami(p_ami uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.commun
   where (cree_par = auth.uid() and invite = p_ami) or (cree_par = p_ami and invite = auth.uid());
  delete from public.amitie
   where a = least(auth.uid(), p_ami) and b = greatest(auth.uid(), p_ami);
$$;

revoke execute on function public.inviter_commun(bigint, uuid) from public, anon;
revoke execute on function public.accepter_commun(bigint) from public, anon;
revoke execute on function public.quitter_commun(bigint) from public, anon;
revoke execute on function public.mes_communs() from public, anon;
grant execute on function public.inviter_commun(bigint, uuid) to authenticated;
grant execute on function public.accepter_commun(bigint) to authenticated;
grant execute on function public.quitter_commun(bigint) to authenticated;
grant execute on function public.mes_communs() to authenticated;
