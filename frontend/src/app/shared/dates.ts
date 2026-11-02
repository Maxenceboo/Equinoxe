/** Date locale du téléphone au format AAAA-MM-JJ. */
export function aujourdhui(): string {
  return formatDate(new Date());
}

export function formatDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Cases d'un mois pour un calendrier commençant le lundi (null = case vide). */
export function joursDuMois(mois: string): (string | null)[] {
  const [annee, m] = mois.split('-').map(Number);
  const premier = new Date(annee, m - 1, 1);
  const nbJours = new Date(annee, m, 0).getDate();
  const decalage = (premier.getDay() + 6) % 7; // lundi = 0
  const cases: (string | null)[] = Array(decalage).fill(null);
  for (let j = 1; j <= nbJours; j++) cases.push(formatDate(new Date(annee, m - 1, j)));
  return cases;
}

export function moisDecale(mois: string, delta: number): string {
  const [annee, m] = mois.split('-').map(Number);
  const d = new Date(annee, m - 1 + delta, 1);
  return formatDate(d).slice(0, 7);
}

export function nomDuMois(mois: string): string {
  const [annee, m] = mois.split('-').map(Number);
  const nom = new Date(annee, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return nom.charAt(0).toUpperCase() + nom.slice(1);
}

/** « 2 – 8 novembre » ou « 27 oct. – 2 nov. » pour la semaine (lundi-dimanche) de la date. */
export function libelleSemaine(d: Date): string {
  const lundi = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  const dimanche = new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + 6);
  if (lundi.getMonth() === dimanche.getMonth()) {
    return `${lundi.getDate()} – ${dimanche.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
  }
  const court = { day: 'numeric', month: 'short' } as const;
  return `${lundi.toLocaleDateString('fr-FR', court)} – ${dimanche.toLocaleDateString('fr-FR', court)}`;
}
