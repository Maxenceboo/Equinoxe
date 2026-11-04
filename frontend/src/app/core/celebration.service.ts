import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { SonsService } from './sons.service';

export interface Celebration {
  titre: string;
  sousTitre: string;
  /** Grand chiffre affiché sous la flamme, par exemple « 7 » ou « 3/3 ». */
  nombre: string;
  /** Légende du chiffre, par exemple « jours d'affilée ». */
  legende: string;
}

/** Grand moment de la lune : passage à une nouvelle phase (niveau) ou badge « Lune pleine ». */
export interface CelebrationLune {
  /** Phase de départ et d'arrivée, de 0 (nouvelle lune) à 1 (pleine lune). */
  de: number;
  vers: number;
  titre: string;
  sousTitre: string;
}

/** Phase de la lune pour un niveau : 1 = nouvelle lune … 5 = pleine lune, puis pleine lune pour toujours. */
export function phaseDuNiveau(numero: number): number {
  return Math.min(1, Math.max(0, (numero - 1) / 4));
}

/** Retours de réussite : vibration à chaque coche, écran de célébration aux grands moments. */
@Injectable({ providedIn: 'root' })
export class CelebrationService {
  readonly enCours = signal<Celebration | null>(null);
  readonly lune = signal<CelebrationLune | null>(null);
  private readonly sons = inject(SonsService);
  private minuteur?: ReturnType<typeof setTimeout>;

  /** Paliers de série qui méritent une célébration. */
  static readonly PALIERS_JOURS = [7, 30, 100, 365];
  static readonly PALIERS_SEMAINES = [2, 4, 8, 12, 26, 52];

  coche(): void {
    this.vibrer('legere');
    this.sons.coche();
  }

  decoche(): void {
    this.sons.decoche();
  }

  celebrer(c: Celebration): void {
    this.vibrer('succes');
    this.sons.fanfare();
    this.enCours.set(c);
    clearTimeout(this.minuteur);
    this.minuteur = setTimeout(() => this.fermer(), 2500);
  }

  fermer(): void {
    this.enCours.set(null);
  }

  /** Écran plein de la lune : l'ombre glisse vers la nouvelle phase. Se ferme au toucher. */
  celebrerLune(c: CelebrationLune): void {
    this.fermer();
    this.sons.fanfare();
    this.lune.set(c);
    // La vibration tombe quand la lune atteint sa nouvelle phase
    setTimeout(() => this.vibrer('succes'), 1900);
    clearTimeout(this.minuteur);
    this.minuteur = setTimeout(() => this.fermerLune(), 6000);
  }

  fermerLune(): void {
    this.lune.set(null);
  }

  private vibrer(type: 'legere' | 'succes'): void {
    try {
      if (Capacitor.isNativePlatform()) {
        if (type === 'legere') Haptics.impact({ style: ImpactStyle.Light });
        else Haptics.notification({ type: NotificationType.Success });
      } else {
        navigator.vibrate?.(type === 'legere' ? 15 : [30, 60, 30]);
      }
    } catch {
      /* pas de vibration disponible */
    }
  }
}
