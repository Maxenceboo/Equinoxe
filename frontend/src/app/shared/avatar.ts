import { Component, computed, inject, input } from '@angular/core';
import { PhotosService } from '../core/photos.service';

/** Photo de profil ronde ; à défaut, l'initiale du nom. */
@Component({
  selector: 'app-avatar',
  template: `
    <span class="avatar" [class.fait]="fait()" [style.width.rem]="taille()" [style.height.rem]="taille()" [style.font-size.rem]="taille() * 0.42" [attr.title]="nom()">
      @if (url(); as u) {
        <img [src]="u" [alt]="nom()" loading="lazy" />
      } @else {
        {{ initiale() }}
      }
    </span>
  `,
})
export class Avatar {
  private readonly photos = inject(PhotosService);
  readonly id = input<string | null | undefined>();
  readonly nom = input('');
  readonly taille = input(2.25);
  /** Entouré d'un trait épais : la personne l'a fait. */
  readonly fait = input(false);
  protected readonly url = computed(() => this.photos.url(this.id()));
  protected readonly initiale = computed(() => (this.nom().replace(/^@/, '').charAt(0) || '?').toUpperCase());
}
