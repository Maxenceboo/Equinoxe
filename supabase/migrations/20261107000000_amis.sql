-- Amis : on s'ajoute avec un code perso, et chaque objectif peut être visible par ses amis (ou privé).
-- Les amis ne voient que les objectifs visibles : nom, cible et jours cochés, jamais les détails.

alter table public.objectif add column visible_amis boolean not null default false;

-- Une amitié est réciproque : une seule ligne par paire, la plus petite identité en premier.
create table public.amitie (
  a      uuid not null references auth.users (id) on delete cascade,
  b      uuid not null references auth.users (id) on delete cascade,
  depuis timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
create index amitie_b_idx on public.amitie (b);
alter table public.amitie enable row level security;
create policy "mes amitiés, lecture" on public.amitie
  for select to authenticated using ((select auth.uid()) in (a, b));
create policy "mes amitiés, retirer" on public.amitie
  for delete to authenticated using ((select auth.uid()) in (a, b));
grant select, delete on public.amitie to authenticated;

-- Le code perso de chacun, créé à la demande par mon_code_ami()
create table public.code_ami (
  utilisateur_id uuid primary key references auth.users (id) on delete cascade,
  code           text not null unique
);
alter table public.code_ami enable row level security;
create policy "mon code ami" on public.code_ami
  for select to authenticated using (utilisateur_id = (select auth.uid()));
grant select on public.code_ami to authenticated;

create function public.mon_code_ami()
returns text language plpgsql security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  select code into v_code from public.code_ami where utilisateur_id = auth.uid();
  while v_code is null loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    if exists (select 1 from public.code_ami where code = v_code) then
      v_code := null;
    else
      insert into public.code_ami (utilisateur_id, code) values (auth.uid(), v_code);
    end if;
  end loop;
  return v_code;
end $$;

-- Ajoute l'ami dont on a reçu le code. Renvoie son nom affiché.
create function public.ajouter_ami(p_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_ami uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  select utilisateur_id into v_ami from public.code_ami where code = upper(trim(p_code));
  if not found then
    raise exception 'Aucun ami avec ce code. Vérifie les 6 caractères.' using errcode = 'P0002';
  end if;
  if v_ami = auth.uid() then
    raise exception 'C''est ton propre code : donne-le à un ami.' using errcode = '22023';
  end if;
  if (select count(*) from public.amitie where auth.uid() in (a, b)) >= 100 then
    raise exception 'Tu as déjà 100 amis.' using errcode = '22023';
  end if;
  insert into public.amitie (a, b) values (least(auth.uid(), v_ami), greatest(auth.uid(), v_ami))
  on conflict do nothing;
  return (select initcap(split_part(u.email, '@', 1)) from auth.users u where u.id = v_ami);
end $$;

create function public.retirer_ami(p_ami uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.amitie
   where a = least(auth.uid(), p_ami) and b = greatest(auth.uid(), p_ami);
$$;

-- Mes amis, avec leur nom affiché (ce qu'il y a avant l'arobase de leur email)
create function public.mes_amis()
returns table (ami_id uuid, nom text, depuis timestamptz)
language sql stable security definer set search_path = '' as $$
  select u.id, initcap(split_part(u.email, '@', 1)), am.depuis
    from public.amitie am
    join auth.users u on u.id = case when am.a = auth.uid() then am.b else am.a end
   where auth.uid() in (am.a, am.b)
   order by am.depuis;
$$;

-- Les objectifs visibles de mes amis : seulement le nom, la cible et les jours cochés
create function public.objectifs_amis()
returns table (
  objectif_id bigint, ami_id uuid, nom text, categorie text, type_frequence text, cible integer,
  date_creation date, jours date[]
)
language sql stable security definer set search_path = '' as $$
  select o.id, o.utilisateur_id, o.nom, o.categorie, o.type_frequence, o.cible, o.date_creation,
         coalesce((select array_agg(v.jour order by v.jour) from public.validation v where v.objectif_id = o.id), '{}')
    from public.amitie am
    join public.objectif o
      on o.utilisateur_id = case when am.a = auth.uid() then am.b else am.a end
     and o.visible_amis and not o.archive
   where auth.uid() in (am.a, am.b)
   order by o.utilisateur_id, o.id;
$$;

-- Les amis qui voient un de mes objectifs (aucun s'il est privé)
create function public.amis_qui_voient(p_objectif bigint)
returns table (nom text)
language sql stable security definer set search_path = '' as $$
  select initcap(split_part(u.email, '@', 1))
    from public.objectif o
    join public.amitie am on o.utilisateur_id in (am.a, am.b)
    join auth.users u on u.id = case when am.a = o.utilisateur_id then am.b else am.a end
   where o.id = p_objectif and o.utilisateur_id = auth.uid() and o.visible_amis
   order by am.depuis;
$$;

revoke execute on function public.mon_code_ami() from public, anon;
revoke execute on function public.ajouter_ami(text) from public, anon;
revoke execute on function public.retirer_ami(uuid) from public, anon;
revoke execute on function public.mes_amis() from public, anon;
revoke execute on function public.objectifs_amis() from public, anon;
revoke execute on function public.amis_qui_voient(bigint) from public, anon;
grant execute on function public.mon_code_ami() to authenticated;
grant execute on function public.ajouter_ami(text) to authenticated;
grant execute on function public.retirer_ami(uuid) to authenticated;
grant execute on function public.mes_amis() to authenticated;
grant execute on function public.objectifs_amis() to authenticated;
grant execute on function public.amis_qui_voient(bigint) to authenticated;

-- Reprise des anciens partages par code : le suiveur et le propriétaire deviennent amis,
-- et les objectifs déjà partagés deviennent visibles par les amis.
insert into public.amitie (a, b)
select distinct least(b.utilisateur_id, o.utilisateur_id), greatest(b.utilisateur_id, o.utilisateur_id)
  from public.binome b join public.objectif o on o.id = b.objectif_id
 where b.utilisateur_id <> o.utilisateur_id
on conflict do nothing;
update public.objectif o set visible_amis = true
 where exists (select 1 from public.binome b where b.objectif_id = o.id);
