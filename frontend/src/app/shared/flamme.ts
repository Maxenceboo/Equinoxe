import { Component, computed, effect, input, signal } from '@angular/core';

/** Flamme de série : pleine et blanche quand la série est en cours, contour gris sinon. */
@Component({
  selector: 'app-flamme',
  template: `
    <span class="flamme" [class.active]="valeur() > 0" [class.bump]="bump()" [class.grande]="taille() === 'grande'"
          [attr.aria-label]="libelle()">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2c.6 3.2-1.4 4.9-1.4 7.4 0 1.5 1.1 2.6 2.4 2.6 1.4 0 2.5-1.1 2.5-2.6 0-.8-.2-1.5-.6-2.2C17.8 8.8 20 11.7 20 15a8 8 0 0 1-16 0c0-4.4 3.3-7.2 5-9.4C10.3 4 11.4 3 12 2z"
        />
      </svg>
      @if (taille() !== 'grande') {
        <span class="nombre">{{ valeur() }}</span>
      }
    </span>
  `,
})
export class Flamme {
  readonly valeur = input(0);
  readonly unite = input<'JOURS' | 'SEMAINES'>('SEMAINES');
  readonly taille = input<'normale' | 'grande'>('normale');

  protected readonly bump = signal(false);
  protected readonly libelle = computed(
    () => `Série : ${this.valeur()} ${this.unite() === 'JOURS' ? 'jour(s)' : 'semaine(s)'} d'affilée`,
  );
  private precedente = -1;

  constructor() {
    // Petite animation quand la série augmente
    effect(() => {
      const v = this.valeur();
      if (this.precedente >= 0 && v > this.precedente) {
        this.bump.set(true);
        setTimeout(() => this.bump.set(false), 600);
      }
      this.precedente = v;
    });
  }
}
