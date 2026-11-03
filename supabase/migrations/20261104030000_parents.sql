-- On rejoint toujours un groupe comme simple membre : seul un parent du groupe peut en nommer un autre.
-- Le paramètre p_parent est gardé pour les versions de l'app déjà installées, mais il est ignoré.

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
  insert into public.foyer_membre (foyer_id, utilisateur_id, prenom, parent) values (v_id, auth.uid(), trim(p_prenom), false);
  return v_id;
end $$;

-- Un parent nomme un autre membre du même groupe parent (il pourra régler la récompense).
create function public.nommer_parent(p_foyer bigint, p_membre uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.est_parent(p_foyer) then
    raise exception 'Seul un parent du groupe peut nommer un parent.' using errcode = '42501';
  end if;
  update public.foyer_membre set parent = true where foyer_id = p_foyer and utilisateur_id = p_membre;
  if not found then
    raise exception 'Cette personne ne fait pas partie du groupe.' using errcode = 'P0002';
  end if;
end $$;

revoke execute on function public.nommer_parent(bigint, uuid) from public, anon;
grant execute on function public.nommer_parent(bigint, uuid) to authenticated;
