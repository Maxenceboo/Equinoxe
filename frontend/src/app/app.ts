import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { filter, map } from 'rxjs';
import { NavigationService, ONGLETS } from './core/navigation.service';
import { MiseAJourService } from './core/mise-a-jour.service';
import { NotificationsService } from './core/notifications.service';
import { ReglagesService } from './core/reglages.service';
import { CelebrationOverlay } from './shared/celebration-overlay';
import { Onglets } from './shared/onglets';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast, CelebrationOverlay, Onglets],
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

  constructor() {
    inject(NotificationsService).ecouterOuvertures();
    inject(NavigationService).ecouterBoutonRetour();
    inject(ReglagesService);
    void this.miseAJour.verifier();
  }
}
