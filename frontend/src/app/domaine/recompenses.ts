import type { Badge, Profil } from '../api/generated';
import { ajouterJours, ecartJours, lundiDe } from './jours';
import { ObjectifPerso } from './modele';
import { cochesDeLaSemaine, premiereDate } from './objectif';
import { serie } from './progression';
import { Achats, CodePalette, PALETTES, possede, solde } from './boutique';

/** Points : 10 par coche, 50 par semaine tenue (objectif atteint), toutes semaines confondues. */
export const POINTS_COCHE = 10;
export const POINTS_SEMAINE_TENUE = 50;

/** Niveaux : les phases de la lune, puis une pleine lune tous les 1 000 points. */
const NIVEAUX = [
  { nom: 'Nouvelle lune', points: 0 },
  { nom: 'Croissant', points: 100 },
  { nom: 'Premier quartier', points: 300 },
  { nom: 'Gibbeuse', points: 700 },
  { nom: 'Pleine lune', points: 1500 },
] as const;
const PAS_APRES_PLEINE_LUNE = 1000;

export interface Niveau {
  numero: number;
  nom: string;
  points: number;
  suivant: number;
}

export function niveau(points: number): Niveau {
  const dernier = NIVEAUX.length - 1;
  if (points >= NIVEAUX[dernier].points) {
    const plus = Math.floor((points - NIVEAUX[dernier].points) / PAS_APRES_PLEINE_LUNE);
    const depuis = NIVEAUX[dernier].points + plus * PAS_APRES_PLEINE_LUNE;
    return {
      numero: dernier + 1 + plus,
      nom: plus === 0 ? 'Pleine lune' : `Pleine lune ${plus + 1}`,
      points: depuis,
      suivant: depuis + PAS_APRES_PLEINE_LUNE,
    };
  }
  let i = 0;
  while (points >= NIVEAUX[i + 1].points) i++;
  return { numero: i + 1, nom: NIVEAUX[i].nom, points: NIVEAUX[i].points, suivant: NIVEAUX[i + 1].points };
}

/** Semaines terminées ou en cours, d'un lundi à l'autre. */
function lundis(depuis: string, jusqua: string): string[] {
  const l: string[] = [];
  for (let d = lundiDe(depuis); d <= jusqua; d = ajouterJours(d, 7)) l.push(d);
  return l;
}

function semaineTenue(o: ObjectifPerso, lundi: string): boolean {
  return cochesDeLaSemaine(o, lundi).length >= o.cible;
}

export function points(objectifs: ObjectifPerso[], aujourdhui: string): number {
  return objectifs.reduce((total, o) => {
    const coches = o.coches.filter((c) => c.jour <= aujourdhui).length;
    const tenues = lundis(premiereDate(o), aujourdhui).filter((l) => semaineTenue(o, l)).length;
    return total + coches * POINTS_COCHE + tenues * POINTS_SEMAINE_TENUE;
  }, 0);
}

type Obtention = string | null;

/** Jours cochés (tous objectifs), sans doublon, dans l'ordre. */
function joursCoches(objectifs: ObjectifPerso[], aujourdhui: string): string[] {
  return [...new Set(objectifs.flatMap((o) => o.coches.map((c) => c.jour)).filter((j) => j <= aujourdhui))].sort();
}

function premierPas(jours: string[]): Obtention {
  return jours[0] ?? null;
}

/** Une semaine (même en cours) où chaque objectif suivi cette semaine-là a déjà été tenu. */
function semaineParfaite(objectifs: ObjectifPerso[], aujourdhui: string): Obtention {
  const debut = objectifs.reduce((m, o) => (premiereDate(o) < m ? premiereDate(o) : m), aujourdhui);
  for (const lundi of lundis(debut, aujourdhui)) {
    const suivis = objectifs.filter((o) => lundiDe(premiereDate(o)) <= lundi);
    if (suivis.length > 0 && suivis.every((o) => semaineTenue(o, lundi))) {
      const dimanche = ajouterJours(lundi, 6);
      return dimanche <= aujourdhui ? dimanche : aujourdhui;
    }
  }
  return null;
}

