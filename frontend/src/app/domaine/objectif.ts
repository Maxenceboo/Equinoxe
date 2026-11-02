import { ajouterJours, retirerMinutes } from './jours';
import { Coche, DetailsCoche, Maintenant, ObjectifPerso } from './modele';

export const COCHES_POUR_HEURE_HABITUELLE = 5;
const COCHES_PRISES_EN_COMPTE = 10;

export function estFaitLe(o: ObjectifPerso, jour: string): boolean {
  return o.coches.some((c) => c.jour === jour);
}

/** Coches de la semaine qui commence au lundi donné, dans l'ordre. */
export function cochesDeLaSemaine(o: ObjectifPerso, lundi: string): Coche[] {
  const dimanche = ajouterJours(lundi, 6);
  return o.coches.filter((c) => c.jour >= lundi && c.jour <= dimanche).sort((a, b) => a.jour.localeCompare(b.jour));
}

/** Premier jour suivi : la création, ou une coche antérieure ajoutée après coup. */
export function premiereDate(o: ObjectifPerso): string {
  return o.coches.reduce((min, c) => (c.jour < min ? c.jour : min), o.dateCreation);
}

const SANS_DETAILS = ['typeSeance', 'dureeMinutes', 'ressenti', 'ponctualite', 'reveil'] as const;

function aDesDetails(d: DetailsCoche | undefined): boolean {
  return !!d && SANS_DETAILS.some((k) => d[k] != null);
}

/**
 * Coche à enregistrer pour un jour. Si le jour est déjà coché, ce qui n'est pas renseigné garde sa valeur
 * (ajouter des détails n'efface pas la quantité, et inversement). L'heure n'est notée que pour une coche
 * faite le jour même, et ne change plus ensuite.
 */
export function coche(
  o: ObjectifPerso,
  jour: string,
  details: DetailsCoche | undefined,
  quantite: number | null | undefined,
  maintenant: Maintenant,
): Coche {
  if (jour > maintenant.jour) throw new Error('On ne peut pas cocher un jour futur');
  if (quantite != null && (quantite < 0 || quantite > 100_000)) throw new Error('Quantité invalide');
  const existante = o.coches.find((c) => c.jour === jour);
  const base: DetailsCoche = aDesDetails(details) ? details! : (existante ?? {});
  return {
    jour,
    typeSeance: base.typeSeance ?? null,
    dureeMinutes: base.dureeMinutes ?? null,
    ressenti: base.ressenti ?? null,
    ponctualite: base.ponctualite ?? null,
    reveil: base.reveil ?? null,
    heure: existante?.heure ?? (jour === maintenant.jour ? maintenant.heure : null),
    quantite: quantite ?? existante?.quantite ?? null,
  };
}

/**
 * Heure à laquelle l'objectif est d'habitude coché : médiane des dernières coches faites le jour même,
 * arrondie aux 5 minutes. null tant qu'il n'y a pas assez de coches.
 */
export function heureHabituelle(o: ObjectifPerso): string | null {
  const heures = o.coches
    .filter((c) => c.heure)
    .sort((a, b) => b.jour.localeCompare(a.jour))
    .slice(0, COCHES_PRISES_EN_COMPTE)
    .map((c) => c.heure!.slice(0, 5))
    .sort();
  if (heures.length < COCHES_POUR_HEURE_HABITUELLE) return null;
  const [h, m] = heures[Math.floor(heures.length / 2)].split(':');
  return `${h}:${String(Math.floor(Number(m) / 5) * 5).padStart(2, '0')}`;
}

/**
 * Heure du rappel : 30 min avant le coucher visé pour le sommeil ; 30 min avant l'heure habituelle si le
 * rappel automatique est choisi et qu'elle est connue ; l'heure choisie sinon.
 */
export function heureRappel(o: ObjectifPerso): string {
  if (o.categorie === 'SOMMEIL') return retirerMinutes(o.heure, 30);
  if (o.rappelAuto) {
    const habituelle = heureHabituelle(o);
    if (habituelle) return retirerMinutes(habituelle, 30);
  }
  return o.heure.slice(0, 5);
}
