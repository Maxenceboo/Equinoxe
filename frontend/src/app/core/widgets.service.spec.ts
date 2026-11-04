import { describe, expect, it } from 'vitest';
import { Objectif, Profil } from '../api/generated';
import { resumeWidget } from './widgets.service';

const objectif = (nom: string, fait: boolean, atteint: boolean) =>
  ({ nom, progression: { faitAujourdhui: fait, atteint } }) as unknown as Objectif;

describe('resumeWidget', () => {
  it('résume le niveau et les objectifs du jour', () => {
    const profil = { niveau: 3, nomNiveau: 'Premier quartier', points: 240 } as Profil;
    const r = resumeWidget([objectif('Courir', true, true), objectif('Lire', false, false)], profil, '2026-11-04');
    expect(r).toEqual({
      date: '2026-11-04',
      phase: 0.5,
      nomNiveau: 'Premier quartier',
      points: 240,
      tenus: 1,
      objectifs: [{ nom: 'Courir', fait: true }, { nom: 'Lire', fait: false }],
    });
  });

  it('commence à la nouvelle lune sans profil', () => {
    expect(resumeWidget([], null, '2026-11-04').phase).toBe(0);
  });
});
