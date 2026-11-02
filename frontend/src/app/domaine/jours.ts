/**
 * Calculs de dates du domaine, sur des chaînes « AAAA-MM-JJ » (jour local du téléphone).
 * On passe par UTC pour ne jamais être gêné par les changements d'heure.
 */
const JOUR_MS = 24 * 3600 * 1000;

function versMs(jour: string): number {
  const [a, m, j] = jour.split('-').map(Number);
  return Date.UTC(a, m - 1, j);
}

function depuisMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function ajouterJours(jour: string, n: number): string {
  return depuisMs(versMs(jour) + n * JOUR_MS);
}

/** Nombre de jours de a à b (b - a). */
export function ecartJours(a: string, b: string): number {
  return Math.round((versMs(b) - versMs(a)) / JOUR_MS);
}

/** Lundi de la semaine du jour (les semaines vont du lundi au dimanche). */
export function lundiDe(jour: string): string {
  const jourSemaine = (new Date(versMs(jour)).getUTCDay() + 6) % 7; // lundi = 0
  return ajouterJours(jour, -jourSemaine);
}

export function dimancheDe(jour: string): string {
  return ajouterJours(lundiDe(jour), 6);
}

export function estDimanche(jour: string): boolean {
  return new Date(versMs(jour)).getUTCDay() === 0;
}

export function moisDe(jour: string): string {
  return jour.slice(0, 7);
}

export function moisDecale(mois: string, delta: number): string {
  const [a, m] = mois.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function max(a: string, b: string): string {
  return a > b ? a : b;
}

/** « 18:00 » moins des minutes, en restant dans la journée (23:00 - 30 → 22:30, 00:10 - 30 → 23:40). */
export function retirerMinutes(heure: string, minutes: number): string {
  const [h, m] = heure.split(':').map(Number);
  const total = (((h * 60 + m - minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
