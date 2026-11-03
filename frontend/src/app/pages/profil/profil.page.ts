import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FormlyForm } from '@ngx-formly/core';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Badge, Identifiants, Objectif, Profil } from '../../api/generated';
import { AuthService, BoutiqueService, ObjectifsService, ProfilService } from '../../application/services';
import { COUT_JOKER, CodePalette, PALETTES, Palette } from '../../domaine/boutique';
import { CelebrationService } from '../../core/celebration.service';
import { HorsLigneService } from '../../core/hors-ligne.service';
import { NotificationsService } from '../../core/notifications.service';
import { ReglagesService } from '../../core/reglages.service';
import { SchemaFormService } from '../../core/schema-form.service';
import { SessionService } from '../../core/session.service';
import { SonsService } from '../../core/sons.service';
import { BadgeIcone } from '../../shared/badge-icone';

/** Profil : niveau, badges, réglages, sécurisation du compte et déconnexion. */
@Component({
  selector: 'app-profil',
  imports: [RouterLink, ReactiveFormsModule, FormlyForm, Button, Dialog, BadgeIcone],
  template: `
    <header class="entete">
      <div>
        <h1>{{ profil()?.prenom ?? 'Profil' }}</h1>
        <small>{{ session.anonyme() ? 'Entré avec le code du Foyer' : session.email() }}</small>
      </div>
    </header>

    @if (profil(); as p) {
      <section class="niveau" aria-label="Niveau">
        <div class="niveau-ligne">
          <strong>{{ p.nomNiveau }}</strong>
          <span>{{ p.points }} points</span>
        </div>
        <div class="jauge" role="progressbar" [attr.aria-valuenow]="p.points" [attr.aria-valuemin]="p.pointsNiveau" [attr.aria-valuemax]="p.pointsNiveauSuivant">
          <span [style.width.%]="avancement()"></span>
        </div>
        <small>Encore {{ p.pointsNiveauSuivant - p.points }} points pour le niveau suivant. Une coche = 10 points, une semaine tenue = 50.</small>
      </section>

      <h2 class="titre-section">Boutique <span>{{ p.solde }} points à dépenser</span></h2>
      <p class="aide">Dépenser des points ne fait pas baisser ton niveau.</p>
      <button type="button" class="article" [disabled]="p.solde < coutJoker" (click)="choixJoker.set(true)">
        <i class="pi pi-shield"></i>
        <span><strong>Un joker en plus</strong><small>Protège une série de plus ce mois-ci</small></span>
        <em>{{ coutJoker }}</em>
      </button>

      <p class="sous-etiquette">Couleurs des animations</p>
      <ul class="palettes">
        @for (pal of palettes; track pal.code) {
          <li>
            <button type="button" class="palette" [class.choisie]="reglages.palette() === pal.code"
                    [disabled]="!p.palettes.includes(pal.code) && p.solde < pal.cout" (click)="palette(pal, p)">
              <span class="pastilles" aria-hidden="true">
                @for (c of pal.couleurs; track $index) { <i [style.background]="c"></i> }
              </span>
              <span class="nom">{{ pal.nom }}</span>
              <small>{{ reglages.palette() === pal.code ? 'Active' : p.palettes.includes(pal.code) ? 'Choisir' : pal.cout + ' pts' }}</small>
            </button>
          </li>
        }
      </ul>

      <h2 class="titre-section">Badges <span>{{ obtenus() }}/{{ p.badges.length }}</span></h2>
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

    @if (session.anonyme()) {
      <div class="encart">
        <p><strong>Sécurise ton compte</strong></p>
        <p class="aide">Ajoute un email et un mot de passe pour retrouver tes objectifs et tes badges si tu changes de téléphone.</p>
        @if (emailEnvoye()) {
          <p class="aide">C'est noté. Ouvre l'email reçu et touche « Confirmer mon adresse » pour terminer.</p>
        } @else if (securisation()) {
          <form [formGroup]="formCompte" (ngSubmit)="securiser()">
            <formly-form [form]="formCompte" [fields]="champsCompte" [model]="modelCompte" />
            <p-button type="submit" label="Enregistrer" [loading]="enCours()" styleClass="w-full" />
          </form>
        } @else {
          <p-button label="Ajouter un email" [outlined]="true" (onClick)="securisation.set(true)" />
        }
      </div>
    }

    <h2 class="titre-section">Réglages</h2>
    <ul class="reglages">
      <li>
        <button type="button" class="reglage" role="switch" [attr.aria-checked]="reglages.grandTexte()" (click)="reglages.basculerGrandTexte()">
          <i class="pi pi-search-plus"></i>
          <span>Grand texte</span>
          <small>{{ reglages.grandTexte() ? 'Activé' : 'Désactivé' }}</small>
        </button>
      </li>
      <li>
        <button type="button" class="reglage" role="switch" [attr.aria-checked]="sons.actif()" (click)="sons.basculer()">
          <i [class]="sons.actif() ? 'pi pi-volume-up' : 'pi pi-volume-off'"></i>
          <span>Sons</span>
          <small>{{ sons.actif() ? 'Activés' : 'Coupés' }}</small>
        </button>
      </li>
      <li>
        <a class="reglage" routerLink="/profil/archives">
          <i class="pi pi-inbox"></i>
          <span>Objectifs archivés</span>
          <i class="pi pi-chevron-right"></i>
        </a>
      </li>
    </ul>

    @if (confirmation()) {
      <div class="confirmation">
        <p>
          Te déconnecter ? Les rappels de ce téléphone seront supprimés.
          @if (session.anonyme()) {
            <strong>Sans email, tu ne pourras pas retrouver ce compte.</strong>
          }
        </p>
        <div class="actions">
          <p-button label="Annuler" [outlined]="true" (onClick)="confirmation.set(false)" />
          <p-button label="Se déconnecter" severity="danger" [loading]="enCours()" (onClick)="deconnecter()" />
        </div>
      </div>
    } @else {
      <p-button class="deconnexion" label="Se déconnecter" icon="pi pi-sign-out" [text]="true" severity="danger" (onClick)="confirmation.set(true)" />
    }

    <p-dialog header="Un joker pour quel objectif ?" [visible]="choixJoker()" (visibleChange)="!$event && choixJoker.set(false)" [modal]="true" [dismissableMask]="true" [style]="{ width: '22rem' }">
      <p class="aide">Ce mois-ci, cet objectif pourra rater un jour (ou une semaine) de plus sans casser sa série.</p>
      <ul class="reglages">
        @for (o of objectifs(); track o.id) {
          <li><button type="button" class="reglage" (click)="acheterJoker(o)"><i class="pi pi-shield"></i><span>{{ o.nom }}</span><small>{{ coutJoker }} pts</small></button></li>
        } @empty {
          <li class="aide">Crée d'abord un objectif.</li>
        }
      </ul>
    </p-dialog>

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
export class ProfilPage implements OnInit {
  protected readonly session = inject(SessionService);
  protected readonly sons = inject(SonsService);
  protected readonly reglages = inject(ReglagesService);
  private readonly api = inject(ProfilService);
  private readonly auth = inject(AuthService);
  private readonly horsLigne = inject(HorsLigneService);
  private readonly notifications = inject(NotificationsService);
  private readonly router = inject(Router);

  protected readonly profil = signal<Profil | null>(null);
  private readonly boutique = inject(BoutiqueService);
  private readonly objectifsApi = inject(ObjectifsService);
  private readonly celebration = inject(CelebrationService);
  private readonly messages = inject(MessageService);
  protected readonly coutJoker = COUT_JOKER;
  protected readonly palettes = PALETTES;
  protected readonly choixJoker = signal(false);
  protected readonly objectifs = signal<Objectif[]>([]);
  protected readonly enDetail = signal<Badge | null>(null);
  protected readonly confirmation = signal(false);
  protected readonly securisation = signal(false);
  protected readonly emailEnvoye = signal(false);
  protected readonly enCours = signal(false);
  protected readonly obtenus = computed(() => this.profil()?.badges.filter((b) => b.obtenu).length ?? 0);
  protected readonly avancement = computed(() => {
    const p = this.profil();
    if (!p) return 0;
    return Math.min(100, Math.round(((p.points - p.pointsNiveau) / (p.pointsNiveauSuivant - p.pointsNiveau)) * 100));
  });

  protected readonly formCompte = new FormGroup({});
  protected readonly modelCompte: Partial<Identifiants> = {};
  protected readonly champsCompte = inject(SchemaFormService).champs('Identifiants');

  ngOnInit(): void {
    this.charger();
    this.objectifsApi.listerObjectifs(false).subscribe((l) => this.objectifs.set(l));
  }

  private charger(): void {
    this.api.profil().subscribe((p) => this.profil.set(p));
  }

  acheterJoker(o: Objectif): void {
    const p = this.profil();
    if (!p) return;
    this.boutique.acheterJoker(o.id, p.solde).subscribe(() => {
      this.choixJoker.set(false);
      this.messages.add({ severity: 'success', summary: 'Joker ajouté', detail: `« ${o.nom} » est protégé une fois de plus ce mois-ci.` });
      this.charger();
    });
  }

  /** Une palette possédée se choisit ; sinon on l'achète, puis on la montre tout de suite. */
  palette(pal: Palette, p: Profil): void {
    if (p.palettes.includes(pal.code)) {
      this.choisir(pal.code);
      return;
    }
    this.boutique.acheterPalette(pal.code, p.solde).subscribe(() => {
      this.choisir(pal.code);
      this.charger();
    });
  }

  private choisir(code: CodePalette): void {
    this.reglages.choisirPalette(code);
    const pal = PALETTES.find((x) => x.code === code);
    this.celebration.celebrer({ titre: pal?.nom ?? '', sousTitre: 'Tes animations auront ces couleurs.', nombre: '✓', legende: 'palette choisie' });
  }

  protected date(jour: string): string {
    return new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  securiser(): void {
    this.formCompte.markAllAsTouched();
    if (this.formCompte.invalid) return;
    this.enCours.set(true);
    this.auth.securiser(this.modelCompte as Identifiants).subscribe({
      next: () => {
        this.enCours.set(false);
        this.securisation.set(false);
        this.emailEnvoye.set(true);
      },
      error: () => this.enCours.set(false),
    });
  }

  async deconnecter(): Promise<void> {
    this.enCours.set(true);
    await this.notifications.toutAnnuler();
    this.horsLigne.oublier();
    await this.session.fermer();
    void this.router.navigate(['/connexion'], { replaceUrl: true });
  }
}
