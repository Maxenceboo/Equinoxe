import { Component, OnInit, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FormlyFieldConfig, FormlyForm } from '@ngx-formly/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Objectif, ObjectifsService, ValidationSaisie } from '../../api/generated';
import { NotificationsService } from '../../core/notifications.service';
import { SchemaFormService } from '../../core/schema-form.service';
import { SessionService } from '../../core/session.service';
import { aujourdhui } from '../../shared/dates';

@Component({
  selector: 'app-accueil',
  imports: [RouterLink, ReactiveFormsModule, FormlyForm, Button, Dialog],
  template: `
    <header class="entete">
      <div>
        <h1>Cette<br />semaine</h1>
        <small>{{ session.email() }}</small>
      </div>
      <p-button icon="pi pi-sign-out" [text]="true" ariaLabel="Se déconnecter" (onClick)="deconnecter()" />
    </header>

    @if (charge() && objectifs().length === 0) {
      <div class="vide">
        <p>Aucun objectif pour l'instant.</p>
        <p-button label="Créer mon premier objectif" icon="pi pi-plus" routerLink="/objectifs/nouveau" />
      </div>
    }

    <ul class="objectifs">
      @for (o of objectifs(); track o.id) {
        <li class="objectif" [style.--couleur]="o.couleur">
          <a class="infos" [routerLink]="['/objectifs', o.id]">
            <div class="ligne-haut">
              <span class="nom">{{ o.nom }}</span>
              <span class="compteur">{{ o.progression.realisees }}<span>/{{ o.progression.cible }}</span></span>
            </div>
            <div class="segments" aria-hidden="true">
              @for (plein of segments(o); track $index) {
                <i [class.plein]="plein"></i>
              }
            </div>
            <small class="message">{{ o.progression.message }}</small>
          </a>
          <button
            type="button"
            class="coche"
            [class.fait]="o.progression.faitAujourdhui"
            [attr.aria-label]="o.progression.faitAujourdhui ? 'Annuler pour aujourd\\'hui' : 'Marquer comme fait'"
            (click)="basculer(o)"
          >
            @if (o.progression.faitAujourdhui) {
              <i class="pi pi-check"></i>
            }
          </button>
        </li>
      }
    </ul>

    @if (objectifs().length > 0) {
      <p-button
        class="fab"
        icon="pi pi-plus"
        
        size="large"
        ariaLabel="Nouvel objectif"
        routerLink="/objectifs/nouveau"
      />
    }

    <p-dialog
      [header]="'Bravo ! ' + (enDetail()?.nom ?? '')"
      [visible]="enDetail() !== null"
      (visibleChange)="!$event && enDetail.set(null)"
      [modal]="true"
      [style]="{ width: 'min(30rem, 95vw)' }"
    >
      <p class="aide">Ajoute des détails si tu veux, sinon ferme simplement.</p>
      <form [formGroup]="formDetails" (ngSubmit)="enregistrerDetails()">
        <formly-form [form]="formDetails" [fields]="champsDetails()" [model]="modelDetails" />
        <div class="actions">
          <p-button label="Passer" [text]="true" (onClick)="enDetail.set(null)" />
          <p-button type="submit" label="Enregistrer" />
        </div>
      </form>
    </p-dialog>
  `,
})
export class AccueilPage implements OnInit {
  protected readonly session = inject(SessionService);
  private readonly api = inject(ObjectifsService);
  private readonly notifications = inject(NotificationsService);
  private readonly schemas = inject(SchemaFormService);
  private readonly router = inject(Router);

  protected readonly objectifs = signal<Objectif[]>([]);
  protected readonly charge = signal(false);
  protected readonly enDetail = signal<Objectif | null>(null);
  protected readonly champsDetails = signal<FormlyFieldConfig[]>([]);
  protected formDetails = new FormGroup({});
  protected modelDetails: Record<string, unknown> = {};

  ngOnInit(): void {
    this.charger();
    this.notifications.synchroniser();
  }

  protected segments(o: Objectif): boolean[] {
    return Array.from({ length: o.progression.cible }, (_, i) => i < o.progression.realisees);
  }

  private charger(): void {
    this.api.listerObjectifs(false).subscribe((liste) => {
      this.objectifs.set(liste);
      this.charge.set(true);
    });
  }

  basculer(o: Objectif): void {
    const appel = o.progression.faitAujourdhui
      ? this.api.annulerValidation(o.id, aujourdhui())
      : this.api.validerObjectif(o.id, { date: aujourdhui() });
    appel.subscribe((maj) => {
      this.remplacer(maj);
      this.notifications.synchroniser();
      if (!o.progression.faitAujourdhui && maj.categorie !== 'AUTRE') this.ouvrirDetails(maj);
    });
  }

  private ouvrirDetails(o: Objectif): void {
    this.formDetails = new FormGroup({});
    this.modelDetails = {};
    this.champsDetails.set(this.schemas.champs(o.categorie === 'SPORT' ? 'DetailsSport' : 'DetailsSommeil'));
    this.enDetail.set(o);
  }

  enregistrerDetails(): void {
    const o = this.enDetail();
    if (!o) return;
    const saisie: ValidationSaisie = { date: aujourdhui() };
    if (o.categorie === 'SPORT') saisie.sport = this.modelDetails;
    else saisie.sommeil = this.modelDetails;
    this.api.validerObjectif(o.id, saisie).subscribe((maj) => {
      this.remplacer(maj);
      this.enDetail.set(null);
    });
  }

  private remplacer(maj: Objectif): void {
    this.objectifs.update((liste) => liste.map((x) => (x.id === maj.id ? maj : x)));
  }

  async deconnecter(): Promise<void> {
    await this.notifications.toutAnnuler();
    this.session.fermer();
    this.router.navigate(['/connexion']);
  }
}
