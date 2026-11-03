/**
 * Projet Supabase utilisé par l'app (projet « Equinoxe », région Europe).
 * La clé « publishable » peut être publique : la sécurité vient des règles RLS de la base.
 *
 * Pour travailler en local (npx supabase start), remplacer par :
 *   url: 'http://127.0.0.1:54321',
 *   cle: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
 */
export const SUPABASE = {
  url: 'https://rdfvwiaswbtemptfzjul.supabase.co',
  cle: 'sb_publishable_7RK_0G4Aiaue88Y5ZzDvXQ_0Y79aZQ-',
  /** Page ouverte par le lien de l'email de confirmation : elle confirme et propose d'ouvrir l'app. */
  confirmation: 'https://equinoxe-app.fr/confirme/',
};
