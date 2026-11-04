import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { filter, map } from 'rxjs';
import { NavigationService, ONGLETS } from './core/navigation.service';
import { MiseAJourService } from './core/mise-a-jour.service';
import { NotificationsService } from './core/notifications.service';
import { PushService } from './core/push.service';
import { ReglagesService } from './core/reglages.service';
import { CelebrationOverlay } from './shared/celebration-overlay';
import { LuneOverlay } from './shared/lune-overlay';
import { Onglets } from './shared/onglets';
import { VERSION } from './version';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast, CelebrationOverlay, LuneOverlay, Onglets],
  template: `
    <p-toast position="top-center" />
    @if (miseAJour.disponible(); as version) {
      <div class="bandeau-maj" role="status">
        <span>La version {{ version }} est disponible.</span>
        <button type="button" class="lien-fort" (click)="miseAJour.telecharger()">Mettre à jour</button>
        <button type="button" class="fermer" aria-label="Plus tard" (click)="miseAJour.ignorer()"><i class="pi pi-times"></i></button>
      </div>
    }
    <main class="page" [class.avec-onglets]="ongletsVisibles()"><router-outlet /></main>
    @if (ongletsVisibles()) {
      <app-onglets />
    }
    <app-celebration />
    <app-lune />
    @if (lancement() !== 'fini') {
      <!-- Prolonge l'écran de démarrage d'Android (même logo, même place), avec la version dans un coin -->
      <div class="lancement" [class.part]="lancement() === 'part'" aria-hidden="true">
        <svg viewBox="0 0 100 100"><mask id="lancement-m"><rect width="100" height="100" fill="#fff"/><circle cx="50" cy="42" r="27" fill="#000"/></mask><circle cx="50" cy="52" r="32" fill="#fff" mask="url(#lancement-m)"/><circle cx="50" cy="58" r="11" fill="#fff"/></svg>
        <strong>Équinoxe</strong>
        <small class="version">v{{ version }}</small>
      </div>
    }
  `,
})
export class App {
  private readonly router = inject(Router);
  protected readonly miseAJour = inject(MiseAJourService);
  protected readonly ongletsVisibles = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => (ONGLETS as readonly string[]).includes(e.urlAfterRedirects.split(/[?#]/)[0])),
    ),
    { initialValue: false },
  );

  protected readonly version = VERSION;
  protected readonly lancement = signal<'visible' | 'part' | 'fini'>('visible');

  constructor() {
    setTimeout(() => this.lancement.set('part'), 900);
    setTimeout(() => this.lancement.set('fini'), 1300);
    inject(NotificationsService).ecouterOuvertures();
    inject(NavigationService).ecouterBoutonRetour();
    inject(ReglagesService);
    void inject(PushService).demarrer();
    void this.miseAJour.verifier();
  }
}
