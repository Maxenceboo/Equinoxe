-- 1) Quitter un objectif à deux : celui qui avait rejoint l'objectif de son ami ne le garde pas.
--    Sa copie disparaît (avec ses coches) ; le créateur garde le sien et continue seul.
create or replace function public.quitter_commun(p_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_c public.commun;
begin
  select * into v_c from public.commun where id = p_id and auth.uid() in (cree_par, invite);
  if not found then return; end if;
  delete from public.commun where id = p_id;
  if v_c.invite = auth.uid() and v_c.objectif_invite is not null then
    delete from public.objectif where id = v_c.objectif_invite and utilisateur_id = auth.uid();
  end if;
end $$;

-- 2) Objectifs chiffrés plus simples : un nombre, ou du temps (minutes)
update public.objectif set mesure = 'NOMBRE' where mesure in ('KM', 'PAGES');
alter table public.objectif drop constraint objectif_mesure_check;
alter table public.objectif add constraint objectif_mesure_check check (mesure in ('NOMBRE', 'MINUTES'));

-- 3) Photo de profil : fichier dans le stockage « photos », dans un dossier à son nom
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "photos : j'ajoute la mienne" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos : je remplace la mienne" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos : je supprime la mienne" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create table public.photo_profil (
  utilisateur_id uuid primary key references auth.users (id) on delete cascade,
  chemin         text not null check (chemin ~ '^[0-9a-f-]{36}/[A-Za-z0-9_.-]{1,60}$'),
  maj            timestamptz not null default now()
);
alter table public.photo_profil enable row level security;

-- Enregistrer (ou retirer, avec null) sa photo
create function public.choisir_photo(p_chemin text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if p_chemin is null then
    delete from public.photo_profil where utilisateur_id = auth.uid();
    return;
  end if;
  if split_part(p_chemin, '/', 1) <> auth.uid()::text then
    raise exception 'Photo invalide' using errcode = '22023';
  end if;
  insert into public.photo_profil (utilisateur_id, chemin) values (auth.uid(), p_chemin)
  on conflict (utilisateur_id) do update set chemin = excluded.chemin, maj = now();
end $$;

-- Photos visibles : la mienne, celles de mes amis et des membres de mes groupes
create function public.photos()
returns table (utilisateur_id uuid, chemin text)
language sql stable security definer set search_path = '' as $$
  select p.utilisateur_id, p.chemin
    from public.photo_profil p
   where p.utilisateur_id = auth.uid()
      or exists (select 1 from public.amitie am where auth.uid() in (am.a, am.b) and p.utilisateur_id in (am.a, am.b))
      or exists (select 1 from public.foyer_membre moi
                   join public.foyer_membre lui on lui.foyer_id = moi.foyer_id
                  where moi.utilisateur_id = auth.uid() and lui.utilisateur_id = p.utilisateur_id);
$$;

revoke execute on function public.choisir_photo(text) from public, anon;
revoke execute on function public.photos() from public, anon;
grant execute on function public.choisir_photo(text) to authenticated;
grant execute on function public.photos() to authenticated;

-- 4) Objectifs à deux : on sait si c'est moi qui ai rejoint (quitter le fait alors disparaître)
drop function public.mes_communs();
create function public.mes_communs()
returns table (
  id bigint, statut text, demande boolean, ami_id uuid, ami text, mon_objectif bigint, nom text, categorie text,
  type_frequence text, cible integer, heure text, depuis date, mes_jours date[], jours_ami date[], a_rejoint boolean
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
                    where v.objectif_id = case when c.cree_par = auth.uid() then c.objectif_invite else c.objectif_createur end), '{}'),
         c.invite = auth.uid()
    from public.commun c
    join public.objectif o on o.id = c.objectif_createur
    cross join lateral (select case when c.cree_par = auth.uid() then c.invite else c.cree_par end as ami) x
   where auth.uid() in (c.cree_par, c.invite)
   order by c.cree_le;
$$;
revoke execute on function public.mes_communs() from public, anon;
grant execute on function public.mes_communs() to authenticated;
