import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NavigationService } from '../../core/navigation.service';
import { Button } from 'primeng/button';
import { Flamme } from '../../shared/flamme';
import { Historique, Objectif, Partage, Statistiques, TypeSeance } from '../../api/generated';
import { BinomesService, ObjectifsService } from '../../application/services';
import schemas from '../../api/generated/schemas.json';
import { estChiffre, heureLisible, nombre, unite } from '../../shared/objectifs';
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

        <section class="partage" aria-label="Ami">
          <p class="etiquette">Faire avec un ami</p>
          @if (partage(); as p) {
            <p class="aide">Donne ce code à un ami : il verra ta progression et ta flamme (pas tes détails).</p>
            <div class="code">
              <strong>{{ p.code }}</strong>
              <p-button [label]="copie() ? 'Copié' : 'Partager'" icon="pi pi-share-alt" [outlined]="true" (onClick)="partagerCode(p.code)" />
            </div>
            <small>{{ p.abonnes === 0 ? 'Personne ne te suit encore.' : p.abonnes + ' ami(s) te suivent.' }}</small>
          } @else {
            <p class="aide">C'est plus facile à deux. Partage cet objectif avec un ami pour vous suivre mutuellement.</p>
            <p-button label="Partager avec un ami" icon="pi pi-users" [outlined]="true" (onClick)="creerPartage()" />
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
  private readonly binomes = inject(BinomesService);

  protected readonly stats = signal<Statistiques | null>(null);
  protected readonly partage = signal<Partage | null>(null);
  protected readonly copie = signal(false);
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
      // Le code n'est créé qu'à la demande ; s'il existe déjà, on l'affiche directement
      if (o.partage) this.creerPartage();
    });
    this.chargerHistorique();
  }

  creerPartage(): void {
    this.binomes.partagerObjectif(Number(this.id())).subscribe((p) => this.partage.set(p));
  }

  async partagerCode(code: string): Promise<void> {
    const texte = `Suis mon objectif « ${this.objectif()?.nom} » sur Équinoxe avec le code ${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ text: texte });
        return;
      }
      await navigator.clipboard.writeText(code);
      this.copie.set(true);
      setTimeout(() => this.copie.set(false), 2000);
    } catch {
      /* partage annulé */
    }
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
