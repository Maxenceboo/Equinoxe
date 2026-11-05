import type { ProgressionSemaine, UniteSerie } from '../api/generated';
import { ajouterJours, dimancheDe, ecartJours, lundiDe, moisDe } from './jours';
import { Coche, ObjectifPerso } from './modele';
import { cochesDeLaSemaine, estFaitLe, premiereDate } from './objectif';

/** Nombre de jokers par mois et par objectif : un jour (ou une semaine) raté qui ne casse pas la série. */
export const JOKERS_PAR_MOIS = 1;
/** Une longue série mérite une protection de plus : +1 joker par mois à partir de ce palier. */
export const PALIER_JOKER_BONUS = { JOURS: 28, SEMAINES: 4 } as const;

/** Jokers utilisés : par mois, combien, et le dernier jour (ou lundi) sauvé. */
interface Jokers {
  parMois: Map<string, number>;
  /** Jokers en plus achetés avec des points, par mois. */
  achetes: Map<string, number>;
  dernier?: string;
}

function nouveauxJokers(o: ObjectifPerso): Jokers {
  const achetes = new Map<string, number>();
  for (const mois of o.jokersAchetes ?? []) achetes.set(mois, (achetes.get(mois) ?? 0) + 1);
  return { parMois: new Map(), achetes };
}

function jokersParMois(serieEnCours: number, unite: UniteSerie, jokers: Jokers, mois: string): number {
  return JOKERS_PAR_MOIS + (serieEnCours >= PALIER_JOKER_BONUS[unite] ? 1 : 0) + (jokers.achetes.get(mois) ?? 0);
}

export interface Serie {
  enCours: number;
  record: number;
  unite: UniteSerie;
  jokersRestants: number;
  /** Dernier jour (ou lundi) sauvé par un joker, s'il y en a un. */
  jokerUtilise?: string;
}

export interface HistoriqueMois {
  mois: string;
  coches: Coche[];
  serieSemaines: number;
  meilleureSerie: number;
  semainesReussies: number;
  semainesTotales: number;
  tauxReussite: number;
}

export function somme(coches: Coche[]): number {
  return coches.reduce((s, c) => s + (c.quantite ?? 0), 0);
}

/** Semaine en cours : coches, jours restants, message neutre et flamme. */
export function progression(o: ObjectifPerso, aujourdhui: string): ProgressionSemaine {
  const lundi = lundiDe(aujourdhui);
  const faites = cochesDeLaSemaine(o, lundi);
  const realisees = faites.length;
  const cible = o.cible;
  const joursRestants = ecartJours(aujourdhui, dimancheDe(aujourdhui)) + 1;
  const faitAujourdhui = estFaitLe(o, aujourdhui);
  const s = serie(o, aujourdhui);
  return {
    debutSemaine: lundi,
    realisees,
    cible,
    atteint: realisees >= cible,
    joursRestants,
    faitAujourdhui,
    message: message(realisees, cible, joursRestants, faitAujourdhui),
    serie: s.enCours,
    meilleureSerie: s.record,
    uniteSerie: s.unite,
    jokersRestants: s.jokersRestants,
    jokerUtilise: s.jokerUtilise && ecartJours(s.jokerUtilise, aujourdhui) <= 14 ? s.jokerUtilise : undefined,
    quantiteSemaine: o.mesure ? somme(faites) : undefined,
  };
}

function message(realisees: number, cible: number, joursRestants: number, faitAujourdhui: boolean): string {
  if (realisees >= cible) return 'Objectif de la semaine atteint, bravo !';
  const restantes = cible - realisees;
  const joursDisponibles = faitAujourdhui ? joursRestants - 1 : joursRestants;
  if (restantes > joursDisponibles) return 'Raté pour cette semaine, on repart lundi.';
  return `Encore ${restantes} cette semaine, il reste ${joursRestants} ${joursRestants > 1 ? 'jours.' : 'jour.'}`;
}

