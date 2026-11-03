import { HttpErrorResponse } from '@angular/common/http';

/** Messages lisibles pour les erreurs connues de Supabase (auth, base, fonctions du binôme). */
const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email ou mot de passe incorrect.',
  user_already_exists: 'Cet email a déjà un compte. Connecte-toi.',
  email_exists: 'Cet email a déjà un compte. Connecte-toi.',
  weak_password: 'Mot de passe trop faible.',
  email_not_confirmed: 'Confirme ton email (lien reçu par mail), puis connecte-toi.',
  over_request_rate_limit: 'Trop de tentatives, réessaie dans quelques minutes.',
  PGRST116: 'Objectif introuvable.',
  anonymous_provider_disabled: "L'entrée par code n'est pas encore activée. Demande à un parent de créer un compte avec email.",
};

/**
 * Convertit une erreur Supabase en HttpErrorResponse, comme le faisait l'ancien client HTTP :
 * statut 0 = pas de réseau (mode hors ligne), 401 = session expirée, 404 = introuvable, 400 sinon.
 */
export function versErreurHttp(e: unknown): HttpErrorResponse {
  if (e instanceof HttpErrorResponse) return e;
  const err = (e ?? {}) as { message?: string; code?: string; status?: number; name?: string };
  const message = err.message ?? '';
  if (e instanceof TypeError || /fetch|network|Load failed|NetworkError/i.test(message) || err.name === 'AuthRetryableFetchError') {
    return new HttpErrorResponse({ status: 0, statusText: 'Hors ligne' });
  }
  const code = err.code ?? '';
  let status = 400;
  if (code === 'PGRST301' || code === 'PGRST303' || /JWT/i.test(message) || err.status === 401) status = 401;
  else if (code === 'PGRST116' || code === 'P0002') status = 404;
  const lisible = MESSAGES[code] ?? (/^[A-ZÀ-Ü]/.test(message) && /[éèàç' ]/.test(message) ? message : 'Une erreur est survenue.');
  return new HttpErrorResponse({ status, error: { code, message: lisible } });
}
