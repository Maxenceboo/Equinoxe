import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export interface Celebration {
  titre: string;
  sousTitre: string;
  /** Grand chiffre affiché sous la flamme, par exemple « 7 » ou « 3/3 ». */
  nombre: string;
  /** Légende du chiffre, par exemple « jours d'affilée ». */
  legende: string;
}

/** Retours de réussite : vibration à chaque coche, écran de célébration aux grands moments. */
@Injectable({ providedIn: 'root' })
export class CelebrationService {
  readonly enCours = signal<Celebration | null>(null);
  private minuteur?: ReturnType<typeof setTimeout>;

  /** Paliers de série qui méritent une célébration. */
  static readonly PALIERS_JOURS = [3, 7, 14, 21, 30, 50, 100, 200, 365];
  static readonly PALIERS_SEMAINES = [2, 4, 8, 12, 26, 52];

  coche(): void {
    this.vibrer('legere');
  }

  celebrer(c: Celebration): void {
    this.vibrer('succes');
    this.enCours.set(c);
    clearTimeout(this.minuteur);
    this.minuteur = setTimeout(() => this.fermer(), 3500);
  }

  fermer(): void {
    this.enCours.set(null);
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
