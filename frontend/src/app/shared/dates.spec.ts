import { describe, expect, it } from 'vitest';
import { joursDuMois, moisDecale } from './dates';

describe('dates', () => {
  it('commence le calendrier un lundi', () => {
    // 1er novembre 2026 est un dimanche : 6 cases vides avant
    const cases = joursDuMois('2026-11');
    expect(cases.slice(0, 6).every((c) => c === null)).toBe(true);
    expect(cases[6]).toBe('2026-11-01');
    expect(cases.at(-1)).toBe('2026-11-30');
  });

  it('change de mois et d\'année', () => {
    expect(moisDecale('2026-12', 1)).toBe('2027-01');
    expect(moisDecale('2026-01', -1)).toBe('2025-12');
  });
});

import { libelleSemaine } from './dates';

describe('libelleSemaine', () => {
  it('affiche la semaine du lundi au dimanche', () => {
    expect(libelleSemaine(new Date(2026, 10, 4))).toBe('2 – 8 novembre');
    expect(libelleSemaine(new Date(2026, 10, 1))).toBe('26 oct. – 1 nov.');
  });
});
