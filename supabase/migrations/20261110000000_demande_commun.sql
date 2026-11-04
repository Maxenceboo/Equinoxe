-- « Le faire avec Léa » envoie une demande : Léa accepte (ou non) avant que la flamme commune démarre.

alter table public.commun add column demande boolean not null default false;

-- Demande à faire à deux l'objectif visible d'un ami (rien n'est créé tant qu'il n'a pas accepté).
create or replace function public.rejoindre_objectif_ami(p_objectif bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_o public.objectif;
  v_id bigint;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  select * into v_o from public.objectif where id = p_objectif and visible_amis and not archive;
  if not found or not exists (
    select 1 from public.amitie where a = least(auth.uid(), v_o.utilisateur_id) and b = greatest(auth.uid(), v_o.utilisateur_id)
  ) then
    raise exception 'Objectif introuvable' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.commun where p_objectif in (objectif_createur, objectif_invite)) then
    raise exception 'Cet objectif est déjà fait à deux, ou une demande est en attente.' using errcode = '22023';
  end if;
  insert into public.commun (cree_par, invite, objectif_createur, demande)
  values (v_o.utilisateur_id, auth.uid(), p_objectif, true)
  returning id into v_id;
  return v_id;
end $$;

-- Accepter : l'invité accepte une invitation, ou le propriétaire accepte une demande.
-- Dans les deux cas, l'objectif de l'invité est créé avec les mêmes réglages.
create or replace function public.accepter_commun(p_id bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_c public.commun;
  v_o public.objectif;
  v_nouveau bigint;
begin
  select * into v_c from public.commun
   where id = p_id and objectif_invite is null
     and ((not demande and invite = auth.uid()) or (demande and cree_par = auth.uid()));
  if not found then raise exception 'Invitation introuvable' using errcode = 'P0002'; end if;
  select * into v_o from public.objectif where id = v_c.objectif_createur;
  insert into public.objectif (utilisateur_id, nom, categorie, type_frequence, cible, heure, couleur, mesure, objectif_quantite, date_creation, visible_amis)
  values (v_c.invite, v_o.nom, v_o.categorie, v_o.type_frequence, v_o.cible, v_o.heure, v_o.couleur, v_o.mesure, v_o.objectif_quantite, current_date, true)
  returning id into v_nouveau;
  update public.commun set objectif_invite = v_nouveau, depuis = current_date where id = p_id;
  -- Renvoie mon objectif : le nouveau si j'étais l'invité, le mien d'origine si j'acceptais une demande
  return case when v_c.demande then v_c.objectif_createur else v_nouveau end;
end $$;

-- RECUE = c'est à moi de répondre ; ENVOYEE = j'attends la réponse de l'autre.
drop function public.mes_communs();
create function public.mes_communs()
returns table (
  id bigint, statut text, demande boolean, ami_id uuid, ami text, mon_objectif bigint, nom text, categorie text,
  type_frequence text, cible integer, heure text, depuis date, mes_jours date[], jours_ami date[]
)
language sql stable security definer set search_path = '' as $$
  select c.id,
         case when c.objectif_invite is not null then 'ACTIF'
              when (c.cree_par = auth.uid()) = c.demande then 'RECUE' else 'ENVOYEE' end,
         c.demande,
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

revoke execute on function public.mes_communs() from public, anon;
grant execute on function public.mes_communs() to authenticated;
