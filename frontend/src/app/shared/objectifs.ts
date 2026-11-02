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
    ...changements,
  };
}

export function estChiffre(mesure: Mesure | undefined | null): mesure is Exclude<Mesure, 'AUCUNE'> {
  return !!mesure && mesure !== 'AUCUNE';
}

const UNITES: Record<Mesure, string> = { AUCUNE: '', KM: 'km', PAGES: 'pages', MINUTES: 'min' };

export function unite(mesure: Mesure | undefined | null): string {
  return mesure ? UNITES[mesure] : '';
}

/** 7.5 → « 7,5 », 12 → « 12 ». */
export function nombre(n: number | undefined | null): string {
  if (n == null) return '0';
  return (Math.round(n * 10) / 10).toLocaleString('fr-FR');
}

/** « 12 / 20 km » ou « 12 km » sans total visé. */
export function quantiteSemaine(o: Pick<Objectif, 'mesure' | 'objectifQuantite' | 'progression'>): string {
  const fait = nombre(o.progression.quantiteSemaine);
  return o.objectifQuantite ? `${fait} / ${nombre(o.objectifQuantite)} ${unite(o.mesure)}` : `${fait} ${unite(o.mesure)}`;
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
