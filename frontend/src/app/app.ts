import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { filter, map } from 'rxjs';
import { NavigationService, ONGLETS } from './core/navigation.service';
import { NotificationsService } from './core/notifications.service';
import { CelebrationOverlay } from './shared/celebration-overlay';
import { Onglets } from './shared/onglets';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast, CelebrationOverlay, Onglets],
  template: `
    <p-toast position="top-center" />
    <main class="page" [class.avec-onglets]="ongletsVisibles()"><router-outlet /></main>
    @if (ongletsVisibles()) {
      <app-onglets />
    }
    <app-celebration />
  `,
})
export class App {
  private readonly router = inject(Router);
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
  }
}
