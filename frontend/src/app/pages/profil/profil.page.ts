import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FormlyForm } from '@ngx-formly/core';
import { Capacitor } from '@capacitor/core';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Badge, Identifiants, Profil } from '../../api/generated';
import { AuthService, ProfilService } from '../../application/services';
import { HorsLigneService } from '../../core/hors-ligne.service';
import { NotificationsService } from '../../core/notifications.service';
import { PushService, estInstallee, estIos } from '../../core/push.service';
import { ReglagesService } from '../../core/reglages.service';
import { SchemaFormService } from '../../core/schema-form.service';
import { SessionService } from '../../core/session.service';
import { SonsService } from '../../core/sons.service';
import { BadgeIcone } from '../../shared/badge-icone';
import { VERSION } from '../../version';

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
        <p class="etiquette">Ton niveau</p>
        <div class="niveau-ligne">
          <strong>{{ p.nomNiveau }}</strong>
          <span>{{ p.points }} points</span>
        </div>
        <div class="jauge" role="progressbar" [attr.aria-valuenow]="p.points" [attr.aria-valuemin]="p.pointsNiveau" [attr.aria-valuemax]="p.pointsNiveauSuivant">
          <span [style.width.%]="avancement()"></span>
        </div>
        <small>Encore {{ p.pointsNiveauSuivant - p.points }} points pour le niveau suivant. Une coche = 10 points, une semaine tenue = 50.</small>
      </section>

      <a class="lien-boutique" routerLink="/profil/boutique">
        <span><strong>Boutique</strong><small>Jokers et couleurs</small></span>
        <em>{{ p.solde }} pts</em>
        <i class="pi pi-chevron-right"></i>
      </a>

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
      @if (iosNavigateur) {
        <li>
          <button type="button" class="reglage" (click)="aideInstallation.set(!aideInstallation())">
            <i class="pi pi-bell"></i>
            <span>Rappels</span>
            <small>Installe l'app d'abord</small>
          </button>
          @if (aideInstallation()) {
            <p class="aide">Dans Safari, touche <i class="pi pi-upload"></i> Partager, puis « Sur l'écran d'accueil ». Ouvre Équinoxe depuis son icône, et active les rappels ici.</p>
          }
        </li>
      } @else if (push.possible) {
        <li>
          <button type="button" class="reglage" role="switch" [attr.aria-checked]="push.actifs()" (click)="basculerRappels()">
            <i [class]="push.actifs() ? 'pi pi-bell' : 'pi pi-bell-slash'"></i>
            <span>Rappels</span>
            <small>{{ push.actifs() ? 'Activés' : 'Désactivés' }}</small>
          </button>
        </li>
      }
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

    <p class="version-app">Équinoxe v{{ version }}</p>

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
  protected readonly push = inject(PushService);
  private readonly messages = inject(MessageService);
  /** iPhone dans Safari : les rappels n'existent qu'une fois l'app ajoutée à l'écran d'accueil. */
  protected readonly iosNavigateur = !Capacitor.isNativePlatform() && estIos() && !estInstallee();
  protected readonly aideInstallation = signal(false);
  protected readonly version = VERSION;
  private readonly router = inject(Router);

  protected readonly profil = signal<Profil | null>(inject(ProfilService).dernier());
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
  }

  private charger(): void {
    this.api.profil().subscribe((p) => this.profil.set(p));
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

  async basculerRappels(): Promise<void> {
    if (this.push.actifs()) {
      await this.push.desactiver();
      return;
    }
    try {
      if (await this.push.activer()) {
        await this.notifications.synchroniser();
        this.messages.add({ severity: 'success', summary: 'Rappels activés', detail: 'Tu les recevras même app fermée.' });
      } else {
        this.messages.add({ severity: 'info', summary: 'Rappels refusés', detail: 'Autorise les notifications d\'Équinoxe dans les réglages du téléphone.' });
      }
    } catch {
      this.messages.add({ severity: 'error', summary: 'Pas de rappels', detail: 'Réessaie dans un moment.' });
    }
  }

  async deconnecter(): Promise<void> {
    this.enCours.set(true);
    await this.notifications.toutAnnuler();
    this.horsLigne.oublier();
    await this.session.fermer();
    void this.router.navigate(['/connexion'], { replaceUrl: true });
  }
}
