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
      { note: 880, debut: 0, duree: 0.08, forme: 'sine', volume: 0.08 },
      { note: 1320, debut: 0.06, duree: 0.12, forme: 'sine', volume: 0.07 },
    ]);
  }

  /** Petit son grave et discret quand on décoche. */
  decoche(): void {
    this.jouer([{ note: 330, debut: 0, duree: 0.06, forme: 'sine', volume: 0.05 }]);
  }

  /** Trois notes douces pour les célébrations. */
  fanfare(): void {
    const notes = [659.25, 783.99, 1046.5];
    this.jouer(notes.map((note, i) => ({ note, debut: i * 0.1, duree: i === 2 ? 0.35 : 0.14, forme: 'sine' as const, volume: 0.1 })));
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
    return localStorage.getItem(CLE) === '1';
  } catch {
    return false;
  }
}
