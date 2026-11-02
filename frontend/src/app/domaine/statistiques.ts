import type { StatMois, Statistiques, TypeSeance } from '../api/generated';
import { ecartJours, moisDe, moisDecale } from './jours';
import { ObjectifPerso } from './modele';
import { premiereDate } from './objectif';
import { somme } from './progression';

export const MOIS_AFFICHES = 6;

/** Totaux, évolution mois par mois (6 derniers mois) et types de séance les plus fréquents. */
export function statistiques(o: ObjectifPerso, aujourdhui: string): Statistiques {
  const toutes = [...o.coches].sort((a, b) => a.jour.localeCompare(b.jour));
  const minutes = (cs: typeof toutes) => cs.reduce((s, c) => s + (c.dureeMinutes ?? 0), 0);
  const semaines = Math.floor(ecartJours(premiereDate(o), aujourdhui) / 7) + 1;
  const moyenne = Math.round((toutes.length * 10) / Math.max(1, semaines)) / 10;

  const courant = moisDe(aujourdhui);
  const mois = Array.from({ length: MOIS_AFFICHES }, (_, i): StatMois => {
    const m = moisDecale(courant, i - (MOIS_AFFICHES - 1));
    const duMois = toutes.filter((c) => moisDe(c.jour) === m);
    return { mois: m, seances: duMois.length, minutes: minutes(duMois), quantite: o.mesure ? somme(duMois) : undefined };
  });

  const parType = new Map<string, number>();
  for (const c of toutes) if (c.typeSeance) parType.set(c.typeSeance, (parType.get(c.typeSeance) ?? 0) + 1);
  const types = [...parType.entries()]
    .map(([type, nombre]) => ({ type: type as TypeSeance, nombre }))
    .sort((a, b) => b.nombre - a.nombre);

  return {
    totalSeances: toutes.length,
    totalMinutes: minutes(toutes),
    totalQuantite: o.mesure ? somme(toutes) : undefined,
    mesure: o.mesure ?? 'AUCUNE',
    moyenneParSemaine: moyenne,
    mois,
    types,
  };
}
