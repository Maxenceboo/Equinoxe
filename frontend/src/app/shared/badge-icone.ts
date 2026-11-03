import { Component, input } from '@angular/core';

/** Icône d'un badge, dessinée au trait comme le logo : blanche si obtenu, grise en pointillés sinon. */
@Component({
  selector: 'app-badge-icone',
  template: `
    <svg viewBox="0 0 40 40" [class.obtenu]="obtenu()" aria-hidden="true">
      @switch (code()) {
        @case ('PREMIER_PAS') {
          <path d="M26 8 A13 13 0 1 0 26 32 A10 10 0 1 1 26 8 Z" />
        }
        @case ('SEMAINE_PARFAITE') {
          <circle cx="20" cy="20" r="13" />
          <path d="M14 20.5 L18.5 25 L26.5 16" />
        }
        @case ('LUNE_PLEINE') {
          <circle cx="20" cy="20" r="13" />
          <circle cx="20" cy="20" r="7" class="plein" />
        }
        @case ('SEPT_SUR_SEPT') {
          <circle cx="20" cy="7" r="2.6" /><circle cx="30.2" cy="11.9" r="2.6" /><circle cx="32.7" cy="22.9" r="2.6" />
          <circle cx="25.6" cy="31.7" r="2.6" /><circle cx="14.4" cy="31.7" r="2.6" /><circle cx="7.3" cy="22.9" r="2.6" />
          <circle cx="9.8" cy="11.9" r="2.6" />
        }
        @case ('RETOUR_GAGNANT') {
          <path d="M29 14 A11 11 0 1 0 31 21" />
          <path d="M30 7 L29.5 14 L22.5 13.5" />
        }
        @default {
          <path d="M8 16 A12 12 0 0 0 32 16" />
          <circle cx="20" cy="19" r="4.5" class="plein" />
        }
      }
    </svg>
  `,
  styles: `
    :host { display: inline-flex; }
    svg { width: 100%; height: 100%; fill: none; stroke: var(--ligne-forte); stroke-width: 1.6; stroke-dasharray: 3 2.5; stroke-linecap: round; stroke-linejoin: round; }
    svg.obtenu { stroke: var(--texte); stroke-dasharray: none; }
    svg.obtenu .plein { fill: var(--texte); }
  `,
})
export class BadgeIcone {
  readonly code = input.required<string>();
  readonly obtenu = input(false);
}
