import { describe, expect, it } from 'vitest';
import { dateRelance } from './notifications.service';
import { plusRecente } from './mise-a-jour.service';

describe('mise à jour', () => {
  it('compare les numéros de version', () => {
    expect(plusRecente('1.10.0', '1.9.2')).toBe(true);
    expect(plusRecente('1.1.0', '1.1.0')).toBe(false);
    expect(plusRecente('1.0.9', '1.1')).toBe(false);
  });
});

describe('relance douce', () => {
  it('18 h, 3 jours après la dernière coche, une seule fois', () => {
    const lundiMidi = new Date(2026, 10, 2, 12, 0);
    expect(dateRelance('2026-11-02', lundiMidi)).toEqual(new Date(2026, 10, 5, 18, 0));
    expect(dateRelance('2026-10-20', lundiMidi)).toBeNull();
    expect(dateRelance(null, lundiMidi)).toBeNull();
  });
});
