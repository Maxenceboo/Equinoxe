import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BoiteService } from '../core/boite.service';

/** Cloche des notifications, avec le nombre d'invitations et d'encouragements en attente. */
@Component({
  selector: 'app-cloche',
  imports: [RouterLink],
  template: `
    <a class="cloche" routerLink="/notifications" [attr.aria-label]="boite.nombre() ? boite.nombre() + (boite.nombre() > 1 ? ' notifications' : ' notification') : 'Notifications'">
      <i class="pi pi-bell"></i>
      @if (boite.nombre() > 0) {
        <b class="pastille">{{ boite.nombre() }}</b>
      }
    </a>
  `,
})
export class Cloche {
  protected readonly boite = inject(BoiteService);
}
