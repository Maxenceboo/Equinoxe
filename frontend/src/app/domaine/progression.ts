import type { ProgressionSemaine, UniteSerie } from '../api/generated';
import { ajouterJours, dimancheDe, ecartJours, lundiDe, moisDe } from './jours';
import { Coche, ObjectifPerso } from './modele';
import { cochesDeLaSemaine, estFaitLe, premiereDate } from './objectif';

/** Nombre de jokers par mois et par objectif : un jour (ou une semaine) raté qui ne casse pas la série. */
export const JOKERS_PAR_MOIS = 1;

export interface Serie {
  enCours: number;
  record: number;
  unite: UniteSerie;
  jokersRestants: number;
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
    quantiteSemaine: o.mesure ? somme(faites) : undefined,
  };
}

function message(realisees: number, cible: number, joursRestants: number, faitAujourdhui: boolean): string {
  if (realisees >= cible) return 'Objectif de la semaine atteint, bravo !';
  const restantes = cible - realisees;
  const joursDisponibles = faitAujourdhui ? joursRestants - 1 : joursRestants;
  if (restantes > joursDisponibles) return `${realisees}/${cible} cette semaine, on repart lundi.`;
  return `Encore ${restantes} cette semaine, il reste ${joursRestants} ${joursRestants > 1 ? 'jours.' : 'jour.'}`;
}

/** Un joker ne sert que s'il y a une série à protéger, et une fois par mois. */
function utiliserJoker(serieEnCours: number, mois: string, utilises: Set<string>): boolean {
  if (serieEnCours === 0 || utilises.has(mois)) return false;
  utilises.add(mois);
  return true;
}

function jokersRestants(utilises: Set<string>, aujourdhui: string): number {
  return utilises.has(moisDe(aujourdhui)) ? 0 : JOKERS_PAR_MOIS;
}

/**
 * Série en cours : jours d'affilée pour un objectif quotidien, semaines réussies d'affilée sinon.
 * Une journée (ou semaine) en cours pas encore faite ne casse pas la série. Le joker du mois couvre un raté.
 */
export function serie(o: ObjectifPerso, aujourdhui: string): Serie {
  const jokers = new Set<string>();
  if (o.typeFrequence === 'QUOTIDIEN') {
    const faits = new Set(o.coches.map((c) => c.jour));
    let enCours = 0;
    let record = 0;
    for (let d = premiereDate(o); d <= aujourdhui; d = ajouterJours(d, 1)) {
      if (faits.has(d)) {
        enCours++;
        record = Math.max(record, enCours);
      } else if (d !== aujourdhui && !utiliserJoker(enCours, moisDe(d), jokers)) {
        enCours = 0;
      }
    }
    return { enCours, record, unite: 'JOURS', jokersRestants: jokersRestants(jokers, aujourdhui) };
  }
  const h = calculerHistorique(o, moisDe(aujourdhui), aujourdhui, jokers);
  return { enCours: h.serieSemaines, record: h.meilleureSerie, unite: 'SEMAINES', jokersRestants: jokersRestants(jokers, aujourdhui) };
}

/** Coches d'un mois, série de semaines, record et taux de semaines réussies depuis le début. */
export function historique(o: ObjectifPerso, mois: string, aujourdhui: string): HistoriqueMois {
  return calculerHistorique(o, mois, aujourdhui, new Set());
}

function calculerHistorique(o: ObjectifPerso, mois: string, aujourdhui: string, jokers: Set<string>): HistoriqueMois {
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
      if (!utiliserJoker(serieEnCours, moisDe(lundi), jokers)) serieEnCours = 0;
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
