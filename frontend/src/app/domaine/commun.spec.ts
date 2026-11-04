import { describe, expect, it } from 'vitest';
import { serieCommune } from './commun';

describe('serieCommune', () => {
  it('quotidien : monte seulement les jours faits par les deux', () => {
    const s = serieCommune(
      { quotidien: true, cible: 7, depuis: '2026-11-01', mesJours: ['2026-11-01', '2026-11-02', '2026-11-03'], joursAmi: ['2026-11-01', '2026-11-02', '2026-11-03'] },
      '2026-11-04',
    );
    expect(s.enCours).toBe(3);
    expect(s.moi).toBe(0);
  });

  it('quotidien : retombe à zéro si l\'un des deux rate un jour', () => {
    const s = serieCommune(
      { quotidien: true, cible: 7, depuis: '2026-11-01', mesJours: ['2026-11-01', '2026-11-02', '2026-11-03'], joursAmi: ['2026-11-01', '2026-11-03'] },
      '2026-11-03',
    );
    expect(s.enCours).toBe(1);
    expect(s.record).toBe(1);
  });

  it('par semaine : il faut la cible des deux côtés', () => {
    // Semaines du 26 oct. et du 2 nov. 2026, cible 2
    const s = serieCommune(
      {
        quotidien: false,
        cible: 2,
        depuis: '2026-10-26',
        mesJours: ['2026-10-26', '2026-10-28', '2026-11-02', '2026-11-03'],
        joursAmi: ['2026-10-27', '2026-10-30', '2026-11-04'],
      },
      '2026-11-04',
    );
    expect(s.enCours).toBe(1); // semaine passée réussie à deux, semaine en cours pas finie
    expect(s.moi).toBe(2);
    expect(s.ami).toBe(1);
  });
});
