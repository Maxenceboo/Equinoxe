import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Badge, Profil } from '../../api/generated';
import { ProfilService } from '../../application/services';
import { NavigationService } from '../../core/navigation.service';
import { BadgeIcone } from '../../shared/badge-icone';

/** Les badges : touche un badge pour savoir comment le gagner. */
@Component({
  selector: 'app-badges',
  imports: [Button, Dialog, BadgeIcone],
  template: `
    <header class="entete entete-assistant">
      <p-button icon="pi pi-arrow-left" [text]="true" ariaLabel="Retour" (onClick)="navigation.retour()" />
      <div><h1>Badges</h1><small>{{ obtenus() }} sur {{ profil()?.badges?.length ?? 6 }} gagnés</small></div>
    </header>

    @if (profil(); as p) {
      <ul class="badges">
        @for (b of p.badges; track b.code) {
          <li>
            <button type="button" class="badge" [class.obtenu]="b.obtenu" (click)="enDetail.set(b)">
              <app-badge-icone [code]="b.code" [obtenu]="b.obtenu" />
              <span>{{ b.nom }}</span>
            </button>
          </li>
        }
      </ul>
    }

    <p-dialog [header]="enDetail()?.nom ?? ''" [visible]="enDetail() !== null" (visibleChange)="!$event && enDetail.set(null)" [modal]="true" [dismissableMask]="true" [style]="{ width: '22rem' }">
      @if (enDetail(); as b) {
        <div class="badge-detail">
          <app-badge-icone [code]="b.code" [obtenu]="b.obtenu" />
          <p>{{ b.description }}</p>
          <p class="aide">Rapporte : {{ b.recompense }}</p>
          @if (b.obtenu) {
            <p class="aide">Obtenu{{ b.le ? ' le ' + date(b.le) : '' }}.</p>
          } @else {
            <p class="aide">Pas encore obtenu.</p>
          }
        </div>
      }
    </p-dialog>
  `,
})
export class BadgesPage implements OnInit {
  protected readonly navigation = inject(NavigationService);
  private readonly api = inject(ProfilService);
  protected readonly profil = signal<Profil | null>(this.api.dernier());
  protected readonly enDetail = signal<Badge | null>(null);
  protected readonly obtenus = computed(() => this.profil()?.badges.filter((b) => b.obtenu).length ?? 0);

  ngOnInit(): void {
    this.api.profil().subscribe((p) => this.profil.set(p));
  }

  protected date(jour: string): string {
    return new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
