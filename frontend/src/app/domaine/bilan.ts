import type { Bilan, LigneBilan } from '../api/generated';
import { ajouterJours, dimancheDe, lundiDe } from './jours';
import { ObjectifPerso } from './modele';
import { cochesDeLaSemaine, premiereDate } from './objectif';
import { serie, somme } from './progression';
import { suggestion } from './conseil-cible';

/** Bilan d'une semaine (celle qui contient « jour ») : objectifs tenus, coches, comparaison avec la semaine d'avant. */
export function bilan(objectifs: ObjectifPerso[], jour: string, aujourdhui: string): Bilan {
  const lundi = lundiDe(jour);
  const dimanche = dimancheDe(jour);
  const finVue = dimanche < aujourdhui ? dimanche : aujourdhui;
  const actifs = objectifs.filter((o) => !o.archive && premiereDate(o) <= dimanche);
  const lignes = actifs.map((o): LigneBilan => {
    const faites = cochesDeLaSemaine(o, lundi);
    const s = serie(o, finVue);
    return {
      objectifId: o.id,
      nom: o.nom,
      categorie: o.categorie,
      realisees: faites.length,
      cible: o.cible,
      atteint: faites.length >= o.cible,
      serie: s.enCours,
      uniteSerie: s.unite,
      mesure: o.mesure ?? 'AUCUNE',
      quantite: o.mesure ? somme(faites) : undefined,
      suggestion: suggestion(o, aujourdhui) ?? undefined,
    };
  });
  const tenus = lignes.filter((l) => l.atteint).length;
  const seances = lignes.reduce((s, l) => s + l.realisees, 0);
  const avant = actifs.reduce((s, o) => s + cochesDeLaSemaine(o, ajouterJours(lundi, -7)).length, 0);
  return {
    debutSemaine: lundi,
    lignes,
    tenus,
    total: lignes.length,
    seances,
    seancesSemainePrecedente: avant,
    phrase: phrase(tenus, lignes.length, seances, avant, dimanche > aujourdhui),
  };
}

function phrase(tenus: number, total: number, seances: number, avant: number, enCours = false): string {
  if (total === 0) return 'Aucun objectif cette semaine.';
  let base: string;
  if (enCours && tenus < total) {
    // Semaine pas finie : on encourage, on ne juge pas encore
    base = tenus === 0 ? 'Semaine en cours, tout reste possible.' : `${tenus} sur ${total} déjà tenu${tenus > 1 ? 's' : ''}, la semaine continue.`;
  } else if (tenus === total) base = total === 1 ? 'Objectif tenu cette semaine, bravo !' : 'Tous tes objectifs tenus, bravo !';
  else if (tenus === 0) base = 'Semaine plus calme. On repart lundi.';
  else base = `${tenus} objectif${tenus > 1 ? 's' : ''} sur ${total} tenu${tenus > 1 ? 's' : ''}.`;
  if (avant > 0 && seances > avant) base += " Plus actif que la semaine d'avant.";
  return base;
}
