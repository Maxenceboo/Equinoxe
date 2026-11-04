import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NavigationService } from '../../core/navigation.service';
import { Button } from 'primeng/button';
import { Flamme } from '../../shared/flamme';
import { Historique, Objectif, Statistiques, TypeSeance } from '../../api/generated';
import { AmisService, ObjectifsService } from '../../application/services';
import schemas from '../../api/generated/schemas.json';
import { estChiffre, heureLisible, nombre, saisieDe, unite } from '../../shared/objectifs';
import { NotificationsService } from '../../core/notifications.service';
import { aujourdhui, formatDate, joursDuMois, moisDecale, nomDuMois } from '../../shared/dates';

@Component({
  selector: 'app-objectif-detail',
  imports: [RouterLink, Button, PercentPipe, DecimalPipe, Flamme],
  template: `
    <header class="entete">
      <p-button icon="pi pi-arrow-left" [text]="true" ariaLabel="Retour" (onClick)="navigation.retour()" />
      <h1>{{ objectif()?.nom }}</h1>
      <p-button icon="pi pi-pencil" [text]="true" ariaLabel="Modifier" [routerLink]="['/objectifs', id(), 'modifier']" />
    </header>

    @if (historique(); as h) {
      <section class="stats">
        @if (objectif(); as o) {
          <div class="serie-en-cours">
            <app-flamme [valeur]="o.progression.serie" [unite]="o.progression.uniteSerie" />
            <span>{{ o.progression.uniteSerie === 'JOURS' ? 'jour(s)' : 'semaine(s)' }} d'affilée</span>
          </div>
          <div>
            <strong>{{ o.progression.meilleureSerie }}</strong>
            <span>record</span>
          </div>
        }
        <div><strong>{{ h.tauxReussite | percent: '1.0-0' }}</strong><span>semaines réussies</span></div>
      </section>
      @if (objectif(); as o) {
        <p class="joker">
          <i class="pi pi-shield"></i>
          @if (o.progression.jokersRestants > 0) {
            Joker disponible ce mois-ci : {{ o.progression.uniteSerie === 'JOURS' ? 'un jour raté' : 'une semaine ratée' }}
            ne cassera pas ta série.
          } @else {
            Joker du mois déjà utilisé, il revient le mois prochain.
          }
        </p>
      }

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
                [disabled]="case !== auj"
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
        <small class="aide">Seul le jour même peut être coché ou décoché.</small>
      </section>

      @if (stats(); as st) {
        <section class="statistiques" aria-label="Statistiques">
          <p class="etiquette">Statistiques</p>
          <div class="tuiles">
            <div><strong>{{ st.totalSeances }}</strong><small>coches au total</small></div>
            <div><strong>{{ nombre(st.moyenneParSemaine) }}</strong><small>par semaine en moyenne</small></div>
            @if (chiffre(st.mesure)) {
              <div><strong>{{ nombre(st.totalQuantite) }}</strong><small>{{ unite(st.mesure) }} au total</small></div>
            } @else if (st.totalMinutes > 0) {
              <div><strong>{{ duree(st.totalMinutes) }}</strong><small>de sport noté</small></div>
            }
          </div>

          <p class="sous-etiquette">{{ chiffre(st.mesure) ? unite(st.mesure) + ' par mois' : 'Coches par mois' }}</p>
          <svg class="barres" viewBox="0 0 300 120" role="img" [attr.aria-label]="'Évolution sur 6 mois'">
            @for (b of barres(); track b.mois; let i = $index) {
              <rect [attr.x]="i * 50 + 12" [attr.y]="96 - b.hauteur" width="26" [attr.height]="b.hauteur || 1" rx="3"
                    [class.courant]="$last" />
              <text class="valeur" [attr.x]="i * 50 + 25" [attr.y]="90 - b.hauteur" text-anchor="middle">{{ b.valeur }}</text>
              <text class="mois-court" [attr.x]="i * 50 + 25" y="114" text-anchor="middle">{{ b.libelle }}</text>
            }
          </svg>

          @if (st.types.length > 0) {
            <p class="sous-etiquette">Séances les plus fréquentes</p>
            <ul class="types">
              @for (t of st.types.slice(0, 4); track t.type) {
                <li>
                  <span>{{ libelleType(t.type) }}</span>
                  <i [style.width.%]="(t.nombre / st.types[0].nombre) * 100"></i>
                  <strong>{{ t.nombre }}</strong>
                </li>
              }
            </ul>
          }
        </section>
      }

      @if (objectif(); as o) {
        @if (o.categorie !== 'SOMMEIL') {
          <p class="joker rappel">
            <i class="pi pi-bell"></i>
            @if (o.rappelAuto && o.heureHabituelle) {
              Tu le fais d'habitude vers {{ heure(o.heureHabituelle) }} : rappel à {{ heure(o.heureRappel) }}.
            } @else if (o.rappelAuto) {
              Rappel à {{ heure(o.heureRappel) }} pour l'instant. Après 5 coches faites le jour même, il se calera sur ton heure habituelle.
            } @else {
              Rappel à {{ heure(o.heureRappel) }}.
            }
          </p>
        }

        <section class="partage" aria-label="Amis">
          <p class="etiquette">Amis</p>
          <div class="code">
            <span>{{ o.visibleAmis ? 'Visible par mes amis' : 'Privé' }}</span>
            <p-button
              [label]="o.visibleAmis ? 'Rendre privé' : 'Montrer à mes amis'"
              [icon]="o.visibleAmis ? 'pi pi-lock' : 'pi pi-users'"
              [outlined]="true"
              [loading]="changeVisibilite()"
              (onClick)="basculerVisibilite(o)"
            />
          </div>
          @if (!o.visibleAmis) {
            <small class="aide">Seul toi le vois. Tes amis s'ajoutent avec ton code, sur la page Proches.</small>
          } @else if (voientMoi().length === 0) {
            <small class="aide">Aucun ami ne le voit encore. Ajoute des amis avec ton code, sur la page Proches.</small>
          } @else {
            <small class="aide">Vu par {{ voientMoi().join(', ') }} : ta progression et ta flamme, pas tes détails.</small>
          }
        </section>
      }

      <p-button label="Archiver cet objectif" icon="pi pi-inbox" severity="secondary" [text]="true" (onClick)="archiver()" />
    }
  `,
})
export class ObjectifDetailPage implements OnInit {
  protected readonly navigation = inject(NavigationService);
  readonly id = input.required<string>();

