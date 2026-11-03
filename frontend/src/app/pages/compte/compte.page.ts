import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { HorsLigneService } from '../../core/hors-ligne.service';
import { NotificationsService } from '../../core/notifications.service';
import { SessionService } from '../../core/session.service';
import { SonsService } from '../../core/sons.service';

/** Compte : réglages, objectifs archivés et déconnexion (rangés ici pour ne pas encombrer la semaine). */
@Component({
  selector: 'app-compte',
  imports: [RouterLink, Button],
  template: `
    <header class="entete">
      <div>
        <h1>Compte</h1>
        <small>{{ session.email() }}</small>
      </div>
    </header>

    <ul class="reglages">
      <li>
        <button type="button" class="reglage" (click)="sons.basculer()">
          <i [class]="sons.actif() ? 'pi pi-volume-up' : 'pi pi-volume-off'"></i>
          <span>Sons</span>
          <small>{{ sons.actif() ? 'Activés' : 'Coupés' }}</small>
        </button>
      </li>
      <li>
        <a class="reglage" routerLink="/compte/archives">
          <i class="pi pi-inbox"></i>
          <span>Objectifs archivés</span>
          <i class="pi pi-chevron-right"></i>
        </a>
      </li>
    </ul>

    @if (confirmation()) {
      <div class="confirmation">
        <p>Te déconnecter ? Les rappels de ce téléphone seront supprimés.</p>
        <div class="actions">
          <p-button label="Annuler" [outlined]="true" (onClick)="confirmation.set(false)" />
          <p-button label="Se déconnecter" severity="danger" [loading]="enCours()" (onClick)="deconnecter()" />
        </div>
      </div>
    } @else {
      <p-button class="deconnexion" label="Se déconnecter" icon="pi pi-sign-out" [text]="true" severity="danger" (onClick)="confirmation.set(true)" />
    }
  `,
})
export class ComptePage {
  protected readonly session = inject(SessionService);
  protected readonly sons = inject(SonsService);
  private readonly horsLigne = inject(HorsLigneService);
  private readonly notifications = inject(NotificationsService);
  private readonly router = inject(Router);
  protected readonly confirmation = signal(false);
  protected readonly enCours = signal(false);

  async deconnecter(): Promise<void> {
    this.enCours.set(true);
    await this.notifications.toutAnnuler();
    this.horsLigne.oublier();
    await this.session.fermer();
    void this.router.navigate(['/connexion'], { replaceUrl: true });
  }
}
