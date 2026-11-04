import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Encouragement, ObjectifCommun, TypeEncouragement } from '../../api/generated';
import { AmisService } from '../../application/services';
import { BoiteService } from '../../core/boite.service';
import { NavigationService } from '../../core/navigation.service';
import { NotificationsService } from '../../core/notifications.service';
import { ENCOURAGEMENTS } from '../foyer/foyer.page';

/** La boîte : invitations et demandes pour faire un objectif à deux, encouragements reçus. */
@Component({
  selector: 'app-notifications',
  imports: [Button],
  template: `
    <header class="entete entete-assistant">
      <p-button icon="pi pi-arrow-left" [text]="true" ariaLabel="Retour" (onClick)="navigation.retour()" />
      <div><h1>Notifications</h1></div>
    </header>

    @for (c of boite.invitations(); track c.id) {
      <section class="invitation" aria-label="Invitation">
        @if (c.demande) {
          <p><strong>{{ c.ami }}</strong> aimerait faire ton objectif « {{ c.nom }} » avec toi, {{ frequence(c) }}.</p>
        } @else {
          <p><strong>{{ c.ami }}</strong> te propose de faire « {{ c.nom }} » ensemble, {{ frequence(c) }}.</p>
        }
        <small class="aide">Vous aurez une flamme commune : elle ne monte que si vous le faites tous les deux.</small>
        <div class="actions">
          <p-button label="Refuser" [text]="true" severity="secondary" (onClick)="refuser(c)" />
          <p-button label="On le fait ensemble" icon="pi pi-check" [loading]="enCours() === c.id" (onClick)="accepter(c)" />
        </div>
      </section>
    }

    @for (e of encouragements(); track e.id) {
      <div class="notif-encouragement"><i class="pi pi-heart"></i><span><strong>{{ e.de }}</strong> t'encourage : {{ texte(e.type) }} !</span></div>
    }

    @if (boite.invitations().length === 0 && encouragements().length === 0) {
      <p class="aide vide-notif">Rien de nouveau. Les invitations de tes amis et les encouragements de tes groupes arriveront ici.</p>
    }
  `,
})
export class NotificationsPage implements OnInit, OnDestroy {
  protected readonly boite = inject(BoiteService);
  protected readonly navigation = inject(NavigationService);
  private readonly amis = inject(AmisService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationsService);
  /** Encouragements affichés pendant la visite (ils sont marqués lus en arrivant). */
  protected readonly encouragements = signal<Encouragement[]>(this.boite.encouragements());
  protected readonly enCours = signal<number | null>(null);

  ngOnInit(): void {
    this.boite.charger(() => {
      // Les encouragements restent affichés pendant la visite, et sont marqués lus
      this.encouragements.set(this.boite.encouragements());
      this.boite.lireEncouragements();
    });
  }

  ngOnDestroy(): void {
    this.boite.encouragements.set([]);
  }

  protected frequence(c: ObjectifCommun): string {
    return c.typeFrequence === 'QUOTIDIEN' ? 'tous les jours' : `${c.cible} fois par semaine`;
  }

  protected texte(type: TypeEncouragement): string {
    return ENCOURAGEMENTS.find((e) => e.type === type)?.texte ?? type;
  }

  accepter(c: ObjectifCommun): void {
    this.enCours.set(c.id);
    this.amis.accepterCommun(c.id).subscribe({
      next: (id) => {
        this.boite.retirerInvitation(c.id);
        this.notifications.synchroniser();
        void this.router.navigate(['/objectifs', id]);
      },
      error: () => this.enCours.set(null),
    });
  }

  refuser(c: ObjectifCommun): void {
    this.amis.quitterCommun(c.id).subscribe(() => this.boite.retirerInvitation(c.id));
  }
}
