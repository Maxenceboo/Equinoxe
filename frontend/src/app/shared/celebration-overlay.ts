import { Component, effect, inject, signal } from '@angular/core';
import { CelebrationService } from '../core/celebration.service';
import { Flamme } from './flamme';

/** Écran plein de célébration : grande flamme, série, étincelles. Se ferme seul ou au toucher. */
@Component({
  selector: 'app-celebration',
  imports: [Flamme],
  template: `
    @if (service.enCours(); as c) {
      <div class="celebration" role="status" (click)="service.fermer()">
        <div class="etincelles" aria-hidden="true">
          @for (e of etincelles; track $index) {
            <i
              [style.--angle]="e.angle + 'deg'"
              [style.--distance]="e.distance + 'rem'"
              [style.--delai]="e.delai + 'ms'"
              [style.--taille]="e.taille + 'px'"
            ></i>
          }
        </div>
        <div class="anneau" aria-hidden="true"></div>
        <app-flamme [valeur]="30" unite="JOURS" taille="grande" />
        <strong class="serie">{{ affiche() }}</strong>
        <span class="unite">{{ c.legende }}</span>
        <h2>{{ c.titre }}</h2>
        <p>{{ c.sousTitre }}</p>
        <small>Touche pour continuer</small>
      </div>
    }
  `,
})
export class CelebrationOverlay {
  protected readonly service = inject(CelebrationService);
  protected readonly affiche = signal('');
  protected etincelles = this.nouvellesEtincelles();

  constructor() {
    // Le grand chiffre défile de 0 à sa valeur, et chaque célébration a ses propres éclats
    effect(() => {
      const c = this.service.enCours();
      if (!c) return;
      this.etincelles = this.nouvellesEtincelles();
      const m = /^(\d+)(.*)$/.exec(c.nombre);
      if (!m) {
        this.affiche.set(c.nombre);
        return;
      }
      const cible = Number(m[1]);
      const suite = m[2];
      const debut = performance.now();
      const duree = Math.min(900, 250 + cible * 60);
      const etape = (t: number) => {
        const p = Math.min(1, (t - debut) / duree);
        const ease = 1 - Math.pow(1 - p, 3);
        this.affiche.set(Math.round(cible * ease) + suite);
        if (p < 1 && this.service.enCours() === c) requestAnimationFrame(etape);
      };
      requestAnimationFrame(etape);
    });
  }

  private nouvellesEtincelles() {
    return Array.from({ length: 28 }, (_, i) => ({
      angle: (360 / 28) * i + Math.random() * 10,
      distance: 6 + Math.random() * 7,
      delai: Math.random() * 180,
      taille: 3 + Math.round(Math.random() * 5),
    }));
  }
}
