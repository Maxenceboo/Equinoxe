import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { InvitationService, lireInvitation } from '../../core/invitation.service';

/** Arrivée par un lien d'invitation : on garde l'invitation, puis on passe par la connexion si besoin. */
@Component({
  selector: 'app-invite',
  template: `<p class="aide" style="padding: 2rem 1rem">Ouverture de l'invitation…</p>`,
})
export class InvitePage implements OnInit {
  private readonly router = inject(Router);
  private readonly invitations = inject(InvitationService);

  ngOnInit(): void {
    const inv = lireInvitation(new URLSearchParams(location.search));
    if (inv) this.invitations.garder(inv);
    if (!this.invitations.traiter()) void this.router.navigateByUrl('/', { replaceUrl: true });
  }
}
