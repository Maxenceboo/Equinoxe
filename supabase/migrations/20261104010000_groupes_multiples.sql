-- Plusieurs groupes : un utilisateur peut appartenir à plusieurs foyers (famille, amis, collègues…).
-- Toutes les vérifications passent désormais par « suis-je membre / parent de CE groupe ».

alter table public.foyer_membre drop constraint foyer_membre_utilisateur_id_key;
create index foyer_membre_utilisateur_idx on public.foyer_membre (utilisateur_id);

create function public.est_membre(p_foyer bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.foyer_membre where foyer_id = p_foyer and utilisateur_id = auth.uid());
$$;

create function public.est_parent(p_foyer bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.foyer_membre where foyer_id = p_foyer and utilisateur_id = auth.uid() and parent);
$$;

drop policy "mon foyer, lecture" on public.foyer;
drop policy "mon foyer, réglages par un parent" on public.foyer;
drop policy "membres de mon foyer" on public.foyer_membre;
drop policy "changer mon prénom" on public.foyer_membre;
drop policy "encourager un membre" on public.encouragement;

create policy "mes groupes, lecture" on public.foyer
  for select to authenticated using ((select public.est_membre(id)));
create policy "mes groupes, réglages par un parent" on public.foyer
  for update to authenticated using ((select public.est_parent(id))) with check ((select public.est_parent(id)));

create policy "membres de mes groupes" on public.foyer_membre
  for select to authenticated using ((select public.est_membre(foyer_id)));
create policy "changer mon prénom" on public.foyer_membre
  for update to authenticated
  using (utilisateur_id = (select auth.uid())) with check (utilisateur_id = (select auth.uid()));

create policy "encourager un membre" on public.encouragement
  for insert to authenticated
  with check (
    de = (select auth.uid()) and a <> (select auth.uid()) and (select public.est_membre(foyer_id))
    and exists (select 1 from public.foyer_membre m where m.foyer_id = encouragement.foyer_id and m.utilisateur_id = encouragement.a)
  );

drop function public.suis_parent();

-- Compatibilité avec l'app 1.2.0 (un seul groupe) : son premier groupe
create or replace function public.mon_foyer()
returns bigint language sql stable security definer set search_path = '' as $$
  select foyer_id from public.foyer_membre where utilisateur_id = auth.uid() order by depuis limit 1;
$$;

-- Au plus 10 groupes par personne
create or replace function public.creer_foyer(p_nom text, p_prenom text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_code text;
  v_id bigint;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if (select count(*) from public.foyer_membre where utilisateur_id = auth.uid()) >= 10 then
    raise exception 'Tu es déjà dans 10 groupes, quittes-en un d''abord.' using errcode = '22023';
  end if;
  loop
    v_code := lpad(floor(random() * 1000000)::int::text, 6, '0');
    exit when not exists (select 1 from public.foyer where code = v_code);
  end loop;
  insert into public.foyer (nom, code) values (trim(p_nom), v_code) returning id into v_id;
  insert into public.foyer_membre (foyer_id, utilisateur_id, prenom, parent) values (v_id, auth.uid(), trim(p_prenom), true);
  return v_code;
end $$;

create or replace function public.rejoindre_foyer(p_code text, p_prenom text, p_parent boolean default false)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_id bigint;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  select id into v_id from public.foyer where code = regexp_replace(p_code, '\D', '', 'g');
  if not found then
    raise exception 'Aucun groupe avec ce code. Vérifie les 6 chiffres.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.foyer_membre where foyer_id = v_id and utilisateur_id = auth.uid()) then
    raise exception 'Tu fais déjà partie de ce groupe.' using errcode = '22023';
  end if;
  if (select count(*) from public.foyer_membre where utilisateur_id = auth.uid()) >= 10 then
    raise exception 'Tu es déjà dans 10 groupes, quittes-en un d''abord.' using errcode = '22023';
  end if;
  insert into public.foyer_membre (foyer_id, utilisateur_id, prenom, parent) values (v_id, auth.uid(), trim(p_prenom), p_parent);
  return v_id;
end $$;

-- La semaine d'un groupe dont on est membre : pour chaque membre, ses coches et objectifs tenus.
create function public.foyer_semaine(p_foyer bigint, p_lundi date)
returns table (utilisateur_id uuid, prenom text, parent boolean, moi boolean, coches integer, objectifs integer, tenus integer)
language sql stable security definer set search_path = '' as $$
  select m.utilisateur_id, m.prenom, m.parent, m.utilisateur_id = auth.uid(),
         coalesce(sum(s.n), 0)::int,
         count(s.objectif_id)::int,
         count(*) filter (where s.n >= s.cible)::int
    from public.foyer_membre m
    left join lateral (
      select o.id as objectif_id, case when o.type_frequence = 'QUOTIDIEN' then 7 else o.cible end as cible,
             (select count(*) from public.validation v where v.objectif_id = o.id and v.jour between p_lundi and p_lundi + 6) as n
        from public.objectif o
       where o.utilisateur_id = m.utilisateur_id and not o.archive
    ) s on true
   where m.foyer_id = p_foyer and public.est_membre(p_foyer)
   group by m.utilisateur_id, m.prenom, m.parent, m.depuis
   order by m.depuis;
$$;

-- Compatibilité 1.2.0
create or replace function public.foyer_semaine(p_lundi date)
returns table (utilisateur_id uuid, prenom text, parent boolean, moi boolean, coches integer, objectifs integer, tenus integer)
language sql stable security definer set search_path = '' as $$
  select * from public.foyer_semaine(public.mon_foyer(), p_lundi);
$$;

revoke execute on function public.est_membre(bigint) from public, anon;
revoke execute on function public.est_parent(bigint) from public, anon;
revoke execute on function public.foyer_semaine(bigint, date) from public, anon;
grant execute on function public.est_membre(bigint) to authenticated;
grant execute on function public.est_parent(bigint) to authenticated;
grant execute on function public.foyer_semaine(bigint, date) to authenticated;