/** Un joker ne sert que s'il y a une série à protéger, dans la limite du mois. */
function utiliserJoker(serieEnCours: number, unite: UniteSerie, jour: string, jokers: Jokers): boolean {
  if (serieEnCours === 0) return false;
  const mois = moisDe(jour);
  const utilises = jokers.parMois.get(mois) ?? 0;
  if (utilises >= jokersParMois(serieEnCours, unite, jokers, mois)) return false;
  jokers.parMois.set(mois, utilises + 1);
  jokers.dernier = jour;
  return true;
}

function jokersRestants(jokers: Jokers, serieEnCours: number, unite: UniteSerie, aujourdhui: string): number {
  const mois = moisDe(aujourdhui);
  return Math.max(0, jokersParMois(serieEnCours, unite, jokers, mois) - (jokers.parMois.get(mois) ?? 0));
}

/**
 * Série en cours : jours d'affilée pour un objectif quotidien, semaines réussies d'affilée sinon.
 * Une journée (ou semaine) en cours pas encore faite ne casse pas la série. Le joker du mois couvre un raté.
 */
export function serie(o: ObjectifPerso, aujourdhui: string): Serie {
  const jokers = nouveauxJokers(o);
  if (o.typeFrequence === 'QUOTIDIEN') {
    const faits = new Set(o.coches.map((c) => c.jour));
    let enCours = 0;
    let record = 0;
    for (let d = premiereDate(o); d <= aujourdhui; d = ajouterJours(d, 1)) {
      if (faits.has(d)) {
        enCours++;
        record = Math.max(record, enCours);
      } else if (d !== aujourdhui && !utiliserJoker(enCours, 'JOURS', d, jokers)) {
        enCours = 0;
      }
    }
    return { enCours, record, unite: 'JOURS', jokersRestants: jokersRestants(jokers, enCours, 'JOURS', aujourdhui), jokerUtilise: jokers.dernier };
  }
  const h = calculerHistorique(o, moisDe(aujourdhui), aujourdhui, jokers);
  return {
    enCours: h.serieSemaines,
    record: h.meilleureSerie,
    unite: 'SEMAINES',
    jokersRestants: jokersRestants(jokers, h.serieSemaines, 'SEMAINES', aujourdhui),
    jokerUtilise: jokers.dernier,
  };
}

/** Coches d'un mois, série de semaines, record et taux de semaines réussies depuis le début. */
export function historique(o: ObjectifPerso, mois: string, aujourdhui: string): HistoriqueMois {
  return calculerHistorique(o, mois, aujourdhui, nouveauxJokers(o));
}

function calculerHistorique(o: ObjectifPerso, mois: string, aujourdhui: string, jokers: Jokers): HistoriqueMois {
  const duMois = o.coches.filter((c) => moisDe(c.jour) === mois).sort((a, b) => a.jour.localeCompare(b.jour));
  const courante = lundiDe(aujourdhui);
  let reussies = 0;
  let totales = 0;
  let serieEnCours = 0;
  let meilleure = 0;
  for (let lundi = lundiDe(premiereDate(o)); lundi <= courante; lundi = ajouterJours(lundi, 7)) {
    const reussie = cochesDeLaSemaine(o, lundi).length >= o.cible;
    if (reussie) {
      reussies++;
      totales++;
      serieEnCours++;
      meilleure = Math.max(meilleure, serieEnCours);
    } else if (lundi !== courante) {
      // Une semaine en cours pas encore réussie ne casse pas la série ; une semaine ratée peut être
      // protégée par le joker du mois.
      totales++;
      if (!utiliserJoker(serieEnCours, 'SEMAINES', lundi, jokers)) serieEnCours = 0;
    }
  }
  return {
    mois,
    coches: duMois,
    serieSemaines: serieEnCours,
    meilleureSerie: meilleure,
    semainesReussies: reussies,
    semainesTotales: totales,
    tauxReussite: totales === 0 ? 0 : reussies / totales,
  };
}
