import { Component } from '@angular/core';
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
      <a routerLink="/bilan" routerLinkActive="actif" [replaceUrl]="true">
        <i class="pi pi-chart-bar"></i><span>Bilan</span>
      </a>
      <a routerLink="/compte" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: true }" [replaceUrl]="true">
        <i class="pi pi-user"></i><span>Compte</span>
      </a>
    </nav>
  `,
})
export class Onglets {}
