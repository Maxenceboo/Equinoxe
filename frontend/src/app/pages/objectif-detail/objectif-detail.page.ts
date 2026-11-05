import { SessionService } from '../../core/session.service';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { viderCacheAmis } from '../foyer/amis';
import { Avatar } from '../../shared/avatar';
import { PhotosService } from '../../core/photos.service';
import { NavigationService } from '../../core/navigation.service';
import { Button } from 'primeng/button';
import { Flamme } from '../../shared/flamme';
import { Ami, Historique, Objectif, ObjectifCommun, Statistiques, TypeSeance } from '../../api/generated';
import { AmisService, ObjectifsService, listeNoms } from '../../application/services';
import schemas from '../../api/generated/schemas.json';
import { estChiffre, heureLisible, nombre, saisieDe, valeur } from '../../shared/objectifs';
import { NotificationsService } from '../../core/notifications.service';
import { aujourdhui, formatDate, joursDuMois, moisDecale, nomDuMois } from '../../shared/dates';

@Component({
  selector: 'app-objectif-detail',
  imports: [RouterLink, Button, PercentPipe, DecimalPipe, Flamme, Avatar],
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
            <span>{{ o.progression.uniteSerie === 'JOURS' ? 'jour' : 'semaine' }}{{ o.progression.serie > 1 ? 's' : '' }} d'affilée</span>
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
              <div><strong>{{ valeur(st.totalQuantite, st.mesure) }}</strong><small>au total</small></div>
            } @else if (st.totalMinutes > 0) {
              <div><strong>{{ duree(st.totalMinutes) }}</strong><small>de sport noté</small></div>
            }
          </div>

          @if (afficherBarres()) {
          <p class="sous-etiquette">{{ chiffre(st.mesure) ? (st.mesure === 'MINUTES' ? 'Temps par mois' : 'Total par mois') : 'Coches par mois' }}</p>
          <svg class="barres" viewBox="0 0 300 120" role="img" [attr.aria-label]="'Évolution sur 6 mois'">
            @for (b of barres(); track b.mois; let i = $index) {
              <rect [attr.x]="i * 50 + 12" [attr.y]="96 - b.hauteur" width="26" [attr.height]="b.hauteur || 1" rx="3"
                    [class.courant]="$last" />
              <text class="valeur" [attr.x]="i * 50 + 25" [attr.y]="90 - b.hauteur" text-anchor="middle">{{ b.valeur }}</text>
              <text class="mois-court" [attr.x]="i * 50 + 25" y="114" text-anchor="middle">{{ b.libelle }}</text>
            }
          </svg>
          }

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
            <small class="aide">Toi seul le vois. Tes amis s'ajoutent avec ton code, sur la page Proches.</small>
          } @else if (voientMoi().length === 0) {
            <small class="aide">Aucun ami ne le voit encore. Ajoute des amis depuis ton Profil.</small>
          } @else {
            <small class="aide">Vu par {{ voientMoi().join(', ') }} : ta progression et ta flamme, pas tes détails.</small>
          }
        </section>

        <section class="partage a-deux" aria-label="Ensemble">
          <p class="etiquette">Ensemble</p>
          @if (commun(); as c) {
            @if (actifsDe(c).length > 0) {
              <div class="ligne-a-deux">
                <span class="pile">
                  <app-avatar [id]="moi()" nom="Moi" [taille]="2.25" [fait]="(c.moi ?? 0) >= (c.objectifPeriode ?? 1)" />
                  @for (m of actifsDe(c); track m.id) {
                    <app-avatar [id]="m.id" [nom]="m.nom" [taille]="2.25" [fait]="(m.fait ?? 0) >= (c.objectifPeriode ?? 1)" />
                  }
                </span>
                <span class="flamme-commune"><app-flamme [valeur]="c.flamme ?? 0" [unite]="c.uniteSerie ?? 'JOURS'" /> commune</span>
              </div>
              <small class="aide">Avec {{ c.ami }}{{ c.creeParMoi ? '' : ', créé par ' + c.createur }}. La flamme commune ne monte que si tout le monde le fait ; si l'un rate, elle retombe pour tous.</small>
            }
            @if (invitesDe(c); as inv) {
              <small class="aide">Invitation envoyée à {{ inv }}, en attente de réponse.</small>
            }
          }

          @if (choixAmi()) {
            <small class="aide">Avec qui ? Ton ami recevra l'invitation dans ses notifications.</small>
            <div class="choix-amis">
              @for (a of amisDispo(); track a.id) {
                <p-button [label]="a.nom" [outlined]="true" size="small" (onClick)="inviter(a.id)" />
              }
              <p-button label="Annuler" [text]="true" severity="secondary" size="small" (onClick)="choixAmi.set(false)" />
            </div>
          } @else if (amis().length === 0) {
            <small class="aide">Ajoute un ami depuis ton Profil pour faire cet objectif ensemble, avec une flamme commune.</small>
          } @else if (!commun()) {
            <small class="aide">Fais-le avec des amis (jusqu'à 10) : la flamme commune ne monte que si tout le monde le fait.</small>
            <p-button label="Le faire avec des amis" icon="pi pi-users" [outlined]="true" (onClick)="choixAmi.set(true)" />
          } @else if (amisDispo().length > 0 && (commun()?.membres?.length ?? 0) < 9) {
            <p-button label="Inviter un ami de plus" icon="pi pi-user-plus" [text]="true" size="small" (onClick)="choixAmi.set(true)" />
          }

          @if (commun(); as c) {
            @if (confirmerArret()) {
              <small class="aide">
                {{ c.aRejoint ? "C'est l'objectif de " + c.createur + " : en le quittant, il disparaît de tes objectifs." : 'Chacun garde son objectif, mais la flamme commune s’arrête pour tout le monde.' }}
              </small>
              <div class="actions-ligne">
                <p-button label="Garder" [text]="true" severity="secondary" size="small" (onClick)="confirmerArret.set(false)" />
                <p-button [label]="c.aRejoint ? 'Quitter' : 'Arrêter'" severity="danger" size="small" (onClick)="arreterCommun(c)" />
              </div>
            } @else {
              <p-button [label]="c.aRejoint ? 'Quitter cet objectif' : 'Arrêter de le faire ensemble'" [text]="true" severity="secondary" size="small" (onClick)="confirmerArret.set(true)" />
            }
          }
        </section>
      }

      <p-button label="Archiver cet objectif" icon="pi pi-inbox" severity="secondary" [text]="true" (onClick)="archiver()" />
    }
  `,
})
export class ObjectifDetailPage implements OnInit {
  protected readonly navigation = inject(NavigationService);
  private readonly session = inject(SessionService);
  protected readonly moi = computed(() => this.session.utilisateur()?.id);
  readonly id = input.required<string>();

  private readonly api = inject(ObjectifsService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationsService);
  private readonly amisApi = inject(AmisService);

  protected readonly stats = signal<Statistiques | null>(null);
  /** Les amis qui voient cet objectif (vide s'il est privé). */
  protected readonly voientMoi = signal<string[]>([]);
  protected readonly changeVisibilite = signal(false);
  /** L'objectif commun (ou l'invitation envoyée) lié à cet objectif. */
  protected readonly commun = signal<ObjectifCommun | null>(null);
  protected readonly amis = signal<Ami[]>([]);
  protected readonly choixAmi = signal(false);
  protected readonly confirmerArret = signal(false);
  protected readonly nombre = nombre;
  protected readonly valeur = valeur;
  protected readonly chiffre = estChiffre;
  protected readonly heure = heureLisible;

  /** Le graphique mois par mois n'a de sens qu'à partir du deuxième mois de l'objectif. */
  protected readonly afficherBarres = computed(() => {
    const o = this.objectif();
    const st = this.stats();
    const vide = !st || st.mois.every((m) => !(m.quantite ?? 0) && !m.seances);
    return !!o && !vide && o.dateCreation.slice(0, 7) < this.auj.slice(0, 7);
  });

  /** Six barres : coches par mois, ou quantité par mois pour un objectif chiffré. */
  protected readonly barres = computed(() => {
    const st = this.stats();
    if (!st) return [];
    const valeurs = st.mois.map((m) => (estChiffre(st.mesure) ? (m.quantite ?? 0) : m.seances));
    const max = Math.max(1, ...valeurs);
    return st.mois.map((m, i) => ({
      mois: m.mois,
      valeur: estChiffre(st.mesure) ? valeur(valeurs[i], st.mesure) : nombre(valeurs[i]),
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
    this.chargerCommun();
    this.amisApi.lister().subscribe({ next: (l) => this.amis.set(l), error: () => undefined });
  }

  private readonly photos = inject(PhotosService);

  private chargerCommun(): void {
    void this.photos.charger();
    const id = Number(this.id());
    this.amisApi.communs().subscribe({
      next: (l) => this.commun.set(l.find((c) => c.statut !== 'RECUE' && c.monObjectif === id) ?? null),
      error: () => undefined,
    });
  }

  inviter(amiId: string): void {
    this.amisApi.inviterCommun(Number(this.id()), amiId).subscribe(() => {
      this.choixAmi.set(false);
      this.chargerCommun();
    });
  }

  protected actifsDe(c: ObjectifCommun) {
    return c.membres.filter((m) => m.statut === 'ACTIF');
  }

  protected invitesDe(c: ObjectifCommun): string {
    return listeNoms(c.membres.filter((m) => m.statut === 'INVITE').map((m) => m.nom));
  }

  /** Mes amis qui ne sont pas déjà dans cet objectif (ni invités). */
  protected amisDispo(): Ami[] {
    const deja = new Set(this.commun()?.membres.map((m) => m.id) ?? []);
    return this.amis().filter((a) => !deja.has(a.id));
  }

  arreterCommun(c: ObjectifCommun): void {
    this.amisApi.quitterCommun(c.id).subscribe(() => {
      viderCacheAmis();
      this.confirmerArret.set(false);
      this.commun.set(null);
      // L'objectif rejoint chez un ami disparaît avec lui
      if (c.aRejoint) {
        this.notifications.synchroniser();
        void this.router.navigate(['/'], { replaceUrl: true });
      }
    });
  }

  private chargerQuiVoit(): void {
    this.amisApi.quiVoit(Number(this.id())).subscribe({ next: (l) => this.voientMoi.set(l), error: () => undefined });
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
    // Un objectif archivé ne se fait plus à deux
    const c = this.commun();
    if (c) this.amisApi.quitterCommun(c.id).subscribe({ error: () => undefined });
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
