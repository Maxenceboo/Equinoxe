import type { Rappel } from '../api/generated';
import { ajouterJours, dimancheDe, ecartJours, lundiDe, max } from './jours';
import { Maintenant, ObjectifPerso } from './modele';
import { cochesDeLaSemaine, estFaitLe, heureRappel } from './objectif';

/**
 * Répartit les rappels sur la semaine sans jours fixes.
 *
 * Pour N séances par semaine, l'écart idéal est de 7 / N jours. Après chaque séance cochée, les rappels
 * restants sont recalculés : jours disponibles / séances restantes. Aucun rappel un jour déjà coché,
 * ni quand l'objectif de la semaine est atteint.
 */
export function rappels(o: ObjectifPerso, maintenant: Maintenant, jours: number): Rappel[] {
  if (o.archive) return [];
  const dernierJour = ajouterJours(maintenant.jour, jours - 1);
  const instant = `${maintenant.jour}T${maintenant.heure}`;
  const liste: Rappel[] = [];
  for (let lundi = lundiDe(maintenant.jour); lundi <= dernierJour; lundi = ajouterJours(lundi, 7)) {
    for (const r of rappelsDeLaSemaine(o, lundi, maintenant.jour)) {
      if (r.dateHeure.slice(0, 10) <= dernierJour && r.dateHeure > instant) liste.push(r);
    }
  }
  return liste.sort((a, b) => a.dateHeure.localeCompare(b.dateHeure));
}

/** Rappels de tous les objectifs, triés par date. */
export function tousLesRappels(objectifs: ObjectifPerso[], maintenant: Maintenant, jours: number): Rappel[] {
  return objectifs.flatMap((o) => rappels(o, maintenant, jours)).sort((a, b) => a.dateHeure.localeCompare(b.dateHeure));
}

function rappelsDeLaSemaine(o: ObjectifPerso, lundi: string, aujourdhui: string): Rappel[] {
  const jours = o.typeFrequence === 'QUOTIDIEN' ? joursQuotidiens(o, lundi, aujourdhui) : joursEspaces(o, lundi, aujourdhui);
  let restantes = o.cible - cochesDeLaSemaine(o, lundi).length;
  const heure = heureRappel(o);
  return jours.map((jour) => ({
    objectifId: o.id,
    nomObjectif: o.nom,
    dateHeure: `${jour}T${heure}`,
    message: message(o, restantes--),
  }));
}

function joursQuotidiens(o: ObjectifPerso, lundi: string, aujourdhui: string): string[] {
  const jours: string[] = [];
  for (let d = max(lundi, aujourdhui); d <= dimancheDe(lundi); d = ajouterJours(d, 1)) {
    if (!estFaitLe(o, d)) jours.push(d);
  }
  return jours;
}

function joursEspaces(o: ObjectifPerso, lundi: string, aujourdhui: string): string[] {
  const dimanche = dimancheDe(lundi);
  const faites = cochesDeLaSemaine(o, lundi);
  const restantes = o.cible - faites.length;
  if (restantes <= 0) return [];

  let premierPossible = max(lundi, aujourdhui);
  if (estFaitLe(o, premierPossible)) premierPossible = ajouterJours(premierPossible, 1);
  if (premierPossible > dimanche) return [];

  const ecartIdeal = Math.max(1, Math.floor(7 / o.cible));
  let debut = premierPossible;
  if (faites.length) debut = max(debut, ajouterJours(faites[faites.length - 1].jour, ecartIdeal));
  // Pas assez de jours pour respecter l'écart : on avance le début autant que nécessaire.
  if (ecartJours(debut, dimanche) + 1 < restantes) debut = max(premierPossible, ajouterJours(dimanche, -(restantes - 1)));
  const disponibles = ecartJours(debut, dimanche) + 1;
  if (disponibles <= 0) return [];

  const ecart = Math.max(1, Math.floor(disponibles / restantes));
  const jours: string[] = [];
  for (let d = debut; jours.length < restantes && d <= dimanche; d = ajouterJours(d, ecart)) {
    if (!estFaitLe(o, d)) jours.push(d);
  }
  return jours;
}

function message(o: ObjectifPerso, restantes: number): string {
  if (o.categorie === 'SOMMEIL') return `Coucher visé à ${o.heure.slice(0, 5)} : c'est bientôt l'heure.`;
  if (o.typeFrequence === 'QUOTIDIEN') return `Pense à ton objectif du jour : ${o.nom}.`;
  return `C'est un bon jour pour : ${o.nom} (encore ${restantes} cette semaine).`;
}