/** Une longue série sur un objectif : 4 semaines tenues d'affilée, ou 28 jours. */
function lunePleine(objectifs: ObjectifPerso[], aujourdhui: string): Obtention {
  const atteint = objectifs.some((o) => {
    const s = serie(o, aujourdhui);
    return s.unite === 'SEMAINES' ? s.record >= 4 : s.record >= 28;
  });
  return atteint ? aujourdhui : null;
}

/** Au moins une coche chaque jour d'une même semaine (lundi à dimanche). */
function septSurSept(jours: string[]): Obtention {
  const faits = new Set(jours);
  for (const j of jours) {
    if (j !== lundiDe(j)) continue;
    const semaine = Array.from({ length: 7 }, (_, i) => ajouterJours(j, i));
    if (semaine.every((d) => faits.has(d))) return semaine[6];
  }
  return null;
}

/** Revenir après une pause d'au moins 7 jours sans aucune coche. */
function retourGagnant(jours: string[]): Obtention {
  for (let i = 1; i < jours.length; i++) {
    if (ecartJours(jours[i - 1], jours[i]) > 7) return jours[i];
  }
  return null;
}

/** 13 semaines d'affilée (environ 3 mois) avec au moins une coche. */
function equinoxe(jours: string[]): Obtention {
  const semaines = [...new Set(jours.map(lundiDe))].sort();
  let suite = 1;
  for (let i = 1; i < semaines.length; i++) {
    suite = ecartJours(semaines[i - 1], semaines[i]) === 7 ? suite + 1 : 1;
    if (suite >= 13) return ajouterJours(semaines[i], 6);
  }
  return null;
}

const BADGES: { code: string; nom: string; description: string; recompense: string }[] = [
  { code: 'PREMIER_PAS', nom: 'Premier pas', description: 'Faire sa première coche', recompense: '+10 points pour le Foyer' },
  { code: 'SEMAINE_PARFAITE', nom: 'Semaine parfaite', description: 'Tenir tous ses objectifs une semaine', recompense: '+50 points' },
  { code: 'LUNE_PLEINE', nom: 'Lune pleine', description: '4 semaines tenues d\'affilée (ou 28 jours) sur un objectif', recompense: '+1 joker par mois sur cet objectif' },
  { code: 'SEPT_SUR_SEPT', nom: 'Sept sur sept', description: 'Cocher quelque chose chaque jour d\'une semaine', recompense: 'Un cadre de profil' },
  { code: 'RETOUR_GAGNANT', nom: 'Retour gagnant', description: 'Reprendre après au moins 7 jours de pause', recompense: 'Le Foyer est prévenu de ton retour' },
  { code: 'EQUINOXE', nom: 'Équinoxe', description: '3 mois sans lâcher : une coche chaque semaine', recompense: 'Badge rare, fête pour tout le Foyer' },
];

export function badges(objectifs: ObjectifPerso[], aujourdhui: string): Badge[] {
  const jours = joursCoches(objectifs, aujourdhui);
  const obtentions: Record<string, Obtention> = {
    PREMIER_PAS: premierPas(jours),
    SEMAINE_PARFAITE: semaineParfaite(objectifs, aujourdhui),
    LUNE_PLEINE: lunePleine(objectifs, aujourdhui),
    SEPT_SUR_SEPT: septSurSept(jours),
    RETOUR_GAGNANT: retourGagnant(jours),
    EQUINOXE: equinoxe(jours),
  };
  return BADGES.map((b) => {
    const le = obtentions[b.code];
    return { ...b, obtenu: le !== null, le: le ?? undefined };
  });
}

export function profil(objectifs: ObjectifPerso[], aujourdhui: string, prenom?: string, achats: Achats = { jokers: 0, palettes: [] }): Profil {
  const p = points(objectifs, aujourdhui);
  const n = niveau(p);
  return {
    prenom,
    points: p,
    niveau: n.numero,
    nomNiveau: n.nom,
    pointsNiveau: n.points,
    pointsNiveauSuivant: n.suivant,
    solde: solde(p, achats),
    palettes: PALETTES.filter((pal) => possede(achats, pal.code)).map((pal): CodePalette => pal.code),
    badges: badges(objectifs, aujourdhui),
  };
}
