import { Mesure, Objectif, ObjectifSaisie } from '../api/generated';

/** Saisie complète à renvoyer au serveur pour modifier un objectif (par exemple sa cible). */
export function saisieDe(o: Objectif, changements: Partial<ObjectifSaisie> = {}): ObjectifSaisie {
  return {
    nom: o.nom,
    categorie: o.categorie,
    typeFrequence: o.typeFrequence,
    cible: o.cible,
    heure: o.heure,
    couleur: o.couleur,
    mesure: o.mesure ?? 'AUCUNE',
    objectifQuantite: o.objectifQuantite,
    rappelAuto: o.rappelAuto ?? false,
    visibleAmis: o.visibleAmis ?? false,
    ...changements,
  };
}

export function estChiffre(mesure: Mesure | undefined | null): mesure is Exclude<Mesure, 'AUCUNE'> {
  return !!mesure && mesure !== 'AUCUNE';
}

const UNITES: Record<Mesure, string> = { AUCUNE: '', NOMBRE: '', MINUTES: 'min' };

export function unite(mesure: Mesure | undefined | null): string {
  return mesure ? UNITES[mesure] : '';
}

/** 90 → « 1 h 30 », 45 → « 45 min ». */
export function duree(minutes: number | undefined | null): string {
  const t = Math.round(minutes ?? 0);
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/** Une quantité lisible selon la mesure : « 12 » pour un nombre, « 1 h 30 » pour du temps. */
export function valeur(n: number | undefined | null, mesure: Mesure | undefined | null): string {
  return mesure === 'MINUTES' ? duree(n) : nombre(n);
}

/** 7.5 → « 7,5 », 12 → « 12 ». */
export function nombre(n: number | undefined | null): string {
  if (n == null) return '0';
  return (Math.round(n * 10) / 10).toLocaleString('fr-FR');
}

/** « 12 / 20 » ou « 1 h 30 / 3 h » ; sans total visé, juste ce qui est fait. */
export function quantiteSemaine(o: Pick<Objectif, 'mesure' | 'objectifQuantite' | 'progression'>): string {
  const fait = valeur(o.progression.quantiteSemaine, o.mesure);
  return o.objectifQuantite ? `${fait} / ${valeur(o.objectifQuantite, o.mesure)}` : fait;
}

/** « 18:05 » → « 18 h 05 ». */
export function heureLisible(h: string | undefined | null): string {
  if (!h) return '';
  const [hh, mm] = h.split(':');
  return mm === '00' ? `${+hh} h` : `${+hh} h ${mm}`;
}

/** Une proposition de cible écartée avec « Plus tard » ne revient pas avant 2 semaines. */
const CLE_PLUS_TARD = 'objectifs.suggestions-ecartees';
const DUREE_PLUS_TARD = 14 * 24 * 3600 * 1000;

export function suggestionEcartee(o: Objectif): boolean {
  const ecartees = lireEcartees();
  const t = ecartees[`${o.id}:${o.suggestion?.nouvelleCible}`];
  return !!t && Date.now() - t < DUREE_PLUS_TARD;
}

export function ecarterSuggestion(o: Objectif): void {
  const ecartees = lireEcartees();
  ecartees[`${o.id}:${o.suggestion?.nouvelleCible}`] = Date.now();
  try {
    localStorage.setItem(CLE_PLUS_TARD, JSON.stringify(ecartees));
  } catch {
    /* stockage indisponible */
  }
}

function lireEcartees(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(CLE_PLUS_TARD) ?? '{}');
  } catch {
    return {};
  }
}