  private readonly api = inject(ObjectifsService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationsService);
  private readonly amis = inject(AmisService);

  protected readonly stats = signal<Statistiques | null>(null);
  /** Les amis qui voient cet objectif (vide s'il est privé). */
  protected readonly voientMoi = signal<string[]>([]);
  protected readonly changeVisibilite = signal(false);
  protected readonly nombre = nombre;
  protected readonly unite = unite;
  protected readonly chiffre = estChiffre;
  protected readonly heure = heureLisible;

  /** Six barres : coches par mois, ou quantité par mois pour un objectif chiffré. */
  protected readonly barres = computed(() => {
    const st = this.stats();
    if (!st) return [];
    const valeurs = st.mois.map((m) => (estChiffre(st.mesure) ? (m.quantite ?? 0) : m.seances));
    const max = Math.max(1, ...valeurs);
    return st.mois.map((m, i) => ({
      mois: m.mois,
      valeur: nombre(valeurs[i]),
      hauteur: Math.round((valeurs[i] / max) * 72),
      libelle: new Date(m.mois + '-15').toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
    }));
  });

  protected readonly auj = aujourdhui();
  protected readonly objectif = signal<Objectif | null>(null);
  protected readonly historique = signal<Historique | null>(null);
  protected readonly mois = signal(this.auj.slice(0, 7));
  protected readonly titreMois = computed(() => nomDuMois(this.mois()));
  protected readonly cases = computed(() => joursDuMois(this.mois()));
  protected readonly faits = computed(() => new Set(this.historique()?.validations.map((v) => v.date) ?? []));

  ngOnInit(): void {
    this.api.lireObjectif(Number(this.id())).subscribe((o) => {
      this.objectif.set(o);
      if (o.visibleAmis) this.chargerQuiVoit();
    });
    this.chargerHistorique();
  }

  private chargerQuiVoit(): void {
    this.amis.quiVoit(Number(this.id())).subscribe({ next: (l) => this.voientMoi.set(l), error: () => undefined });
  }

  basculerVisibilite(o: Objectif): void {
    this.changeVisibilite.set(true);
    this.api.modifierObjectif(o.id, saisieDe(o, { visibleAmis: !o.visibleAmis })).subscribe({
      next: (maj) => {
        this.objectif.set(maj);
        this.changeVisibilite.set(false);
        if (maj.visibleAmis) this.chargerQuiVoit();
        else this.voientMoi.set([]);
      },
      error: () => this.changeVisibilite.set(false),
    });
  }

  protected libelleType(type: TypeSeance): string {
    const def = schemas.definitions.TypeSeance;
    return def['x-enum-descriptions'][def.enum.indexOf(type)] ?? type;
  }

  protected duree(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m}`;
  }

  changerMois(delta: number): void {
    this.mois.set(moisDecale(this.mois(), delta));
    this.chargerHistorique();
  }

  basculer(date: string): void {
    if (date !== this.auj) return; // le passé ne se modifie plus
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
      this.router.navigate(['/'], { replaceUrl: true });
    });
  }

  private chargerHistorique(): void {
    this.api.historiqueObjectif(Number(this.id()), this.mois()).subscribe((h) => this.historique.set(h));
    this.api.statistiquesObjectif(Number(this.id())).subscribe((s) => this.stats.set(s));
  }

  protected readonly formatDate = formatDate;
}
