-- Objectifs communs : le nom et la fréquence restent identiques des deux côtés,
-- et on peut rejoindre directement un objectif visible d'un ami.

-- Quand l'un change le nom, la fréquence ou la cible, l'objectif de l'autre suit.
create function public.synchroniser_commun()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_autre bigint;
begin
  if pg_trigger_depth() > 1 then return new; end if; -- la mise à jour de l'autre ne repart pas en boucle
  if new.nom is not distinct from old.nom and new.type_frequence is not distinct from old.type_frequence
     and new.cible is not distinct from old.cible then
    return new;
  end if;
  select case when c.objectif_createur = new.id then c.objectif_invite else c.objectif_createur end
    into v_autre
    from public.commun c
   where c.objectif_invite is not null and new.id in (c.objectif_createur, c.objectif_invite);
  if v_autre is not null then
    update public.objectif
       set nom = new.nom, type_frequence = new.type_frequence, cible = new.cible,
           cible_depuis = case when cible <> new.cible or type_frequence <> new.type_frequence then current_date else cible_depuis end
     where id = v_autre;
  end if;
  return new;
end $$;

create trigger objectif_commun_synchro
  after update of nom, type_frequence, cible on public.objectif
  for each row execute function public.synchroniser_commun();

-- Rejoindre un objectif visible d'un ami : mon objectif est créé avec les mêmes réglages,
-- et on le fait à deux tout de suite (l'ami peut arrêter quand il veut).
create function public.rejoindre_objectif_ami(p_objectif bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_o public.objectif;
  v_mien bigint;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  select * into v_o from public.objectif where id = p_objectif and visible_amis and not archive;
  if not found or not exists (
    select 1 from public.amitie where a = least(auth.uid(), v_o.utilisateur_id) and b = greatest(auth.uid(), v_o.utilisateur_id)
  ) then
    raise exception 'Objectif introuvable' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.commun where p_objectif in (objectif_createur, objectif_invite)) then
    raise exception 'Cet objectif est déjà fait à deux.' using errcode = '22023';
  end if;
  insert into public.objectif (utilisateur_id, nom, categorie, type_frequence, cible, heure, couleur, mesure, objectif_quantite, date_creation, visible_amis)
  values (auth.uid(), v_o.nom, v_o.categorie, v_o.type_frequence, v_o.cible, v_o.heure, v_o.couleur, v_o.mesure, v_o.objectif_quantite, current_date, true)
  returning id into v_mien;
  insert into public.commun (cree_par, invite, objectif_createur, objectif_invite, depuis)
  values (v_o.utilisateur_id, auth.uid(), p_objectif, v_mien, current_date);
  return v_mien;
end $$;

-- Pour savoir quels objectifs d'amis sont déjà faits à deux (le type de retour change : on la recrée)
drop function public.objectifs_amis();
create function public.objectifs_amis()
returns table (
  objectif_id bigint, ami_id uuid, nom text, categorie text, type_frequence text, cible integer,
  date_creation date, jours date[], en_commun boolean
)
language sql stable security definer set search_path = '' as $$
  select o.id, o.utilisateur_id, o.nom, o.categorie, o.type_frequence, o.cible, o.date_creation,
         coalesce((select array_agg(v.jour order by v.jour) from public.validation v where v.objectif_id = o.id), '{}'),
         exists (select 1 from public.commun c where o.id in (c.objectif_createur, c.objectif_invite))
    from public.amitie am
    join public.objectif o
      on o.utilisateur_id = case when am.a = auth.uid() then am.b else am.a end
     and o.visible_amis and not o.archive
   where auth.uid() in (am.a, am.b)
   order by o.utilisateur_id, o.id;
$$;

revoke execute on function public.rejoindre_objectif_ami(bigint) from public, anon;
grant execute on function public.rejoindre_objectif_ami(bigint) to authenticated;
revoke execute on function public.objectifs_amis() from public, anon;
grant execute on function public.objectifs_amis() to authenticated;
