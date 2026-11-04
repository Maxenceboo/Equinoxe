import { describe, expect, it } from 'vitest';
import { bilan } from './bilan';
import { suggestion } from './conseil-cible';
import { ajouterJours as j } from './jours';
import { Coche, ObjectifPerso } from './modele';
import { coche, heureHabituelle, heureRappel } from './objectif';
import { historique, progression, serie } from './progression';
import { rappels } from './rappels';
import { statistiques } from './statistiques';

// Mêmes scénarios que les tests Java d'origine. Lundi 2 novembre 2026.
const LUNDI = '2026-11-02';

function objectif(o: Partial<ObjectifPerso> = {}): ObjectifPerso {
  return {
    id: 1, nom: 'Sport', categorie: 'SPORT', typeFrequence: 'PAR_SEMAINE', cible: 3, heure: '18:00', couleur: '#ffffff',
    archive: false, dateCreation: LUNDI, mesure: null, objectifQuantite: null, rappelAuto: false, cibleDepuis: null,
    codePartage: null, coches: [], ...o,
  };
}
const quotidien = (o: Partial<ObjectifPerso> = {}) =>
  objectif({ nom: 'Me coucher tôt', categorie: 'SOMMEIL', typeFrequence: 'QUOTIDIEN', cible: 7, heure: '23:00', ...o });

/** Coche un jour (comme une coche faite après coup : sans heure). */
function cocher(o: ObjectifPerso, jour: string, plus: Partial<Coche> = {}): void {
  o.coches = [...o.coches.filter((c) => c.jour !== jour), { jour, ...plus }];
}
const semaine = (o: ObjectifPerso, lundi: string, fois: number) => {
  for (let i = 0; i < fois; i++) cocher(o, j(lundi, i * 2));
};

describe('progression et séries', () => {
  it('progression de la semaine', () => {
    const o = objectif();
    const mercredi = j(LUNDI, 2);
    cocher(o, LUNDI);
    cocher(o, mercredi);
    const p = progression(o, mercredi);
    expect([p.realisees, p.cible, p.atteint, p.joursRestants, p.faitAujourdhui]).toEqual([2, 3, false, 5, true]);
    expect(p.message).toBe('Encore 1 cette semaine, il reste 5 jours.');
  });

  it('message neutre quand la semaine est perdue', () => {
    expect(progression(objectif(), j(LUNDI, 6)).message).toBe('0/3 cette semaine, on repart lundi.');
  });

  it("série de jours pour un objectif quotidien, avec le joker du mois", () => {
    const o = quotidien({ dateCreation: j(LUNDI, -10) });
    for (const i of [9, 8, 7, 6, 3, 2, 1]) cocher(o, j(LUNDI, -i));
    // pas encore fait aujourd'hui : la série d'hier tient ; un seul des deux jours ratés est couvert par le joker
    expect(serie(o, LUNDI).enCours).toBe(3);
    cocher(o, LUNDI);
    expect(serie(o, LUNDI).enCours).toBe(4);
    expect(serie(o, j(LUNDI, 2)).enCours).toBe(4);
    expect(serie(o, j(LUNDI, 2)).jokersRestants).toBe(0);
    expect(serie(o, j(LUNDI, 3)).enCours).toBe(0);
  });

  it('un joker acheté avec des points couvre un raté de plus', () => {
    const o = quotidien({ dateCreation: j(LUNDI, -10) });
    for (const i of [9, 8, 7, 6, 3, 2, 1, 0]) cocher(o, j(LUNDI, -i));
    expect(serie(o, LUNDI).enCours).toBe(4);
    o.jokersAchetes = [j(LUNDI, -5).slice(0, 7), j(LUNDI, -4).slice(0, 7)];
    expect(serie(o, LUNDI).enCours).toBeGreaterThan(4);
  });

  it('le joker du mois protège une semaine ratée', () => {
    const o = objectif({ dateCreation: '2026-10-05' });
    semaine(o, '2026-10-05', 3);
    semaine(o, '2026-10-26', 3);
    expect(serie(o, LUNDI).enCours).toBe(1);
    semaine(o, '2026-10-19', 3);
    expect(serie(o, LUNDI).enCours).toBe(3);
    expect(serie(o, LUNDI).jokersRestants).toBe(1);
  });

  it('série et taux de réussite', () => {
    const o = objectif({ dateCreation: j(LUNDI, -21) });
    semaine(o, j(LUNDI, -21), 3);
    semaine(o, j(LUNDI, -7), 3);
    cocher(o, j(LUNDI, -14));
    const h = historique(o, '2026-10', j(LUNDI, 1));
    expect([h.semainesTotales, h.semainesReussies, h.serieSemaines, h.meilleureSerie]).toEqual([3, 2, 2, 2]);
    expect(h.tauxReussite).toBeCloseTo(2 / 3);
    expect(h.coches.every((c) => c.jour.startsWith('2026-10'))).toBe(true);
  });
});

