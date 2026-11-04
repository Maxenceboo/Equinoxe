import { ajouterJours, lundiDe } from './jours';

/** Un objectif fait à deux : mes jours cochés et ceux de mon ami, depuis le jour où on s'est lancés. */
export interface ObjectifCommunPerso {
  quotidien: boolean;
  /** Fois par semaine (7 pour un objectif quotidien) */
  cible: number;
  depuis: string;
  mesJours: string[];
  joursAmi: string[];
}

export interface SerieCommune {
  /** Jours (quotidien) ou semaines réussis à deux d'affilée */
  enCours: number;
  record: number;
  unite: 'JOURS' | 'SEMAINES';
  /** Cette semaine (ou aujourd'hui pour un quotidien) : ce que chacun a fait */
  moi: number;
  ami: number;
  /** Ce qu'il faut à chacun sur la période en cours (1 pour un quotidien) */
  objectif: number;
}

function dansLaSemaine(jours: Set<string>, lundi: string): number {
  let n = 0;
  for (let i = 0; i < 7; i++) if (jours.has(ajouterJours(lundi, i))) n++;
  return n;
}

/**
 * Flamme commune : elle ne monte que si les deux l'ont fait (le jour même pour un quotidien,
 * la cible de la semaine pour les autres). Si l'un des deux rate, elle retombe à zéro pour les deux.
 * Le jour ou la semaine en cours, pas encore finis, ne cassent rien.
 */
export function serieCommune(c: ObjectifCommunPerso, aujourdhui: string): SerieCommune {
  const moi = new Set(c.mesJours.filter((j) => j >= c.depuis));
  const ami = new Set(c.joursAmi.filter((j) => j >= c.depuis));
  let enCours = 0;
  let record = 0;
  if (c.quotidien) {
    for (let d = c.depuis; d <= aujourdhui; d = ajouterJours(d, 1)) {
      if (moi.has(d) && ami.has(d)) {
        enCours++;
        record = Math.max(record, enCours);
      } else if (d !== aujourdhui) {
        enCours = 0;
      }
    }
    return { enCours, record, unite: 'JOURS', moi: moi.has(aujourdhui) ? 1 : 0, ami: ami.has(aujourdhui) ? 1 : 0, objectif: 1 };
  }
  const courante = lundiDe(aujourdhui);
  for (let lundi = lundiDe(c.depuis); lundi <= courante; lundi = ajouterJours(lundi, 7)) {
    if (dansLaSemaine(moi, lundi) >= c.cible && dansLaSemaine(ami, lundi) >= c.cible) {
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
    ami: dansLaSemaine(ami, courante),
    objectif: c.cible,
  };
}
