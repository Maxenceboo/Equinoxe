import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { filter } from 'rxjs';

/** Écrans principaux, accessibles par la barre d'onglets. */
export const ONGLETS = ['/', '/foyer', '/bilan', '/profil'] as const;

/** Écran logique « au-dessus » d'une adresse, quand on n'a pas d'historique (ouverture par notification…). */
export function parent(url: string): string {
  const chemin = url.split(/[?#]/)[0];
  const modifier = chemin.match(/^\/objectifs\/(\d+)\/modifier$/);
  if (modifier) return `/objectifs/${modifier[1]}`;
  if (chemin === '/profil/archives') return '/profil';
  if (/^\/foyer\/\d+$/.test(chemin)) return '/foyer';
  if (chemin === '/objectifs/nouveau/avance') return '/objectifs/nouveau';
  return '/';
}

/**
 * Pile de navigation de l'app, indépendante de l'historique du navigateur : la flèche retour et le
 * bouton retour d'Android ramènent toujours à l'écran d'où l'on vient (ou à l'écran parent), jamais à
 * un formulaire déjà enregistré ni à la page de connexion.
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly router = inject(Router);
  private pile: string[] = [];

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.noter(e.urlAfterRedirects));
  }

  /** Branche le bouton retour d'Android (à appeler une fois au démarrage). */
  ecouterBoutonRetour(): void {
    if (!Capacitor.isNativePlatform()) return;
    void App.addListener('backButton', () => this.boutonRetour());
  }

  retour(): void {
    const actuelle = this.actuelle();
    const cible = this.pile.length > 1 ? this.pile[this.pile.length - 2] : parent(actuelle);
    void this.router.navigateByUrl(cible, { replaceUrl: true });
  }

  /** Comportement du bouton retour d'Android. */
  boutonRetour(): void {
    // Une fenêtre ouverte se ferme d'abord
    if (document.querySelector('.p-dialog-mask')) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return;
    }
    const actuelle = this.actuelle();
    if (actuelle === '/' || actuelle === '/connexion') {
      void App.minimizeApp();
      return;
    }
    if ((ONGLETS as readonly string[]).includes(actuelle)) {
      void this.router.navigateByUrl('/', { replaceUrl: true });
      return;
    }
    this.retour();
  }

  private actuelle(): string {
    return this.router.url.split(/[?#]/)[0];
  }

  private noter(url: string): void {
    const chemin = url.split(/[?#]/)[0];
    if (chemin === '/connexion') this.pile = [];
    else if (chemin === '/') this.pile = ['/'];
    else if ((ONGLETS as readonly string[]).includes(chemin)) this.pile = ['/', chemin];
    else if (this.pile.length > 1 && this.pile[this.pile.length - 2] === chemin) this.pile.pop();
    else if (this.pile[this.pile.length - 1] !== chemin) {
      // Retour sur un écran déjà dans la pile : on coupe au-dessus de lui
      const i = this.pile.indexOf(chemin);
      if (i >= 0) this.pile = this.pile.slice(0, i + 1);
      else this.pile.push(chemin);
    }
  }
}
