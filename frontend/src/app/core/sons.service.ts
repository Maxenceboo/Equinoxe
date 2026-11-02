import { Injectable, signal } from '@angular/core';

const CLE = 'objectifs.son';

/** Petits sons de réussite synthétisés (aucun fichier audio). Peuvent être coupés. */
@Injectable({ providedIn: 'root' })
export class SonsService {
  readonly actif = signal(lireActif());
  private contexte?: AudioContext;

  basculer(): void {
    this.actif.update((a) => !a);
    try {
      localStorage.setItem(CLE, this.actif() ? '1' : '0');
    } catch {
      /* ignoré */
    }
  }

  /** « Ding » montant court quand on coche. */
  coche(): void {
    this.jouer([
      { note: 880, debut: 0, duree: 0.09, forme: 'sine', volume: 0.18 },
      { note: 1320, debut: 0.07, duree: 0.16, forme: 'sine', volume: 0.16 },
    ]);
  }

  /** Petit son grave et discret quand on décoche. */
  decoche(): void {
    this.jouer([{ note: 330, debut: 0, duree: 0.08, forme: 'triangle', volume: 0.1 }]);
  }

  /** Arpège de fête pour les célébrations. */
  fanfare(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    this.jouer(
      notes.map((note, i) => ({ note, debut: i * 0.09, duree: i === notes.length - 1 ? 0.5 : 0.16, forme: 'triangle' as const, volume: 0.16 })),
    );
  }

  private jouer(sons: { note: number; debut: number; duree: number; forme: OscillatorType; volume: number }[]): void {
    if (!this.actif()) return;
    try {
      this.contexte ??= new AudioContext();
      const ctx = this.contexte;
      if (ctx.state === 'suspended') ctx.resume();
      const t0 = ctx.currentTime;
      for (const s of sons) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = s.forme;
        osc.frequency.value = s.note;
        gain.gain.setValueAtTime(0.0001, t0 + s.debut);
        gain.gain.exponentialRampToValueAtTime(s.volume, t0 + s.debut + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + s.debut + s.duree);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0 + s.debut);
        osc.stop(t0 + s.debut + s.duree + 0.02);
      }
    } catch {
      /* audio indisponible */
    }
  }
}

function lireActif(): boolean {
  try {
    return localStorage.getItem(CLE) !== '0';
  } catch {
    return true;
  }
}
