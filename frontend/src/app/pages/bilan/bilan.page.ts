import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Bilan, LigneBilan } from '../../api/generated';
import { BilanService, ObjectifsService } from '../../application/services';
import { NotificationsService } from '../../core/notifications.service';
import { aujourdhui, formatDate, libelleSemaine } from '../../shared/dates';
import { Flamme } from '../../shared/flamme';
import { nombre, saisieDe, unite } from '../../shared/objectifs';

/** Bilan de la semaine : ouvert par la notification du dimanche soir ou depuis l'accueil. */
@Component({
  selector: 'app-bilan',
  imports: [RouterLink, Button, Flamme],
  template: `
    <header class="entete">
      <p-button icon="pi pi-arrow-left" [text]="true" ariaLabel="Retour" routerLink="/" />
      <div>
        <h1>Bilan</h1>
        <small>{{ titre() }}</small>
      </div>
      <div class="outils">
        <p-button icon="pi pi-chevron-left" [text]="true" ariaLabel="Semaine précédente" (onClick)="decaler(-1)" />
        <p-button icon="pi pi-chevron-right" [text]="true" ariaLabel="Semaine suivante" [disabled]="estCourante()" (onClick)="decaler(1)" />
      </div>
    </header>

    @if (bilan(); as b) {
      <section class="bilan-resume">
        <strong>{{ b.tenus }}<span>/{{ b.total }}</span></strong>
        <span class="etiquette">objectifs tenus</span>
        <p>{{ b.phrase }}</p>
        <div class="comparaison">
          <div><strong>{{ b.seances }}</strong><small>coches cette semaine</small></div>
          <div><strong>{{ b.seancesSemainePrecedente }}</strong><small>la semaine d'avant</small></div>
        </div>
      </section>

      <ul class="objectifs bilan-lignes">
        @for (l of b.lignes; track l.objectifId) {
          <li class="objectif" [class.atteint]="l.atteint">
            <a class="infos" [routerLink]="['/objectifs', l.objectifId]">
              <div class="ligne-haut">
                <span class="nom">{{ l.nom }}</span>
                <app-flamme [valeur]="l.serie" [unite]="l.uniteSerie" />
              </div>
              <div class="segments" aria-hidden="true">
                @for (plein of segments(l); track $index) {
                  <i [class.plein]="plein"></i>
                }
              </div>
              <div class="ligne-bas">
                <small class="message">
                  {{ l.atteint ? 'Tenu' : 'Pas cette fois' }}@if (l.quantite != null) { · {{ nombre(l.quantite) }} {{ unite(l.mesure) }} }
                </small>
                <span class="compteur">{{ l.realisees }}<span>/{{ l.cible }}</span></span>
              </div>
            </a>
            @if (l.atteint) {
              <span class="coche fait statique" aria-label="Tenu">
                <svg class="coche-trait" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </span>
            }
          </li>
          @if (l.suggestion && !acceptees().has(l.objectifId)) {
            <li class="conseil">
              <p>{{ l.suggestion.raison }}</p>
              <div class="actions">
                <p-button [label]="'Passer à ' + l.suggestion.nouvelleCible + ' par semaine'" (onClick)="accepter(l)" />
              </div>
            </li>
          }
        } @empty {
          <li class="aide">Aucun objectif sur cette semaine.</li>
        }
      </ul>
    }
  `,
})
export class BilanPage implements OnInit {
  private readonly api = inject(BilanService);
  private readonly objectifs = inject(ObjectifsService);
  private readonly notifications = inject(NotificationsService);

  protected readonly bilan = signal<Bilan | null>(null);
  protected readonly acceptees = signal(new Set<number>());
  protected readonly titre = computed(() => {
    const b = this.bilan();
    return b ? libelleSemaine(new Date(b.debutSemaine + 'T12:00')) : '';
  });
  protected readonly estCourante = computed(() => {
    const b = this.bilan();
    if (!b) return true;
    const lundi = new Date(b.debutSemaine + 'T12:00');
    lundi.setDate(lundi.getDate() + 7);
    return formatDate(lundi) > aujourdhui();
  });
  protected readonly nombre = nombre;
  protected readonly unite = unite;

  ngOnInit(): void {
    this.charger();
  }

  decaler(semaines: number): void {
    const b = this.bilan();
    if (!b) return;
    const d = new Date(b.debutSemaine + 'T12:00');
    d.setDate(d.getDate() + 7 * semaines);
    this.charger(formatDate(d));
  }

  protected segments(l: LigneBilan): boolean[] {
    return Array.from({ length: l.cible }, (_, i) => i < l.realisees);
  }

  accepter(l: LigneBilan): void {
    const cible = l.suggestion?.nouvelleCible;
    if (!cible) return;
    this.objectifs.lireObjectif(l.objectifId).subscribe((o) =>
      this.objectifs.modifierObjectif(o.id, saisieDe(o, { cible })).subscribe(() => {
        this.acceptees.update((s) => new Set(s).add(l.objectifId));
        this.notifications.synchroniser();
      }),
    );
  }

  private charger(jour?: string): void {
    this.api.bilanSemaine(jour).subscribe((b) => this.bilan.set(b));
  }
}
