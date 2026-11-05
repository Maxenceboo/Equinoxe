import { Component, computed, effect, input, signal } from '@angular/core';

// Trois formes de flamme avec exactement les mêmes commandes : le SVG passe de l'une à l'autre en douceur.
const FORME_A =
  'M12 2 C13 5 9 7 9 10 C9 11.5 10.5 12.5 12 12.5 C13.6 12.5 15 11.3 15 9.6 C15 8.8 14.8 8.1 14.4 7.4 ' +
  'C17.8 8.8 20 11.7 20 15 C20 19.4 16.4 23 12 23 C7.6 23 4 19.4 4 15 C4 10.6 7.3 7.8 9 5.6 C10.3 4 11.4 3 12 2 Z';
const FORME_B =
  'M12.8 1.6 C13.6 4.8 9.4 7 9.3 10 C9.3 11.6 10.7 12.6 12.2 12.6 C13.8 12.6 15.1 11.2 15 9.4 C15 8.6 14.7 7.8 14.2 7 ' +
  'C18 8.6 20.2 11.6 20.1 15 C20 19.4 16.4 23 12 23 C7.6 23 4 19.4 4.1 15 C4.2 10.4 7.6 7.6 9.4 5.3 C10.8 3.6 12 2.6 12.8 1.6 Z';
const FORME_C =
  'M11.3 2.3 C12.4 5.2 8.8 7.2 8.8 10.1 C8.8 11.5 10.3 12.4 11.8 12.4 C13.4 12.4 14.9 11.4 14.9 9.8 C14.9 9 14.8 8.3 14.5 7.7 ' +
  'C17.6 9 19.8 11.8 19.9 15 C20 19.4 16.4 23 12 23 C7.6 23 4 19.4 3.9 15 C3.9 10.8 7 8 8.7 5.9 C9.9 4.4 10.8 3.3 11.3 2.3 Z';

// Cœur de la flamme, découpé en noir dans la flamme blanche
const COEUR_A = 'M12 14 C13 16 14.5 17 14.5 19 C14.5 20.4 13.4 21.5 12 21.5 C10.6 21.5 9.5 20.4 9.5 19 C9.5 17 11 16 12 14 Z';
const COEUR_B = 'M12.5 13.4 C13.4 15.6 14.7 16.8 14.6 18.9 C14.6 20.4 13.4 21.5 12 21.5 C10.6 21.5 9.4 20.4 9.5 18.9 C9.6 16.8 11.4 15.6 12.5 13.4 Z';
const COEUR_C = 'M11.6 14.3 C12.7 16.2 14.4 17.2 14.4 19.1 C14.4 20.4 13.4 21.5 12 21.5 C10.6 21.5 9.6 20.4 9.6 19.1 C9.6 17.2 10.6 16.3 11.6 14.3 Z';

const BOUCLE = (a: string, b: string, c: string) => [a, b, a, c, a].join(';');
const DOUX = '0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1';

/**
 * Flamme de série en SVG animé : quand la série est en cours, la forme ondule doucement
 * et son cœur bouge ; en grand (célébration), quelques braises montent. Contour gris et immobile sinon.
 */
@Component({
  selector: 'app-flamme',
  template: `
    <span
      class="flamme"
      [class.active]="valeur() > 0"
      [class.bump]="bump()"
      [class.grande]="taille() === 'grande'"
      [attr.aria-label]="libelle()"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path class="corps" [attr.d]="formeA">
          @if (anime()) {
            <animate attributeName="d" [attr.values]="corps" [attr.dur]="duree()" repeatCount="indefinite"
                     calcMode="spline" [attr.keySplines]="doux" keyTimes="0;0.25;0.5;0.75;1" />
          }
        </path>
        @if (valeur() > 0) {
          <path class="coeur" [attr.d]="coeurA">
            @if (anime()) {
              <animate attributeName="d" [attr.values]="coeur" [attr.dur]="duree()" begin="-0.4s"
                       repeatCount="indefinite" calcMode="spline" [attr.keySplines]="doux" keyTimes="0;0.25;0.5;0.75;1" />
            }
          </path>
        }
        @if (taille() === 'grande' && anime()) {
          @for (b of braises; track $index) {
            <circle class="braise" [attr.cx]="b.x" cy="6" [attr.r]="b.r">
              <animate attributeName="cy" values="8;-2" [attr.dur]="b.duree" [attr.begin]="b.debut" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;0" [attr.dur]="b.duree" [attr.begin]="b.debut" repeatCount="indefinite" />
            </circle>
          }
        }
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

  protected readonly formeA = FORME_A;
  protected readonly coeurA = COEUR_A;
  protected readonly corps = BOUCLE(FORME_A, FORME_B, FORME_C);
  protected readonly coeur = BOUCLE(COEUR_A, COEUR_B, COEUR_C);
  protected readonly doux = DOUX;
  protected readonly braises = [
    { x: 9.5, r: 0.6, duree: '1.8s', debut: '0s' },
    { x: 13.5, r: 0.5, duree: '2.2s', debut: '0.7s' },
    { x: 11.5, r: 0.4, duree: '1.6s', debut: '1.2s' },
  ];

  private readonly mouvementReduit =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** Animée seulement si la série est en cours et que le téléphone n'a pas demandé moins d'animations. */
  protected readonly anime = computed(() => this.valeur() > 0 && !this.mouvementReduit);
  /** En petit, l'ondulation est lente et discrète ; en grand, un peu plus vive. */
  protected readonly duree = computed(() => (this.taille() === 'grande' ? '1.4s' : '2.4s'));

  protected readonly bump = signal(false);
  protected readonly libelle = computed(
    () => `Série : ${this.valeur()} ${this.unite() === 'JOURS' ? 'jour' : 'semaine'}${this.valeur() > 1 ? 's' : ''} d'affilée`,
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
