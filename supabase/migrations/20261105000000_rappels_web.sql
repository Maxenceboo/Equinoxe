-- Rappels pour la version web (iPhone) : le téléphone ne peut pas programmer de notifications
-- lui-même, alors l'app envoie ses prochains rappels au serveur, qui les pousse à l'heure dite.
-- L'app Android, elle, continue de programmer ses notifications locales.

-- Abonnements Web Push : un par navigateur installé
create table public.abonnement_push (
  id bigint generated always as identity primary key,
  utilisateur_id uuid not null references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  cree_le timestamptz not null default now()
);

-- Rappels à envoyer, recalculés par l'app à chaque changement
create table public.rappel_push (
  id bigint generated always as identity primary key,
  utilisateur_id uuid not null references auth.users on delete cascade,
  quand timestamptz not null,
  titre text not null check (char_length(titre) <= 120),
  corps text not null check (char_length(corps) <= 300),
  route text check (char_length(route) <= 100),
  envoye_le timestamptz
);
create index rappel_push_a_envoyer on public.rappel_push (quand) where envoye_le is null;

-- Clés VAPID du serveur, créées par la fonction d'envoi au premier appel
create table public.config_push (
  cle text primary key,
  valeur jsonb not null
);

-- Personne ne lit ces tables directement : seulement les fonctions ci-dessous et le serveur
alter table public.abonnement_push enable row level security;
alter table public.rappel_push enable row level security;
alter table public.config_push enable row level security;
revoke all on public.abonnement_push, public.rappel_push, public.config_push from anon, authenticated;

-- Enregistre l'abonnement de ce navigateur pour l'utilisateur connecté
create or replace function public.enregistrer_push(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'non connecté'; end if;
  insert into abonnement_push (utilisateur_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set utilisateur_id = excluded.utilisateur_id, p256dh = excluded.p256dh, auth = excluded.auth;
  -- Au plus 10 navigateurs par personne : on garde les plus récents
  delete from abonnement_push where utilisateur_id = auth.uid() and id not in (
    select id from abonnement_push where utilisateur_id = auth.uid() order by cree_le desc limit 10);
end $$;

-- Remplace les prochains rappels de l'utilisateur connecté (60 au plus, sur 15 jours)
create or replace function public.programmer_rappels(p_rappels jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'non connecté'; end if;
  delete from rappel_push where utilisateur_id = auth.uid() and envoye_le is null;
  insert into rappel_push (utilisateur_id, quand, titre, corps, route)
  select auth.uid(), (r->>'quand')::timestamptz, left(r->>'titre', 120), left(r->>'corps', 300), left(r->>'route', 100)
  from jsonb_array_elements(p_rappels) with ordinality as t(r, n)
  where n <= 60
    and (r->>'quand')::timestamptz between now() - interval '5 minutes' and now() + interval '15 days';
  -- On ne garde pas l'historique des rappels envoyés au-delà d'une semaine
  delete from rappel_push where utilisateur_id = auth.uid() and envoye_le < now() - interval '7 days';
end $$;

-- Déconnexion ou désactivation : ce navigateur ne reçoit plus rien
create or replace function public.oublier_push(p_endpoint text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from abonnement_push where endpoint = p_endpoint and utilisateur_id = auth.uid();
  if not exists (select 1 from abonnement_push where utilisateur_id = auth.uid()) then
    delete from rappel_push where utilisateur_id = auth.uid() and envoye_le is null;
  end if;
end $$;

revoke execute on function public.enregistrer_push(text, text, text), public.programmer_rappels(jsonb), public.oublier_push(text) from public, anon;
grant execute on function public.enregistrer_push(text, text, text), public.programmer_rappels(jsonb), public.oublier_push(text) to authenticated;

-- Toutes les minutes, la fonction « rappels-push » envoie les rappels arrivés à leur heure
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule(
  'rappels-push',
  '* * * * *',
  $$ select net.http_post(
       url := 'https://rdfvwiaswbtemptfzjul.supabase.co/functions/v1/rappels-push',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{"action": "envoyer"}'::jsonb
     ) $$
);
