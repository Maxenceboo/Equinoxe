import { Component, inject } from '@angular/core';
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
          @for (i of etincelles; track i) {
            <i [style.--angle]="i * 30 + 'deg'" [style.--delai]="(i % 3) * 80 + 'ms'"></i>
          }
        </div>
        <app-flamme [valeur]="1" taille="grande" />
        <strong class="serie">{{ c.nombre }}</strong>
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
  protected readonly etincelles = Array.from({ length: 12 }, (_, i) => i);
}
