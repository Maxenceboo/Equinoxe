import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AmisService } from '../application/services';
import { SessionService } from './session.service';

const CLE = 'equinoxe.invitation';

export interface Invitation {
  type: 'ami' | 'groupe';
  code: string;
}

/** Lien à partager pour se faire ajouter en ami. */
export function lienAmi(pseudo: string): string {
  return `https://equinoxe-app.fr/invite/?ami=${encodeURIComponent(pseudo)}`;
}

/**
 * Lit ?ami=identifiant ou ?groupe=CODE (lien equinoxe-app.fr/invite/…) et nettoie la valeur.
 * Les anciens liens avec un code ami à 6 caractères restent acceptés (le serveur cherche les deux).
 */
export function lireInvitation(params: URLSearchParams | Record<string, string | undefined>): Invitation | null {
  const lire = (k: string) => (params instanceof URLSearchParams ? params.get(k) : params[k]) ?? '';
  const ami = lire('ami').trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20);
  if (ami.length >= 3) return { type: 'ami', code: ami };
  const groupe = lire('groupe').replace(/\D/g, '').slice(0, 6);
  if (groupe.length === 6) return { type: 'groupe', code: groupe };
  return null;
}

/**
 * Liens d'invitation : l'invitation est gardée sur le téléphone le temps de se connecter ou de s'inscrire,
 * puis traitée (ami ajouté tout de suite, ou formulaire du groupe prérempli).
 */
@Injectable({ providedIn: 'root' })
export class InvitationService {
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly amis = inject(AmisService);
  private readonly messages = inject(MessageService);

  garder(invitation: Invitation): void {
    try {
      localStorage.setItem(CLE, JSON.stringify(invitation));
    } catch {
      /* stockage indisponible : l'invitation sera traitée seulement si on est déjà connecté */
    }
  }

  private enAttente(): Invitation | null {
    try {
      const brut = localStorage.getItem(CLE);
      return brut ? (JSON.parse(brut) as Invitation) : null;
    } catch {
      return null;
    }
  }

  private oublier(): void {
    try {
      localStorage.removeItem(CLE);
    } catch {
      /* rien */
    }
  }

  /** Traite l'invitation en attente si on est connecté. Renvoie true si quelque chose a été fait. */
  traiter(): boolean {
    const inv = this.enAttente();
    if (!inv || !this.session.connecte()) return false;
    this.oublier();
    if (inv.type === 'groupe') {
      void this.router.navigate(['/foyer'], { queryParams: { rejoindre: inv.code } });
      return true;
    }
    this.amis.ajouter(inv.code).subscribe({
      next: (nom) => {
        this.messages.add({ severity: 'success', summary: `${nom} est ton ami`, detail: 'Vous voyez maintenant vos objectifs visibles.' });
        void this.router.navigate(['/foyer']);
      },
      error: () => undefined,
    });
    return true;
  }
}
