import { Injectable, computed, inject, signal } from '@angular/core';
import { Encouragement, ObjectifCommun } from '../api/generated';
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
  readonly encouragements = signal<Encouragement[]>([]);
  readonly nombre = computed(() => this.invitations().length + this.encouragements().length);

  charger(apresEncouragements?: () => void): void {
    this.amis.communs().subscribe({ next: (l) => this.invitations.set(l.filter((c) => c.statut === 'RECUE')), error: () => undefined });
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

  /** Les encouragements sont lus dès qu'on ouvre la boîte. */
  lireEncouragements(): void {
    const ids = this.encouragements().map((e) => e.id);
    if (ids.length) this.foyer.marquerVus(ids).subscribe({ error: () => undefined });
  }

  vider(): void {
    this.invitations.set([]);
    this.encouragements.set([]);
  }
}