describe('rappels espacés', () => {
  const sport = (fois: number) => objectif({ cible: fois, dateCreation: j(LUNDI, -14) });
  const jours = (r: { dateHeure: string }[]) => r.map((x) => x.dateHeure.slice(0, 10));

  it('3 fois par semaine sans séance : lundi, mercredi, vendredi', () => {
    const r = rappels(sport(3), { jour: LUNDI, heure: '08:00' }, 7);
    expect(jours(r)).toEqual([LUNDI, j(LUNDI, 2), j(LUNDI, 4)]);
    expect(r[0].dateHeure.slice(11)).toBe('18:00');
  });
  it('après une séance le lundi, les rappels sont recalculés', () => {
    const o = sport(3);
    cocher(o, LUNDI);
    expect(jours(rappels(o, { jour: LUNDI, heure: '19:00' }, 7))).toEqual([j(LUNDI, 2), j(LUNDI, 4)]);
  });
  it('en retard le jeudi, les rappels sont resserrés', () => {
    const jeudi = j(LUNDI, 3);
    expect(jours(rappels(sport(3), { jour: jeudi, heure: '08:00' }, 4))).toEqual([jeudi, j(jeudi, 1), j(jeudi, 2)]);
  });
  it('aucun rappel quand la semaine est atteinte, la suivante repart de zéro', () => {
    const o = sport(2);
    cocher(o, LUNDI);
    cocher(o, j(LUNDI, 1));
    expect(rappels(o, { jour: j(LUNDI, 1), heure: '20:00' }, 6)).toEqual([]);
    expect(jours(rappels(o, { jour: j(LUNDI, 1), heure: '20:00' }, 10))).toEqual([j(LUNDI, 7), j(LUNDI, 10)]);
  });
  it("un rappel déjà passé aujourd'hui est ignoré", () => {
    expect(jours(rappels(sport(3), { jour: LUNDI, heure: '18:30' }, 7))).not.toContain(LUNDI);
  });
  it('sommeil : chaque soir, 30 min avant le coucher', () => {
    const r = rappels(quotidien(), { jour: LUNDI, heure: '08:00' }, 3);
    expect(r.length).toBe(3);
    expect(r.every((x) => x.dateHeure.endsWith('22:30'))).toBe(true);
  });
  it('objectif archivé : aucun rappel ; fenêtre respectée', () => {
    expect(rappels(objectif({ archive: true }), { jour: LUNDI, heure: '08:00' }, 7)).toEqual([]);
    expect(rappels(sport(3), { jour: LUNDI, heure: '08:00' }, 2).length).toBe(1);
  });
});

