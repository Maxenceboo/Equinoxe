-- Objectifs communs à plusieurs (jusqu'à 10) au lieu de deux.
-- Un objectif commun part de l'objectif de son créateur ; chaque membre a sa copie, reliée.
-- La flamme commune ne monte que si tous les membres le font.

create table public.commun_membre (
  commun_id      bigint not null references public.commun (id) on delete cascade,
  utilisateur_id uuid not null references auth.users (id) on delete cascade,
  -- ACTIF : il le fait ; INVITE : un membre l'a invité ; DEMANDE : il a demandé à rejoindre
  statut         text not null check (statut in ('ACTIF', 'INVITE', 'DEMANDE')),
  objectif_id    bigint unique references public.objectif (id) on delete cascade,
  invite_par     uuid references auth.users (id) on delete set null,
  depuis         date,
  cree_le        timestamptz not null default now(),
  primary key (commun_id, utilisateur_id),
  check ((statut = 'ACTIF') = (objectif_id is not null))
);
create index commun_membre_utilisateur_idx on public.commun_membre (utilisateur_id);
alter table public.commun_membre enable row level security;

-- Reprise des objectifs à deux existants
insert into public.commun_membre (commun_id, utilisateur_id, statut, objectif_id, depuis, cree_le)
select c.id, c.cree_par, 'ACTIF', c.objectif_createur, coalesce(c.depuis, c.cree_le::date), c.cree_le from public.commun c;
insert into public.commun_membre (commun_id, utilisateur_id, statut, objectif_id, invite_par, depuis, cree_le)
select c.id, c.invite,
       case when c.objectif_invite is not null then 'ACTIF' when c.demande then 'DEMANDE' else 'INVITE' end,
       c.objectif_invite, case when c.demande then null else c.cree_par end,
       case when c.objectif_invite is not null then coalesce(c.depuis, c.cree_le::date) end, c.cree_le
  from public.commun c;

-- Les anciennes fonctions dépendent des colonnes à deux : on les remplace toutes
drop trigger objectif_commun_synchro on public.objectif;
drop function public.synchroniser_commun();
drop function public.mes_communs();
drop function public.inviter_commun(bigint, uuid);
drop function public.accepter_commun(bigint);
drop function public.quitter_commun(bigint);
drop policy "mes objectifs communs, lecture" on public.commun;
alter table public.commun drop column invite, drop column objectif_invite, drop column demande;
create policy "mes objectifs communs, lecture" on public.commun for select to authenticated
  using (exists (select 1 from public.commun_membre m where m.commun_id = id and m.utilisateur_id = (select auth.uid())));
create policy "mes objectifs communs, mon rang" on public.commun_membre for select to authenticated
  using (utilisateur_id = (select auth.uid()));

-- Mon rôle dans un commun
create function public.est_membre_actif(p_commun bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.commun_membre where commun_id = p_commun and utilisateur_id = auth.uid() and statut = 'ACTIF');
$$;

-- Le commun qui contient un objectif (s'il y en a un)
create function public.commun_de(p_objectif bigint)
returns bigint language sql stable security definer set search_path = '' as $$
  select commun_id from public.commun_membre where objectif_id = p_objectif;
$$;

-- Nom, fréquence et cible restent les mêmes pour tous les membres
create function public.synchroniser_commun()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if pg_trigger_depth() > 1 then return new; end if;
  if new.nom is not distinct from old.nom and new.type_frequence is not distinct from old.type_frequence
     and new.cible is not distinct from old.cible then
    return new;
  end if;
  update public.objectif o
     set nom = new.nom, type_frequence = new.type_frequence, cible = new.cible,
         cible_depuis = case when o.cible <> new.cible or o.type_frequence <> new.type_frequence then current_date else o.cible_depuis end
    from public.commun_membre m
   where m.objectif_id = o.id and o.id <> new.id
     and m.commun_id = (select commun_id from public.commun_membre where objectif_id = new.id);
  return new;
end $$;
create trigger objectif_commun_synchro
  after update of nom, type_frequence, cible on public.objectif
  for each row execute function public.synchroniser_commun();

-- Inviter un ami sur mon objectif (fait seul ou déjà à plusieurs)
create function public.inviter_commun(p_objectif bigint, p_ami uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_commun bigint;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if not exists (select 1 from public.objectif where id = p_objectif and utilisateur_id = auth.uid() and not archive) then
    raise exception 'Objectif introuvable' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.amitie where a = least(auth.uid(), p_ami) and b = greatest(auth.uid(), p_ami)) then
    raise exception 'Vous devez d''abord être amis.' using errcode = '22023';
  end if;
  v_commun := public.commun_de(p_objectif);
  if v_commun is null then
    insert into public.commun (cree_par, objectif_createur, depuis) values (auth.uid(), p_objectif, current_date)
    returning id into v_commun;
    insert into public.commun_membre (commun_id, utilisateur_id, statut, objectif_id, depuis)
    values (v_commun, auth.uid(), 'ACTIF', p_objectif, current_date);
  end if;
  if exists (select 1 from public.commun_membre where commun_id = v_commun and utilisateur_id = p_ami) then
    raise exception 'Cet ami en fait déjà partie, ou une invitation est en attente.' using errcode = '22023';
  end if;
  if (select count(*) from public.commun_membre where commun_id = v_commun) >= 10 then
    raise exception 'Un objectif commun se fait à 10 au plus.' using errcode = '22023';
  end if;
  insert into public.commun_membre (commun_id, utilisateur_id, statut, invite_par) values (v_commun, p_ami, 'INVITE', auth.uid());
  return v_commun;
end $$;

-- Demander à rejoindre l'objectif visible d'un ami
create or replace function public.rejoindre_objectif_ami(p_objectif bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_o public.objectif;
  v_commun bigint;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  select * into v_o from public.objectif where id = p_objectif and visible_amis and not archive;
  if not found or not exists (
    select 1 from public.amitie where a = least(auth.uid(), v_o.utilisateur_id) and b = greatest(auth.uid(), v_o.utilisateur_id)
  ) then
    raise exception 'Objectif introuvable' using errcode = 'P0002';
  end if;
  v_commun := public.commun_de(p_objectif);
  if v_commun is null then
    insert into public.commun (cree_par, objectif_createur, depuis) values (v_o.utilisateur_id, p_objectif, current_date)
    returning id into v_commun;
    insert into public.commun_membre (commun_id, utilisateur_id, statut, objectif_id, depuis)
    values (v_commun, v_o.utilisateur_id, 'ACTIF', p_objectif, current_date);
  end if;
  if exists (select 1 from public.commun_membre where commun_id = v_commun and utilisateur_id = auth.uid()) then
    raise exception 'Tu en fais déjà partie, ou une demande est en attente.' using errcode = '22023';
  end if;
  if (select count(*) from public.commun_membre where commun_id = v_commun) >= 10 then
    raise exception 'Un objectif commun se fait à 10 au plus.' using errcode = '22023';
  end if;
  insert into public.commun_membre (commun_id, utilisateur_id, statut) values (v_commun, auth.uid(), 'DEMANDE');
  return v_commun;
end $$;

-- Accepter : mon invitation (p_membre vide), ou la demande d'un ami sur un objectif que je fais.
-- Crée l'objectif de celui qui arrive, réglé comme celui du créateur. Renvoie mon objectif.
create function public.accepter_commun(p_id bigint, p_membre uuid default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_qui uuid := coalesce(p_membre, auth.uid());
  v_c public.commun;
  v_o public.objectif;
  v_nouveau bigint;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if p_membre is null then
    perform 1 from public.commun_membre where commun_id = p_id and utilisateur_id = auth.uid() and statut = 'INVITE';
  else
    perform 1 from public.commun_membre where commun_id = p_id and utilisateur_id = p_membre and statut = 'DEMANDE'
       and public.est_membre_actif(p_id);
  end if;
  if not found then raise exception 'Invitation introuvable' using errcode = 'P0002'; end if;
  select * into v_c from public.commun where id = p_id;
  select * into v_o from public.objectif where id = v_c.objectif_createur;
  insert into public.objectif (utilisateur_id, nom, categorie, type_frequence, cible, heure, couleur, mesure, objectif_quantite, date_creation, visible_amis)
  values (v_qui, v_o.nom, v_o.categorie, v_o.type_frequence, v_o.cible, v_o.heure, v_o.couleur, v_o.mesure, v_o.objectif_quantite, current_date, true)
  returning id into v_nouveau;
  update public.commun_membre set statut = 'ACTIF', objectif_id = v_nouveau, depuis = current_date
   where commun_id = p_id and utilisateur_id = v_qui;
  if p_membre is null then return v_nouveau; end if;
  return (select objectif_id from public.commun_membre where commun_id = p_id and utilisateur_id = auth.uid());
end $$;

-- Quitter (p_membre vide), ou refuser une demande / annuler une invitation (p_membre).
-- Celui qui quitte l'objectif d'un autre perd sa copie. Si le créateur part, chacun garde la sienne et
-- le commun s'arrête. Un commun où il ne reste qu'un membre actif sans invitation s'arrête aussi.
create function public.quitter_commun(p_id bigint, p_membre uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_c public.commun;
  v_m public.commun_membre;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  select * into v_c from public.commun where id = p_id;
  if not found then return; end if;
  if p_membre is not null and p_membre <> auth.uid() then
    -- un membre actif peut refuser une demande ou annuler une invitation en attente
    if not public.est_membre_actif(p_id) then return; end if;
    delete from public.commun_membre where commun_id = p_id and utilisateur_id = p_membre and statut <> 'ACTIF';
  else
    select * into v_m from public.commun_membre where commun_id = p_id and utilisateur_id = auth.uid();
    if not found then return; end if;
    if v_c.cree_par = auth.uid() then
      delete from public.commun where id = p_id;
      return;
    end if;
    delete from public.commun_membre where commun_id = p_id and utilisateur_id = auth.uid();
    if v_m.objectif_id is not null then
      delete from public.objectif where id = v_m.objectif_id and utilisateur_id = auth.uid();
    end if;
  end if;
  if (select count(*) from public.commun_membre where commun_id = p_id) <= 1 then
    delete from public.commun where id = p_id;
  end if;
end $$;

-- Retirer un ami : il quitte mes objectifs communs, et moi les siens
create or replace function public.retirer_ami(p_ami uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r record;
begin
  for r in
    select m.commun_id, m.utilisateur_id, m.objectif_id from public.commun_membre m join public.commun c on c.id = m.commun_id
     where (c.cree_par = auth.uid() and m.utilisateur_id = p_ami) or (c.cree_par = p_ami and m.utilisateur_id = auth.uid())
  loop
    delete from public.commun_membre where commun_id = r.commun_id and utilisateur_id = r.utilisateur_id;
    if (select count(*) from public.commun_membre where commun_id = r.commun_id) <= 1 then
      delete from public.commun where id = r.commun_id;
    end if;
  end loop;
  delete from public.amitie where a = least(auth.uid(), p_ami) and b = greatest(auth.uid(), p_ami);
end $$;

-- Mes objectifs communs : mon statut, et chacun des autres membres avec ses jours cochés
create function public.mes_communs()
returns table (
  id bigint, statut text, cree_par_moi boolean, createur text, mon_objectif bigint, nom text, categorie text,
  type_frequence text, cible integer, heure text, mon_depuis date, mes_jours date[], membres jsonb
)
language sql stable security definer set search_path = '' as $$
  select c.id,
         case moi.statut when 'ACTIF' then 'ACTIF' when 'INVITE' then 'RECUE' else 'ENVOYEE' end,
         c.cree_par = auth.uid(),
         public.nom_affiche(c.cree_par),
         moi.objectif_id,
         o.nom, o.categorie, o.type_frequence, o.cible, to_char(o.heure, 'HH24:MI'), moi.depuis,
         coalesce((select array_agg(v.jour order by v.jour) from public.validation v where v.objectif_id = moi.objectif_id), '{}'),
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', m.utilisateur_id,
                    'nom', public.nom_affiche(m.utilisateur_id),
                    'statut', m.statut,
                    'depuis', m.depuis,
                    'jours', coalesce((select jsonb_agg(v.jour order by v.jour) from public.validation v where v.objectif_id = m.objectif_id), '[]'::jsonb)
                  ) order by m.cree_le)
             from public.commun_membre m
            where m.commun_id = c.id and m.utilisateur_id <> auth.uid()
              -- une demande en attente n'est montrée qu'aux membres actifs
              and (m.statut <> 'DEMANDE' or moi.statut = 'ACTIF')
         ), '[]'::jsonb)
    from public.commun_membre moi
    join public.commun c on c.id = moi.commun_id
    join public.objectif o on o.id = c.objectif_createur
   where moi.utilisateur_id = auth.uid()
   order by c.cree_le;
$$;

-- Objectifs visibles de mes amis : « en commun » s'ils sont déjà dans un objectif commun où je suis
create or replace function public.objectifs_amis()
returns table (
  objectif_id bigint, ami_id uuid, nom text, categorie text, type_frequence text, cible integer,
  date_creation date, jours date[], en_commun boolean
)
language sql stable security definer set search_path = '' as $$
  select o.id, o.utilisateur_id, o.nom, o.categorie, o.type_frequence, o.cible, o.date_creation,
         coalesce((select array_agg(v.jour order by v.jour) from public.validation v where v.objectif_id = o.id), '{}'),
         exists (select 1 from public.commun_membre lui join public.commun_membre moi on moi.commun_id = lui.commun_id
                  where lui.objectif_id = o.id and moi.utilisateur_id = auth.uid())
    from public.amitie am
    join public.objectif o
      on o.utilisateur_id = case when am.a = auth.uid() then am.b else am.a end
     and o.visible_amis and not o.archive
   where auth.uid() in (am.a, am.b)
   order by o.utilisateur_id, o.id;
$$;

revoke execute on function public.est_membre_actif(bigint) from public, anon, authenticated;
revoke execute on function public.commun_de(bigint) from public, anon, authenticated;
revoke execute on function public.inviter_commun(bigint, uuid) from public, anon;
revoke execute on function public.accepter_commun(bigint, uuid) from public, anon;
revoke execute on function public.quitter_commun(bigint, uuid) from public, anon;
revoke execute on function public.mes_communs() from public, anon;
grant execute on function public.inviter_commun(bigint, uuid) to authenticated;
grant execute on function public.accepter_commun(bigint, uuid) to authenticated;
grant execute on function public.quitter_commun(bigint, uuid) to authenticated;
grant execute on function public.mes_communs() to authenticated;
