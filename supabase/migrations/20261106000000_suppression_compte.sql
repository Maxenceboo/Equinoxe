-- Suppression du compte depuis l'app (exigée par Google Play).
-- Toutes les données de l'utilisateur sont liées à auth.users avec « on delete cascade » :
-- objectifs, coches, groupes rejoints, encouragements, achats, abonnements aux rappels.
create or replace function public.supprimer_mon_compte()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'non connecté'; end if;
  delete from auth.users where id = auth.uid();
  -- Les groupes restés sans aucun membre disparaissent aussi
  delete from public.foyer f where not exists (select 1 from public.foyer_membre m where m.foyer_id = f.id);
end $$;

revoke execute on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;
