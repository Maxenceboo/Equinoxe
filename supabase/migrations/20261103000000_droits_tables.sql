-- Droits explicites sur les tables : l'app fonctionne même si Supabase n'expose pas
-- automatiquement les nouvelles tables (option recommandée à la création du projet).
-- La RLS reste le vrai garde-fou : chacun ne voit que ses lignes.
grant select, insert, update, delete on public.objectif to authenticated;
grant select, insert, update, delete on public.validation to authenticated;
grant select, delete on public.binome to authenticated;
grant usage on all sequences in schema public to authenticated;
