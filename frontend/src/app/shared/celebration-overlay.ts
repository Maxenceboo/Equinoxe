import { Component, inject } from '@angular/core';
import { CelebrationService } from '../core/celebration.service';
import { Flamme } from './flamme';

/** Écran de célébration sobre : flamme, chiffre, message. Se ferme seul ou au toucher. */
@Component({
  selector: 'app-celebration',
  imports: [Flamme],
  template: `
    @if (service.enCours(); as c) {
      <div class="celebration" role="status" (click)="service.fermer()">
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
}
