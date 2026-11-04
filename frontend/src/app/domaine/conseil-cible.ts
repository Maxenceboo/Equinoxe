import type { Suggestion } from '../api/generated';
import { ajouterJours, lundiDe } from './jours';
import { ObjectifPerso } from './modele';
import { cochesDeLaSemaine, premiereDate } from './objectif';

export const SEMAINES_POUR_MONTER = 4;
export const SEMAINES_POUR_BAISSER = 3;

/**
 * Propose d'ajuster la cible d'un objectif « X fois par semaine » : +1 après 4 semaines réussies d'affilée,
 * -1 après 3 semaines ratées d'affilée. Seules les semaines terminées comptent, et seulement celles d'après
 * le dernier changement de cible. Les semaines d'avant la création de l'objectif ne comptent pas.
 */
export function suggestion(o: ObjectifPerso, aujourdhui: string): Suggestion | null {
  if (o.archive || o.typeFrequence !== 'PAR_SEMAINE') return null;
  const debut = premiereDate(o);
  const limite = o.cibleDepuis && o.cibleDepuis > debut ? o.cibleDepuis : debut;
  let reussite: boolean | null = null;
  let affilee = 0;
  for (
    let lundi = ajouterJours(lundiDe(aujourdhui), -7);
    lundi >= limite && affilee < SEMAINES_POUR_MONTER;
    lundi = ajouterJours(lundi, -7)
  ) {
    const ok = cochesDeLaSemaine(o, lundi).length >= o.cible;
    if (reussite === null) reussite = ok;
    else if (ok !== reussite) break;
    affilee++;
  }
  if (reussite === true && affilee >= SEMAINES_POUR_MONTER && o.cible < 7) {
    return {
      nouvelleCible: o.cible + 1,
      raison: `${affilee} semaines réussies d'affilée. Prêt pour ${o.cible + 1} par semaine ?`,
    };
  }
  if (reussite === false && affilee >= SEMAINES_POUR_BAISSER && o.cible > 1) {
    return {
      nouvelleCible: o.cible - 1,
      raison: `${affilee} semaines sous l'objectif. ${o.cible - 1} par semaine serait peut-être plus tenable, pour garder le rythme.`,
    };
  }
  return null;
}
