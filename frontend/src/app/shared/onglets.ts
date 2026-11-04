import { Component, inject } from '@angular/core';
import { AmisService } from '../application/services';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Barre d'onglets en bas des écrans principaux. */
@Component({
  selector: 'app-onglets',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="onglets" aria-label="Navigation principale">
      <a routerLink="/" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: true }" [replaceUrl]="true">
        <i class="pi pi-calendar"></i><span>Semaine</span>
      </a>
      <a routerLink="/foyer" routerLinkActive="actif" [replaceUrl]="true">
        <i class="pi pi-users"></i><span>Proches</span>
        @if (amis.aRepondre() > 0) {
          <b class="pastille" [attr.aria-label]="amis.aRepondre() + ' invitation(s) en attente'">{{ amis.aRepondre() }}</b>
        }
      </a>
      <a routerLink="/bilan" routerLinkActive="actif" [replaceUrl]="true">
        <i class="pi pi-chart-bar"></i><span>Bilan</span>
      </a>
      <a routerLink="/profil" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: true }" [replaceUrl]="true">
        <i class="pi pi-user"></i><span>Profil</span>
      </a>
    </nav>
  `,
})
export class Onglets {
  protected readonly amis = inject(AmisService);
}
