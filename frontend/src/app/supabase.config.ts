/**
 * Projet Supabase utilisé par l'app.
 * - En local (npx supabase start) : les valeurs ci-dessous marchent telles quelles.
 * - En vrai : Supabase > ton projet > Project Settings > API Keys, puis copier l'URL du projet et la clé
 *   « publishable » (elle peut être publique : la sécurité vient des règles RLS de la base).
 */
export const SUPABASE = {
  url: 'http://127.0.0.1:54321',
  cle: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
};
