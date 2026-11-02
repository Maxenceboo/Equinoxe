import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { NotificationsService } from './core/notifications.service';
import { CelebrationOverlay } from './shared/celebration-overlay';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast, CelebrationOverlay],
  template: `
    <p-toast position="top-center" />
    <main class="page"><router-outlet /></main>
    <app-celebration />
  `,
})
export class App {
  constructor() {
    inject(NotificationsService).ecouterOuvertures();
  }
}
