import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { CelebrationService } from '../core/celebration.service';

/** Le logo agrandi : un croissant qui porte un petit rond (repère 200 × 200, centré). */
const ECHELLE = 2.2;
const LOGO = {
  coupe: { cy: 100 + 2 * ECHELLE, r: 32 * ECHELLE },
  creux: { cy: 100 - 8 * ECHELLE, r: 27 * ECHELLE },
  rond: { cy: 100 + 8 * ECHELLE, r: 11 * ECHELLE },
};
/** La lune finale, à la place du croissant. */
const LUNE = { cy: 100, r: 72 };

/**
 * Partie éclairée d'une lune croissante (éclairée à droite), pour une phase de 0 à 1.
 * Le bord droit est un demi-cercle ; la limite d'ombre est une demi-ellipse dont la largeur suit la phase.
 */
export function cheminPhase(f: number, cy = 100, r = 80, cx = 100): string {
  const rx = Math.abs(1 - 2 * f) * r;
  const versLaGauche = f > 0.5 ? 1 : 0;
  const n = (v: number) => v.toFixed(2);
  return `M ${n(cx)} ${n(cy - r)} A ${n(r)} ${n(r)} 0 0 1 ${n(cx)} ${n(cy + r)} A ${n(rx)} ${n(r)} 0 0 ${versLaGauche} ${n(cx)} ${n(cy - r)} Z`;
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
            <defs>
              <mask id="lune-creux">
                <rect width="200" height="200" fill="#fff" />
                <circle cx="100" [attr.cy]="logo.creux.cy" [attr.r]="logo.creux.r" fill="#000" />
              </mask>
            </defs>
            <!-- Le croissant du logo, qui s'efface pendant que le petit rond devient ta lune -->
            <circle cx="100" [attr.cy]="logo.coupe.cy" [attr.r]="logo.coupe.r" class="eclairee" mask="url(#lune-creux)"
                    [style.opacity]="etat().croissant" [style.transform]="'translateY(' + (1 - etat().croissant) * 14 + 'px)'" />
            <circle cx="100" [attr.cy]="etat().cy" [attr.r]="etat().r" class="contour" [style.stroke-opacity]="etat().contour" />
            <path [attr.d]="etat().chemin" class="eclairee" />
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
  protected readonly logo = LOGO;
  protected readonly etat = signal(this.calculer(0, 0, 1, 1));
  private image = 0;

  constructor() {
    effect(() => {
      const l = this.service.lune();
      cancelAnimationFrame(this.image);
      if (!l) return;
      this.animer(l.de, l.vers);
    });
  }

  /**
   * montee : 0 = logo (petit rond plein dans le croissant), 1 = le rond est devenu la lune.
   * Pendant la montée, le rond prend la phase de départ ; ensuite seulement il grandit jusqu'à la nouvelle phase.
   */
  private calculer(montee: number, croissance: number, de: number, vers: number) {
    const m = easeInOut(montee);
    const cy = LOGO.rond.cy + (LUNE.cy - LOGO.rond.cy) * m;
    const r = LOGO.rond.r + (LUNE.r - LOGO.rond.r) * m;
    const f = croissance > 0 ? de + (vers - de) * easeInOut(croissance) : 1 + (de - 1) * m;
    return { cy, r, chemin: cheminPhase(f, cy, r), croissant: 1 - m, contour: 0.25 * m };
  }

  private animer(de: number, vers: number): void {
    const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    // 0,6 s de logo, 1 s de montée, puis 1,1 s pour passer à la nouvelle phase
    const [pause, montee, croissance] = reduit ? [0, 1, 1] : [600, 1000, 1100];
    const pas = (t: number) => {
      const e = t - t0;
      const m = Math.min(1, Math.max(0, (e - pause) / montee));
      const c = Math.min(1, Math.max(0, (e - pause - montee) / croissance));
      this.etat.set(this.calculer(m, c, de, vers));
      if (c < 1) this.image = requestAnimationFrame(pas);
    };
    this.etat.set(this.calculer(0, 0, de, vers));
    this.image = requestAnimationFrame(pas);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.image);
  }
}
