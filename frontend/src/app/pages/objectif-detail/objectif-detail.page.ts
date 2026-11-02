import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Historique, Objectif, ObjectifsService } from '../../api/generated';
import { NotificationsService } from '../../core/notifications.service';
import { aujourdhui, formatDate, joursDuMois, moisDecale, nomDuMois } from '../../shared/dates';

@Component({
  selector: 'app-objectif-detail',
  imports: [RouterLink, Button, PercentPipe, DecimalPipe],
  template: `
    <header class="entete">
      <p-button icon="pi pi-arrow-left" [text]="true" ariaLabel="Retour" routerLink="/" />
      <h1>{{ objectif()?.nom }}</h1>
      <p-button icon="pi pi-pencil" [text]="true" ariaLabel="Modifier" [routerLink]="['/objectifs', id(), 'modifier']" />
    </header>

    @if (historique(); as h) {
      <section class="stats">
        <div><strong>{{ h.serieSemaines }}</strong><span>semaine(s) d'affilée</span></div>
        <div><strong>{{ h.meilleureSerie }}</strong><span>meilleure série</span></div>
        <div><strong>{{ h.tauxReussite | percent: '1.0-0' }}</strong><span>semaines réussies</span></div>
      </section>

      <section class="calendrier" [style.--couleur]="objectif()?.couleur">
        <div class="mois">
          <p-button icon="pi pi-chevron-left" [text]="true" ariaLabel="Mois précédent" (onClick)="changerMois(-1)" />
          <span>{{ titreMois() }}</span>
          <p-button icon="pi pi-chevron-right" [text]="true" ariaLabel="Mois suivant" (onClick)="changerMois(1)" />
        </div>
        <div class="grille">
          @for (j of ['L', 'M', 'M', 'J', 'V', 'S', 'D']; track $index) {
            <span class="jour-semaine">{{ j }}</span>
          }
          @for (case of cases(); track $index) {
            @if (case) {
              <button
                type="button"
                class="jour"
                [class.fait]="faits().has(case)"
                [class.aujourdhui]="case === auj"
                [disabled]="case > auj"
                [attr.aria-label]="case"
                (click)="basculer(case)"
              >
                {{ +case.slice(8) | number }}
              </button>
            } @else {
              <span></span>
            }
          }
        </div>
        <small class="aide">Touche un jour passé pour le cocher ou le décocher.</small>
      </section>

      <p-button label="Archiver cet objectif" icon="pi pi-inbox" severity="secondary" [text]="true" (onClick)="archiver()" />
    }
  `,
})
export class ObjectifDetailPage implements OnInit {
  readonly id = input.required<string>();

  private readonly api = inject(ObjectifsService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationsService);

  protected readonly auj = aujourdhui();
  protected readonly objectif = signal<Objectif | null>(null);
  protected readonly historique = signal<Historique | null>(null);
  protected readonly mois = signal(this.auj.slice(0, 7));
  protected readonly titreMois = computed(() => nomDuMois(this.mois()));
  protected readonly cases = computed(() => joursDuMois(this.mois()));
  protected readonly faits = computed(() => new Set(this.historique()?.validations.map((v) => v.date) ?? []));

  ngOnInit(): void {
    this.api.lireObjectif(Number(this.id())).subscribe((o) => this.objectif.set(o));
    this.chargerHistorique();
  }

  changerMois(delta: number): void {
    this.mois.set(moisDecale(this.mois(), delta));
    this.chargerHistorique();
  }

  basculer(date: string): void {
    const id = Number(this.id());
    const appel = this.faits().has(date) ? this.api.annulerValidation(id, date) : this.api.validerObjectif(id, { date });
    appel.subscribe((o) => {
      this.objectif.set(o);
      this.chargerHistorique();
      this.notifications.synchroniser();
    });
  }

  archiver(): void {
    this.api.archiverObjectif(Number(this.id())).subscribe(() => {
      this.notifications.synchroniser();
      this.router.navigate(['/']);
    });
  }

  private chargerHistorique(): void {
    this.api.historiqueObjectif(Number(this.id()), this.mois()).subscribe((h) => this.historique.set(h));
  }

  protected readonly formatDate = formatDate;
}
