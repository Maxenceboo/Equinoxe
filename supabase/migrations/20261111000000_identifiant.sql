-- Identifiant public (pseudo) choisi à l'inscription : on s'ajoute en ami avec, et c'est le nom affiché
-- aux amis (au lieu du début de l'email). Le code ami n'est plus proposé ; le code reste pour les groupes.

create table public.profil_public (
  utilisateur_id uuid primary key references auth.users (id) on delete cascade,
  pseudo         text not null check (pseudo ~ '^[a-z0-9_.]{3,20}$'),
  cree_le        timestamptz not null default now()
);
create unique index profil_public_pseudo_idx on public.profil_public (pseudo);
alter table public.profil_public enable row level security;
create policy "mon identifiant" on public.profil_public
  for select to authenticated using (utilisateur_id = (select auth.uid()));
grant select on public.profil_public to authenticated;

-- Nom affiché d'un utilisateur : son identifiant, sinon le début de son email
create function public.nom_affiche(p_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.pseudo from public.profil_public p where p.utilisateur_id = p_id),
    (select initcap(split_part(u.email, '@', 1)) from auth.users u where u.id = p_id)
  );
$$;

-- Identifiant libre ? (appelable avant l'inscription)
create function public.pseudo_disponible(p_pseudo text)
returns boolean language sql stable security definer set search_path = '' as $$
  select lower(trim(p_pseudo)) ~ '^[a-z0-9_.]{3,20}$'
     and not exists (select 1 from public.profil_public where pseudo = lower(trim(p_pseudo)));
$$;

create function public.mon_pseudo()
returns text language sql stable security definer set search_path = '' as $$
  select pseudo from public.profil_public where utilisateur_id = auth.uid();
$$;

-- Choisir (ou changer) son identifiant
create function public.choisir_pseudo(p_pseudo text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v text := lower(trim(p_pseudo));
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if v !~ '^[a-z0-9_.]{3,20}$' then
    raise exception 'De 3 à 20 caractères : lettres, chiffres, point ou tiret bas.' using errcode = '22023';
  end if;
  if exists (select 1 from public.profil_public where pseudo = v and utilisateur_id <> auth.uid()) then
    raise exception 'Cet identifiant est déjà pris.' using errcode = '22023';
  end if;
  insert into public.profil_public (utilisateur_id, pseudo) values (auth.uid(), v)
  on conflict (utilisateur_id) do update set pseudo = excluded.pseudo;
  return v;
end $$;

-- À l'inscription, l'identifiant saisi arrive dans les métadonnées du compte
create function public.identifiant_a_inscription()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v text := lower(trim(coalesce(new.raw_user_meta_data ->> 'pseudo', '')));
begin
  if v ~ '^[a-z0-9_.]{3,20}$' then
    insert into public.profil_public (utilisateur_id, pseudo) values (new.id, v) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger identifiant_a_inscription
  after insert on auth.users
  for each row execute function public.identifiant_a_inscription();

-- Ajouter un ami : par son identifiant (ou, pour les anciens liens, par son code ami)
create or replace function public.ajouter_ami(p_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_ami uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  select utilisateur_id into v_ami from public.profil_public where pseudo = lower(trim(ltrim(trim(p_code), '@')));
  if not found then
    select utilisateur_id into v_ami from public.code_ami where code = upper(trim(p_code));
  end if;
  if v_ami is null then
    raise exception 'Aucun compte avec cet identifiant.' using errcode = 'P0002';
  end if;
  if v_ami = auth.uid() then
    raise exception 'C''est ton propre identifiant.' using errcode = '22023';
  end if;
  if (select count(*) from public.amitie where auth.uid() in (a, b)) >= 100 then
    raise exception 'Tu as déjà 100 amis.' using errcode = '22023';
  end if;
  insert into public.amitie (a, b) values (least(auth.uid(), v_ami), greatest(auth.uid(), v_ami))
  on conflict do nothing;
  return public.nom_affiche(v_ami);
end $$;

create or replace function public.mes_amis()
returns table (ami_id uuid, nom text, depuis timestamptz)
language sql stable security definer set search_path = '' as $$
  select x.id, public.nom_affiche(x.id), am.depuis
    from public.amitie am
    cross join lateral (select case when am.a = auth.uid() then am.b else am.a end as id) x
   where auth.uid() in (am.a, am.b)
   order by am.depuis;
$$;

create or replace function public.amis_qui_voient(p_objectif bigint)
returns table (nom text)
language sql stable security definer set search_path = '' as $$
  select public.nom_affiche(case when am.a = o.utilisateur_id then am.b else am.a end)
    from public.objectif o
    join public.amitie am on o.utilisateur_id in (am.a, am.b)
   where o.id = p_objectif and o.utilisateur_id = auth.uid() and o.visible_amis
   order by am.depuis;
$$;

create or replace function public.mes_communs()
returns table (
  id bigint, statut text, demande boolean, ami_id uuid, ami text, mon_objectif bigint, nom text, categorie text,
  type_frequence text, cible integer, heure text, depuis date, mes_jours date[], jours_ami date[]
)
language sql stable security definer set search_path = '' as $$
  select c.id,
         case when c.objectif_invite is not null then 'ACTIF'
              when (c.cree_par = auth.uid()) = c.demande then 'RECUE' else 'ENVOYEE' end,
         c.demande,
         x.ami, public.nom_affiche(x.ami),
         case when c.cree_par = auth.uid() then c.objectif_createur else c.objectif_invite end,
         o.nom, o.categorie, o.type_frequence, o.cible, to_char(o.heure, 'HH24:MI'), c.depuis,
         coalesce((select array_agg(v.jour order by v.jour) from public.validation v
                    where v.objectif_id = case when c.cree_par = auth.uid() then c.objectif_createur else c.objectif_invite end), '{}'),
         coalesce((select array_agg(v.jour order by v.jour) from public.validation v
                    where v.objectif_id = case when c.cree_par = auth.uid() then c.objectif_invite else c.objectif_createur end), '{}')
    from public.commun c
    join public.objectif o on o.id = c.objectif_createur
    cross join lateral (select case when c.cree_par = auth.uid() then c.invite else c.cree_par end as ami) x
   where auth.uid() in (c.cree_par, c.invite)
   order by c.cree_le;
$$;

revoke execute on function public.nom_affiche(uuid) from public, anon, authenticated;
revoke execute on function public.mon_pseudo() from public, anon;
revoke execute on function public.choisir_pseudo(text) from public, anon;
grant execute on function public.pseudo_disponible(text) to anon, authenticated;
grant execute on function public.mon_pseudo() to authenticated;
grant execute on function public.choisir_pseudo(text) to authenticated;
