-- 1) Amis : une demande, que l'autre accepte ou refuse
create table public.demande_ami (
  de      uuid not null references auth.users (id) on delete cascade,
  a       uuid not null references auth.users (id) on delete cascade,
  cree_le timestamptz not null default now(),
  primary key (de, a),
  check (de <> a)
);
create index demande_ami_a_idx on public.demande_ami (a);
alter table public.demande_ami enable row level security;

-- Demander par identifiant (ou ancien code). Si l'autre m'avait déjà demandé, on devient amis tout de suite.
create function public.demander_ami(p_code text)
returns table (nom text, amis boolean) language plpgsql security definer set search_path = '' as $$
declare
  v_ami uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  select utilisateur_id into v_ami from public.profil_public where pseudo = lower(trim(ltrim(trim(p_code), '@')));
  if not found then
    select utilisateur_id into v_ami from public.code_ami where code = upper(trim(p_code));
  end if;
  if v_ami is null then raise exception 'Aucun compte avec cet identifiant.' using errcode = 'P0002'; end if;
  if v_ami = auth.uid() then raise exception 'C''est ton propre identifiant.' using errcode = '22023'; end if;
  if exists (select 1 from public.amitie where a = least(auth.uid(), v_ami) and b = greatest(auth.uid(), v_ami)) then
    return query select public.nom_affiche(v_ami), true; return;
  end if;
  if exists (select 1 from public.demande_ami d where d.de = v_ami and d.a = auth.uid()) then
    if (select count(*) from public.amitie where auth.uid() in (a, b)) >= 100 then
      raise exception 'Tu as déjà 100 amis.' using errcode = '22023';
    end if;
    delete from public.demande_ami d where d.de = v_ami and d.a = auth.uid();
    insert into public.amitie (a, b) values (least(auth.uid(), v_ami), greatest(auth.uid(), v_ami)) on conflict do nothing;
    return query select public.nom_affiche(v_ami), true; return;
  end if;
  if (select count(*) from public.demande_ami d where d.de = auth.uid()) >= 50 then
    raise exception 'Trop de demandes en attente.' using errcode = '22023';
  end if;
  insert into public.demande_ami (de, a) values (auth.uid(), v_ami) on conflict do nothing;
  return query select public.nom_affiche(v_ami), false;
end $$;

-- Les anciennes versions de l'app appellent encore ajouter_ami : elle envoie maintenant une demande
create or replace function public.ajouter_ami(p_code text)
returns text language sql security definer set search_path = '' as $$
  select nom from public.demander_ami(p_code);
$$;

-- Demandes reçues et envoyées
create function public.mes_demandes_amis()
returns table (id uuid, nom text, recue boolean, cree_le timestamptz)
language sql stable security definer set search_path = '' as $$
  select case when d.a = auth.uid() then d.de else d.a end, public.nom_affiche(case when d.a = auth.uid() then d.de else d.a end),
         d.a = auth.uid(), d.cree_le
    from public.demande_ami d
   where auth.uid() in (d.de, d.a)
   order by d.cree_le desc;
$$;

-- Accepter (true) ou refuser (false) une demande reçue ; refuser sert aussi à annuler la sienne
create function public.repondre_ami(p_autre uuid, p_accepter boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if p_accepter then
    if not exists (select 1 from public.demande_ami where de = p_autre and a = auth.uid()) then
      raise exception 'Demande introuvable' using errcode = 'P0002';
    end if;
    if (select count(*) from public.amitie where auth.uid() in (a, b)) >= 100 then
      raise exception 'Tu as déjà 100 amis.' using errcode = '22023';
    end if;
    insert into public.amitie (a, b) values (least(auth.uid(), p_autre), greatest(auth.uid(), p_autre)) on conflict do nothing;
  end if;
  delete from public.demande_ami where (de = p_autre and a = auth.uid()) or (de = auth.uid() and a = p_autre);
end $$;

revoke execute on function public.demander_ami(text) from public, anon;
revoke execute on function public.mes_demandes_amis() from public, anon;
revoke execute on function public.repondre_ami(uuid, boolean) from public, anon;
grant execute on function public.demander_ami(text) to authenticated;
grant execute on function public.mes_demandes_amis() to authenticated;
grant execute on function public.repondre_ami(uuid, boolean) to authenticated;

-- 2) Objectif fait ensemble : seul celui qui l'a créé change le nom, la catégorie, le rythme et la quantité.
--    L'heure du rappel et la visibilité restent propres à chacun.
create function public.verrou_commun()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if pg_trigger_depth() > 1 then return new; end if;
  if (new.nom, new.categorie, new.type_frequence, new.cible, new.mesure, new.objectif_quantite)
     is not distinct from (old.nom, old.categorie, old.type_frequence, old.cible, old.mesure, old.objectif_quantite) then
    return new;
  end if;
  if exists (select 1 from public.commun_membre m join public.commun c on c.id = m.commun_id
              where m.objectif_id = new.id and c.cree_par <> new.utilisateur_id) then
    raise exception 'Seul le créateur de cet objectif commun peut le modifier.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger objectif_commun_verrou
  before update of nom, categorie, type_frequence, cible, mesure, objectif_quantite on public.objectif
  for each row execute function public.verrou_commun();

create or replace function public.synchroniser_commun()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if pg_trigger_depth() > 1 then return new; end if;
  if (new.nom, new.categorie, new.type_frequence, new.cible, new.mesure, new.objectif_quantite)
     is not distinct from (old.nom, old.categorie, old.type_frequence, old.cible, old.mesure, old.objectif_quantite) then
    return new;
  end if;
  update public.objectif o
     set nom = new.nom, categorie = new.categorie, type_frequence = new.type_frequence, cible = new.cible,
         mesure = new.mesure, objectif_quantite = new.objectif_quantite,
         cible_depuis = case when o.cible <> new.cible or o.type_frequence <> new.type_frequence then current_date else o.cible_depuis end
    from public.commun_membre m
   where m.objectif_id = o.id and o.id <> new.id
     and m.commun_id = (select commun_id from public.commun_membre where objectif_id = new.id);
  return new;
end $$;
drop trigger objectif_commun_synchro on public.objectif;
create trigger objectif_commun_synchro
  after update of nom, categorie, type_frequence, cible, mesure, objectif_quantite on public.objectif
  for each row execute function public.synchroniser_commun();
