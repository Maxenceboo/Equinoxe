import { Injectable, computed, inject, signal } from '@angular/core';
import { Encouragement, MembreCommun, ObjectifCommun } from '../api/generated';
import { AmisService, FoyerService } from '../application/services';

/**
 * Boîte de notifications : invitations et demandes pour faire un objectif à deux, encouragements reçus.
 * Une cloche en haut de l'accueil et de Proches en montre le nombre.
 */
@Injectable({ providedIn: 'root' })
export class BoiteService {
  private readonly amis = inject(AmisService);
  private readonly foyer = inject(FoyerService);
  readonly invitations = signal<ObjectifCommun[]>([]);
  /** Amis qui demandent à rejoindre un objectif que je fais (à plusieurs ou seul) */
  readonly demandes = signal<{ commun: ObjectifCommun; membre: MembreCommun }[]>([]);
  readonly encouragements = signal<Encouragement[]>([]);
  /** Demandes d'ami reçues */
  readonly amisEnAttente = signal<{ id: string; nom: string }[]>([]);
  readonly nombre = computed(() => this.invitations().length + this.demandes().length + this.encouragements().length + this.amisEnAttente().length);

  charger(apresEncouragements?: () => void): void {
    this.amis.communs().subscribe({
      next: (l) => {
        this.invitations.set(l.filter((c) => c.statut === 'RECUE'));
        this.demandes.set(
          l.filter((c) => c.statut === 'ACTIF').flatMap((c) => c.membres.filter((m) => m.statut === 'DEMANDE').map((membre) => ({ commun: c, membre }))),
        );
      },
      error: () => undefined,
    });
    this.amis.demandes().subscribe({ next: (l) => this.amisEnAttente.set(l.filter((d) => d.recue)), error: () => undefined });
    this.foyer.encouragementsRecus().subscribe({
      next: (l) => {
        this.encouragements.set(l);
        apresEncouragements?.();
      },
      error: () => undefined,
    });
  }

  retirerInvitation(id: number): void {
    this.invitations.update((l) => l.filter((c) => c.id !== id));
  }

  retirerAmi(id: string): void {
    this.amisEnAttente.update((l) => l.filter((d) => d.id !== id));
  }

  retirerDemande(id: number, membre: string): void {
    this.demandes.update((l) => l.filter((d) => !(d.commun.id === id && d.membre.id === membre)));
  }

  /** Les encouragements sont lus dès qu'on ouvre la boîte. */
  lireEncouragements(): void {
    const ids = this.encouragements().map((e) => e.id);
    if (ids.length) this.foyer.marquerVus(ids).subscribe({ error: () => undefined });
  }

  vider(): void {
    this.invitations.set([]);
    this.demandes.set([]);
    this.encouragements.set([]);
    this.amisEnAttente.set([]);
  }
}