describe('cible qui s’adapte', () => {
  it('propose +1 après quatre semaines réussies', () => {
    const o = objectif({ dateCreation: j(LUNDI, -28) });
    for (let i = 1; i <= 3; i++) semaine(o, j(LUNDI, -7 * i), 3);
    expect(suggestion(o, LUNDI)).toBeNull();
    semaine(o, j(LUNDI, -28), 3);
    expect(suggestion(o, LUNDI)?.nouvelleCible).toBe(4);
  });
  it('propose -1 après trois semaines ratées, et oublie l’ancienne cible', () => {
    const o = objectif({ cible: 4, dateCreation: j(LUNDI, -21) });
    for (let i = 1; i <= 3; i++) semaine(o, j(LUNDI, -7 * i), 2);
    expect(suggestion(o, LUNDI)?.nouvelleCible).toBe(3);
    o.cible = 3;
    o.cibleDepuis = LUNDI;
    expect(suggestion(o, LUNDI)).toBeNull();
    expect(suggestion(o, j(LUNDI, 14))).toBeNull();
  });
  it('ne propose rien pour un objectif tout juste créé', () => {
    expect(suggestion(objectif({ cible: 5, dateCreation: j(LUNDI, 2) }), j(LUNDI, 2))).toBeNull();
    expect(suggestion(objectif({ cible: 5, dateCreation: j(LUNDI, 2) }), j(LUNDI, 9))).toBeNull();
  });
});

describe('heure habituelle et coches', () => {
  it('rappel à l’heure habituelle après cinq coches du jour même', () => {
    const o = objectif({ rappelAuto: true, dateCreation: j(LUNDI, -10) });
    const heures = ['07:02', '07:14', '06:58', '07:09'];
    heures.forEach((h, i) => {
      const jour = j(LUNDI, -(i + 1));
      o.coches.push(coche(o, jour, undefined, null, { jour, heure: h }));
    });
    expect(heureHabituelle(o)).toBeNull();
    expect(heureRappel(o)).toBe('18:00');
    o.coches.push(coche(o, LUNDI, undefined, null, { jour: LUNDI, heure: '07:30' }));
    expect(heureHabituelle(o)).toBe('07:05');
    expect(heureRappel(o)).toBe('06:35');
    // une coche faite après coup n'apprend pas d'heure
    expect(coche(o, j(LUNDI, -8), undefined, null, { jour: LUNDI, heure: '22:00' }).heure).toBeNull();
  });

  it('ajouter des détails garde la quantité, et inversement ; pas de jour futur', () => {
    const o = objectif({ mesure: 'KM' });
    const maintenant = { jour: LUNDI, heure: '19:00' };
    o.coches.push(coche(o, LUNDI, undefined, 8.5, maintenant));
    const avecDetails = coche(o, LUNDI, { typeSeance: 'COURSE', dureeMinutes: 45 }, null, { jour: LUNDI, heure: '21:00' });
    expect([avecDetails.quantite, avecDetails.typeSeance, avecDetails.heure]).toEqual([8.5, 'COURSE', '19:00']);
    expect(() => coche(o, j(LUNDI, 1), undefined, null, maintenant)).toThrow();
  });
});

describe('bilan et statistiques', () => {
  it('bilan et statistiques d’un objectif chiffré', () => {
    const o = objectif({ nom: 'Courir', cible: 2, mesure: 'KM', objectifQuantite: 15, dateCreation: j(LUNDI, -7) });
    const dimanche = j(LUNDI, 6);
    cocher(o, LUNDI, { typeSeance: 'COURSE', dureeMinutes: 30, quantite: 5 });
    cocher(o, j(LUNDI, 3), { typeSeance: 'COURSE', dureeMinutes: 45, quantite: 8 });
    cocher(o, j(LUNDI, -3), { typeSeance: 'VELO', dureeMinutes: 60, quantite: 20 });

    const b = bilan([o], dimanche, dimanche);
    expect([b.tenus, b.seances, b.seancesSemainePrecedente, b.lignes[0].quantite]).toEqual([1, 2, 1, 13]);
    expect(b.phrase).toContain('bravo');
    expect(b.phrase).toContain('Plus actif');

    const s = statistiques(o, dimanche);
    expect([s.totalSeances, s.totalMinutes, s.totalQuantite]).toEqual([3, 135, 33]);
    expect(s.types[0].type).toBe('COURSE');
    expect(s.mois.length).toBe(6);
    expect([s.mois[5].quantite, s.mois[4].quantite]).toEqual([13, 20]);
  });

  it('le bilan compte un objectif ajouté avec des coches antérieures', () => {
    const o = objectif({ dateCreation: LUNDI });
    semaine(o, j(LUNDI, -7), 3);
    expect(bilan([o], j(LUNDI, -7), LUNDI).total).toBe(1);
  });
});
