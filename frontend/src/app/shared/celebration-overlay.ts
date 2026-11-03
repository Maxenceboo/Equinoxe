import { Component, inject } from '@angular/core';
import { CelebrationService } from '../core/celebration.service';
import { Flamme } from './flamme';

/** Pluie de confettis aux couleurs de la palette choisie : la couleur n'apparaît qu'aux grands moments. */
const CONFETTIS = Array.from({ length: 36 }, (_, i) => ({
  gauche: (i * 37) % 100,
  couleur: `var(--eclat-${(i % 3) + 1})`,
  delai: `${(i % 9) * 0.06}s`,
  duree: `${1.6 + (i % 5) * 0.2}s`,
  tour: `${(i % 2 ? 1 : -1) * (180 + (i % 4) * 90)}deg`,
  rond: i % 4 === 0,
}));

/** Écran de célébration : flamme, chiffre, message, et un éclat de couleur. Se ferme seul ou au toucher. */
@Component({
  selector: 'app-celebration',
  imports: [Flamme],
  template: `
    @if (service.enCours(); as c) {
      <div class="celebration" role="status" (click)="service.fermer()">
        <span class="lueur" aria-hidden="true"></span>
        <div class="confetti" aria-hidden="true">
          @for (k of confettis; track $index) {
            <i [style.left.%]="k.gauche" [style.background]="k.couleur" [style.border-radius]="k.rond ? '50%' : null"
               [style.--delai]="k.delai" [style.--duree]="k.duree" [style.--tour]="k.tour"></i>
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
  protected readonly confettis = CONFETTIS;
}
