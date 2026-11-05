import { Component, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FormlyForm } from '@ngx-formly/core';
import { Capacitor } from '@capacitor/core';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Identifiants } from '../../api/generated';
import { AmisService, AuthService } from '../../application/services';
import { BoiteService } from '../../core/boite.service';
import { PhotosService } from '../../core/photos.service';
import { HorsLigneService } from '../../core/hors-ligne.service';
import { NavigationService } from '../../core/navigation.service';
import { NotificationsService } from '../../core/notifications.service';
import { WidgetsService } from '../../core/widgets.service';
import { PushService, estInstallee, estIos } from '../../core/push.service';
import { ReglagesService } from '../../core/reglages.service';
import { SchemaFormService } from '../../core/schema-form.service';
import { SessionService } from '../../core/session.service';
import { SonsService } from '../../core/sons.service';
import { VERSION } from '../../version';

/** Réglages : affichage, sons, rappels, archives, sécurisation du compte et déconnexion. */
import { viderCacheProches } from '../foyer/foyer.page';
@Component({
  selector: 'app-reglages',
  imports: [RouterLink, ReactiveFormsModule, FormlyForm, Button],
  template: `
    <header class="entete entete-assistant">
      <p-button icon="pi pi-arrow-left" [text]="true" ariaLabel="Retour" (onClick)="navigation.retour()" />
      <div><h1>Réglages</h1><small>{{ session.anonyme() ? 'Compte sans email' : session.email() }}</small></div>
    </header>

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

    @if (suppression()) {
      <div class="confirmation">
        <p>
          <strong>Supprimer ton compte ?</strong>
          Tes objectifs, tes coches, tes badges et tes achats seront effacés pour de bon, et tu quitteras tes groupes. On ne pourra pas les récupérer.
        </p>
        <div class="actions">
          <p-button label="Annuler" [outlined]="true" (onClick)="suppression.set(false)" />
          <p-button label="Tout supprimer" severity="danger" [loading]="enCours()" (onClick)="supprimer()" />
        </div>
      </div>
    } @else {
      <button type="button" class="lien-discret supprimer-compte" (click)="suppression.set(true)">Supprimer mon compte</button>
    }

    <p class="version-app">Équinoxe v{{ version }} · <a href="https://equinoxe-app.fr/confidentialite/" target="_blank" rel="noopener">Confidentialité</a></p>

  `,
})
export class ReglagesPage {
  protected readonly navigation = inject(NavigationService);
  protected readonly session = inject(SessionService);
  protected readonly sons = inject(SonsService);
  protected readonly reglages = inject(ReglagesService);
  private readonly auth = inject(AuthService);
  private readonly boite = inject(BoiteService);
  private readonly photos = inject(PhotosService);
  private readonly amis = inject(AmisService);
  private readonly horsLigne = inject(HorsLigneService);
  private readonly notifications = inject(NotificationsService);
  private readonly widgets = inject(WidgetsService);
  protected readonly push = inject(PushService);
  private readonly messages = inject(MessageService);
  /** iPhone dans Safari : les rappels n'existent qu'une fois l'app ajoutée à l'écran d'accueil. */
  protected readonly iosNavigateur = !Capacitor.isNativePlatform() && estIos() && !estInstallee();
  protected readonly aideInstallation = signal(false);
  protected readonly version = VERSION;
  private readonly router = inject(Router);

  protected readonly confirmation = signal(false);
  protected readonly suppression = signal(false);
  protected readonly securisation = signal(false);
  protected readonly emailEnvoye = signal(false);
  protected readonly enCours = signal(false);

  protected readonly formCompte = new FormGroup({});
  protected readonly modelCompte: Partial<Identifiants> = {};
  protected readonly champsCompte = inject(SchemaFormService).champs('Identifiants');

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

  supprimer(): void {
    this.enCours.set(true);
    this.auth.supprimerCompte().subscribe({
      next: () => void this.deconnecter(),
      error: () => this.enCours.set(false),
    });
  }

  async deconnecter(): Promise<void> {
    this.enCours.set(true);
    // Même si un rappel ou un widget résiste, la déconnexion va jusqu'au bout
    await this.notifications.toutAnnuler().catch(() => undefined);
    await this.widgets.vider().catch(() => undefined);
    this.horsLigne.oublier();
    viderCacheProches();
    this.boite.vider();
    this.photos.vider();
    this.amis.pseudo.set(undefined);
    await this.session.fermer().catch(() => undefined);
    // On recharge l'app : plus rien du compte précédent ne reste en mémoire (profil, points, listes)
    location.replace(new URL('connexion', document.baseURI).href);
  }
}
