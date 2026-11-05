import { ajouterJours, lundiDe } from './jours';

/** Un autre membre d'un objectif commun : depuis quand il le fait, et ses jours cochés. */
export interface MembreSerie {
  depuis: string;
  jours: string[];
}

/** Un objectif fait à plusieurs : mes jours cochés et ceux des autres membres actifs. */
export interface ObjectifCommunPerso {
  quotidien: boolean;
  /** Fois par semaine (7 pour un objectif quotidien) */
  cible: number;
  /** Le jour où je l'ai rejoint */
  depuis: string;
  mesJours: string[];
  autres: MembreSerie[];
}

export interface SerieCommune {
  /** Jours (quotidien) ou semaines réussis par tous d'affilée */
  enCours: number;
  record: number;
  unite: 'JOURS' | 'SEMAINES';
  /** Cette semaine (ou aujourd'hui pour un quotidien) : ce que j'ai fait, et ce qu'a fait chacun des autres */
  moi: number;
  autres: number[];
  /** Ce qu'il faut à chacun sur la période en cours (1 pour un quotidien) */
  objectif: number;
}

function dansLaSemaine(jours: Set<string>, lundi: string): number {
  let n = 0;
  for (let i = 0; i < 7; i++) if (jours.has(ajouterJours(lundi, i))) n++;
  return n;
}

/**
 * Flamme commune : elle ne monte que si tous l'ont fait (le jour même pour un quotidien, la cible de la
 * semaine pour les autres). Si l'un rate, elle retombe à zéro pour tous. Un membre n'est attendu qu'à
 * partir du jour (ou de la semaine) où il a rejoint. Le jour ou la semaine en cours ne cassent rien.
 */
export function serieCommune(c: ObjectifCommunPerso, aujourdhui: string): SerieCommune {
  const moi = new Set(c.mesJours.filter((j) => j >= c.depuis));
  const autres = c.autres.map((m) => ({ depuis: m.depuis, jours: new Set(m.jours.filter((j) => j >= m.depuis)) }));
  let enCours = 0;
  let record = 0;
  if (c.quotidien) {
    for (let d = c.depuis; d <= aujourdhui; d = ajouterJours(d, 1)) {
      if (moi.has(d) && autres.every((m) => m.depuis > d || m.jours.has(d))) {
        enCours++;
        record = Math.max(record, enCours);
      } else if (d !== aujourdhui) {
        enCours = 0;
      }
    }
    return {
      enCours,
      record,
      unite: 'JOURS',
      moi: moi.has(aujourdhui) ? 1 : 0,
      autres: autres.map((m) => (m.jours.has(aujourdhui) ? 1 : 0)),
      objectif: 1,
    };
  }
  const courante = lundiDe(aujourdhui);
  for (let lundi = lundiDe(c.depuis); lundi <= courante; lundi = ajouterJours(lundi, 7)) {
    const tous = dansLaSemaine(moi, lundi) >= c.cible
      && autres.every((m) => lundiDe(m.depuis) > lundi || dansLaSemaine(m.jours, lundi) >= c.cible);
    if (tous) {
      enCours++;
      record = Math.max(record, enCours);
    } else if (lundi !== courante) {
      enCours = 0;
    }
  }
  return {
    enCours,
    record,
    unite: 'SEMAINES',
    moi: dansLaSemaine(moi, courante),
    autres: autres.map((m) => dansLaSemaine(m.jours, courante)),
    objectif: c.cible,
  };
}
