import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { CelebrationService } from '../core/celebration.service';

const R = 80;
const C = 100;

/**
 * Partie éclairée d'une lune croissante (éclairée à droite), pour une phase de 0 à 1.
 * Le bord droit est un demi-cercle ; la limite d'ombre est une demi-ellipse dont la largeur suit la phase.
 */
export function cheminPhase(f: number): string {
  const rx = Math.abs(1 - 2 * f) * R;
  const versLaGauche = f > 0.5 ? 1 : 0;
  return `M ${C} ${C - R} A ${R} ${R} 0 0 1 ${C} ${C + R} A ${rx.toFixed(2)} ${R} 0 0 ${versLaGauche} ${C} ${C - R} Z`;
}

/** Étoiles placées une fois pour toutes (pas d'aléatoire : même ciel à chaque fois). */
const ETOILES = Array.from({ length: 14 }, (_, i) => {
  const angle = i * 2.399963; // angle d'or : réparties sans se toucher
  const distance = 34 + ((i * 53) % 60);
  return {
    x: 50 + Math.cos(angle) * distance * 0.6,
    y: 42 + Math.sin(angle) * distance * 0.75,
    taille: 2 + (i % 2),
    delai: `${1.5 + (i % 7) * 0.12}s`,
  };
}).filter((e) => e.x > 2 && e.x < 98 && e.y > 2 && e.y < 92 && !(e.y > 54 && e.y < 80 && e.x > 8 && e.x < 92));

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Écran plein de la lune : noir complet, la lune change de phase, les étoiles s'allument, puis le nom apparaît. */
@Component({
  selector: 'app-lune',
  template: `
    @if (service.lune(); as l) {
      <div class="lune-ecran" [class.pleine]="l.vers >= 1" role="status" [attr.aria-label]="l.titre + '. ' + l.sousTitre" (click)="service.fermerLune()">
        <div class="ciel" aria-hidden="true">
          @for (e of etoiles; track $index) {
            <i [style.left.%]="e.x" [style.top.%]="e.y" [style.width.px]="e.taille" [style.height.px]="e.taille"
               [style.--delai]="e.delai"></i>
          }
        </div>
        <div class="astre" aria-hidden="true">
          @if (l.vers >= 1) {
            <span class="anneau"></span>
            <span class="anneau deux"></span>
          }
          <svg viewBox="0 0 200 200">
            <!-- Aplat blanc comme le logo ; la face cachée n'est qu'un trait -->
            <circle cx="100" cy="100" r="80" class="contour" />
            <path [attr.d]="chemin()" class="eclairee" />
          </svg>
        </div>
        <p class="etiquette-lune">{{ l.vers >= 1 && l.de < 1 ? 'Pleine lune atteinte' : 'Nouvelle phase' }}</p>
        <h2>{{ l.titre }}</h2>
        <p class="sous-titre-lune">{{ l.sousTitre }}</p>
        <small>Touche pour continuer</small>
      </div>
    }
  `,
})
export class LuneOverlay implements OnDestroy {
  protected readonly service = inject(CelebrationService);
  protected readonly etoiles = ETOILES;
  protected readonly phase = signal(0);
  protected readonly chemin = signal(cheminPhase(0));
  private image = 0;

  constructor() {
    effect(() => {
      const l = this.service.lune();
      cancelAnimationFrame(this.image);
      if (!l) return;
      this.animer(l.de, l.vers);
    });
  }

  private animer(de: number, vers: number): void {
    const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const debut = performance.now() + (reduit ? 0 : 500);
    const duree = reduit ? 1 : 1400;
    const pas = (t: number) => {
      const avance = Math.min(1, Math.max(0, (t - debut) / duree));
      const f = de + (vers - de) * easeInOut(avance);
      this.phase.set(f);
      this.chemin.set(cheminPhase(f));
      if (avance < 1) this.image = requestAnimationFrame(pas);
    };
    this.phase.set(de);
    this.chemin.set(cheminPhase(de));
    this.image = requestAnimationFrame(pas);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.image);
  }
}
