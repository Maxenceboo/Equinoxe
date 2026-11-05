import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Encouragement, ObjectifCommun, TypeEncouragement } from '../../api/generated';
import { AmisService } from '../../application/services';
import { BoiteService } from '../../core/boite.service';
import { NavigationService } from '../../core/navigation.service';
import { NotificationsService } from '../../core/notifications.service';
import { ENCOURAGEMENTS } from '../foyer/foyer.page';
import { Avatar } from '../../shared/avatar';

/** La boîte : invitations et demandes pour faire un objectif à deux, encouragements reçus. */
@Component({
  selector: 'app-notifications',
  imports: [Button, Avatar],
  template: `
    <header class="entete entete-assistant">
      <p-button icon="pi pi-arrow-left" [text]="true" ariaLabel="Retour" (onClick)="navigation.retour()" />
      <div><h1>Notifications</h1></div>
    </header>

    @for (d of boite.amisEnAttente(); track d.id) {
      <section class="invitation demande-ami" aria-label="Demande d'ami">
        <app-avatar [id]="d.id" [nom]="d.nom" [taille]="2.5" />
        <p><strong>{{ d.nom }}</strong> veut être ton ami.</p>
        <div class="actions">
          <p-button label="Refuser" [text]="true" severity="secondary" (onClick)="repondreAmi(d.id, false)" />
          <p-button label="Accepter" icon="pi pi-check" (onClick)="repondreAmi(d.id, true)" />
        </div>
      </section>
    }

    @for (c of boite.invitations(); track c.id) {
      <section class="invitation" aria-label="Invitation">
        <p><strong>{{ c.ami }}</strong> te propose de faire « {{ c.nom }} » ensemble, {{ frequence(c) }}.</p>
        <small class="aide">Vous aurez une flamme commune : elle ne monte que si tout le monde le fait.</small>
        <div class="actions">
          <p-button label="Refuser" [text]="true" severity="secondary" (onClick)="refuser(c)" />
          <p-button label="On le fait ensemble" icon="pi pi-check" [loading]="enCours() === c.id" (onClick)="accepter(c)" />
        </div>
      </section>
    }

    @for (d of boite.demandes(); track d.commun.id + d.membre.id) {
      <section class="invitation" aria-label="Demande">
        <p><strong>{{ d.membre.nom }}</strong> aimerait faire « {{ d.commun.nom }} » avec {{ d.commun.membres.length > 1 ? 'vous' : 'toi' }}.</p>
        <small class="aide">La flamme commune ne montera que si tout le monde le fait.</small>
        <div class="actions">
          <p-button label="Refuser" [text]="true" severity="secondary" (onClick)="refuserDemande(d.commun, d.membre.id)" />
          <p-button label="Accepter" icon="pi pi-check" [loading]="enCours() === d.commun.id" (onClick)="accepterDemande(d.commun, d.membre.id)" />
        </div>
      </section>
    }

    @for (e of encouragements(); track e.id) {
      <div class="notif-encouragement"><i class="pi pi-heart"></i><span><strong>{{ e.de }}</strong> t'encourage : {{ texte(e.type) }} !</span></div>
    }

    @if (boite.amisEnAttente().length === 0 && boite.invitations().length === 0 && boite.demandes().length === 0 && encouragements().length === 0) {
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

  accepterDemande(c: ObjectifCommun, membre: string): void {
    this.enCours.set(c.id);
    this.amis.accepterCommun(c.id, membre).subscribe({
      next: (id) => {
        this.boite.retirerDemande(c.id, membre);
        void this.router.navigate(['/objectifs', id]);
      },
      error: () => this.enCours.set(null),
    });
  }

  refuserDemande(c: ObjectifCommun, membre: string): void {
    this.amis.quitterCommun(c.id, membre).subscribe(() => this.boite.retirerDemande(c.id, membre));
  }

  repondreAmi(id: string, accepter: boolean): void {
    this.boite.retirerAmi(id);
    this.amis.repondre(id, accepter).subscribe({ error: () => this.boite.charger() });
  }

  refuser(c: ObjectifCommun): void {
    this.amis.quitterCommun(c.id).subscribe(() => this.boite.retirerInvitation(c.id));
  }
}
