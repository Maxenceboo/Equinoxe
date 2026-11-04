import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Objectif, Profil } from '../api/generated';
import { aujourdhui } from '../shared/dates';
import { phaseDuNiveau } from './celebration.service';

/** Pont vers le code Android (MainActivity) : enregistre le résumé et redessine les widgets. */
const Widgets = registerPlugin<{ mettreAJour(o: { donnees: string }): Promise<void> }>('Widgets');

/** Ce que les widgets de l'écran d'accueil Android affichent. */
export interface ResumeWidget {
  date: string;
  phase: number;
  nomNiveau: string;
  points: number;
  tenus: number;
  objectifs: { nom: string; fait: boolean }[];
}

export function resumeWidget(objectifs: Objectif[], profil: Profil | null, date = aujourdhui()): ResumeWidget {
  return {
    date,
    phase: phaseDuNiveau(profil?.niveau ?? 1),
    nomNiveau: profil?.nomNiveau ?? '',
    points: profil?.points ?? 0,
    tenus: objectifs.filter((o) => o.progression.atteint).length,
    objectifs: objectifs.map((o) => ({ nom: o.nom, fait: o.progression.faitAujourdhui })),
  };
}

/** Widgets Android « Ma lune » et « Aujourd'hui ». Rien sur le web (pas de widgets pour une app web). */
@Injectable({ providedIn: 'root' })
export class WidgetsService {
  private dernier = '';

  publier(objectifs: Objectif[], profil: Profil | null): void {
    this.envoyer(JSON.stringify(resumeWidget(objectifs, profil)));
  }

  /** Déconnexion : les widgets n'affichent plus rien de ce compte. */
  vider(): Promise<void> {
    return this.envoyer('');
  }

  private async envoyer(donnees: string): Promise<void> {
    if (!Capacitor.isNativePlatform() || donnees === this.dernier) return;
    this.dernier = donnees;
    try {
      await Widgets.mettreAJour({ donnees });
    } catch (e) {
      console.warn('Widgets non mis à jour', e);
    }
  }
}
