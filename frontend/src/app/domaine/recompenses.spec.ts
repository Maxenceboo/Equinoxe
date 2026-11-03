import { describe, expect, it } from 'vitest';
import { ajouterJours as j } from './jours';
import { ObjectifPerso } from './modele';
import { progression } from './progression';
import { badges, niveau, points } from './recompenses';
import { COUT_JOKER, PALETTES, possede, solde } from './boutique';

const LUNDI = '2026-11-02';

function objectif(o: Partial<ObjectifPerso> = {}): ObjectifPerso {
  return {
    id: 1, nom: 'Sport', categorie: 'SPORT', typeFrequence: 'PAR_SEMAINE', cible: 2, heure: '18:00', couleur: '#ffffff',
    archive: false, dateCreation: LUNDI, mesure: null, objectifQuantite: null, rappelAuto: false, cibleDepuis: null,
    codePartage: null, coches: [], ...o,
  };
}
const coches = (...jours: string[]) => jours.map((jour) => ({ jour }));
const obtenu = (o: ObjectifPerso[], jour: string) =>
  badges(o, jour).filter((b) => b.obtenu).map((b) => b.code);

describe('points et niveaux', () => {
  it('10 par coche et 50 par semaine tenue', () => {
    const o = objectif({ coches: coches(LUNDI, j(LUNDI, 2), j(LUNDI, 7)) });
    expect(points([o], j(LUNDI, 8))).toBe(3 * 10 + 50);
  });

  it('les niveaux suivent les phases de la lune', () => {
    expect(niveau(0)).toMatchObject({ numero: 1, nom: 'Nouvelle lune', suivant: 100 });
    expect(niveau(120)).toMatchObject({ numero: 2, nom: 'Croissant', points: 100, suivant: 300 });
    expect(niveau(1500)).toMatchObject({ numero: 5, nom: 'Pleine lune', suivant: 2500 });
    expect(niveau(2600)).toMatchObject({ numero: 6, nom: 'Pleine lune 2', points: 2500 });
  });
});

describe('badges', () => {
  it('premier pas et semaine parfaite', () => {
    const o = objectif({ coches: coches(LUNDI, j(LUNDI, 1)) });
    expect(obtenu([o], j(LUNDI, 1))).toEqual(['PREMIER_PAS', 'SEMAINE_PARFAITE']);
    expect(obtenu([objectif()], LUNDI)).toEqual([]);
  });

  it('pas de semaine parfaite si un autre objectif manque', () => {
    const a = objectif({ coches: coches(LUNDI, j(LUNDI, 1)) });
    const b = objectif({ id: 2, nom: 'Lire', cible: 3, coches: coches(LUNDI) });
    expect(obtenu([a, b], j(LUNDI, 6))).not.toContain('SEMAINE_PARFAITE');
  });

  it('sept sur sept, retour gagnant', () => {
    const jours = Array.from({ length: 7 }, (_, i) => j(LUNDI, i));
    const o = objectif({ cible: 7, typeFrequence: 'QUOTIDIEN', coches: coches(...jours, j(LUNDI, 20)) });
    const b = obtenu([o], j(LUNDI, 20));
    expect(b).toContain('SEPT_SUR_SEPT');
    expect(b).toContain('RETOUR_GAGNANT');
  });

  it('lune pleine après 4 semaines tenues', () => {
    const jours = [0, 7, 14, 21].flatMap((d) => [j(LUNDI, d), j(LUNDI, d + 1)]);
    expect(obtenu([objectif({ coches: coches(...jours) })], j(LUNDI, 22))).toContain('LUNE_PLEINE');
  });
});

describe('jokers', () => {
  it('une longue série donne un joker de plus, et le joker utilisé est signalé', () => {
    // 4 semaines tenues, une semaine ratée (joker), puis la semaine en cours
    const jours = [0, 7, 14, 21].flatMap((d) => [j(LUNDI, d), j(LUNDI, d + 1)]);
    const o = objectif({ coches: coches(...jours) });
    expect(progression(o, j(LUNDI, 22)).jokersRestants).toBe(2);
    const p = progression(o, j(LUNDI, 35));
    expect(p.serie).toBe(4);
    expect(p.jokerUtilise).toBe(j(LUNDI, 28));
  });
});


describe('boutique', () => {
  it('retire les achats des points gagnés, sans passer sous zéro', () => {
    expect(solde(1000, { jokers: 1, palettes: ['OCEAN'] })).toBe(1000 - COUT_JOKER - 300);
    expect(solde(100, { jokers: 2, palettes: [] })).toBe(0);
  });

  it('offre la première palette', () => {
    expect(PALETTES[0].cout).toBe(0);
    expect(possede({ jokers: 0, palettes: [] }, 'AURORE')).toBe(true);
    expect(possede({ jokers: 0, palettes: [] }, 'BRAISE')).toBe(false);
  });
});
