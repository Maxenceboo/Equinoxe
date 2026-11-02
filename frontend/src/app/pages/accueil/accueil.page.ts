import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FormlyFieldConfig, FormlyForm } from '@ngx-formly/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Objectif, ObjectifsService, ValidationSaisie } from '../../api/generated';
import { CelebrationService } from '../../core/celebration.service';
import { NotificationsService } from '../../core/notifications.service';
import { SchemaFormService } from '../../core/schema-form.service';
import { SessionService } from '../../core/session.service';
import { aujourdhui, libelleSemaine } from '../../shared/dates';
import { Flamme } from '../../shared/flamme';

@Component({
  selector: 'app-accueil',
  imports: [RouterLink, ReactiveFormsModule, FormlyForm, Button, Dialog, Flamme],
  template: `
    <header class="entete">
      <div>
        <h1>Cette<br />semaine</h1>
        <small>{{ semaine }}</small>
      </div>
      <p-button icon="pi pi-sign-out" [text]="true" ariaLabel="Se déconnecter" (onClick)="deconnecter()" />
    </header>

    @if (objectifs().length > 0) {
      <section class="bilan" aria-label="Bilan de la semaine">
        <div>
          <strong>{{ tenus() }}<span>/{{ objectifs().length }}</span></strong>
          <span>objectif(s) tenu(s) cette semaine</span>
        </div>
        <div>
          <strong>{{ faitsAujourdhui() }}<span>/{{ objectifs().length }}</span></strong>
          <span>fait(s) aujourd'hui</span>
        </div>
      </section>
    }

    @if (charge() && objectifs().length === 0) {
      <div class="vide">
        <p>Aucun objectif pour l'instant. Commence par un seul, par exemple « Sport, 3 fois par semaine ».</p>
        <p-button label="Créer mon premier objectif" icon="pi pi-plus" routerLink="/objectifs/nouveau" />
      </div>
    }

    <ul class="objectifs">
      @for (o of objectifs(); track o.id) {
        <li class="objectif" [class.pop]="pop() === o.id" [class.atteint]="o.progression.atteint">
          <a class="infos" [routerLink]="['/objectifs', o.id]">
            <div class="ligne-haut">
              <span class="nom">{{ o.nom }}</span>
              <app-flamme [valeur]="o.progression.serie" [unite]="o.progression.uniteSerie" />
            </div>
            <div class="segments" aria-hidden="true">
              @for (plein of segments(o); track $index) {
                <i [class.plein]="plein"></i>
              }
            </div>
            <div class="ligne-bas">
              <small class="message">{{ o.progression.message }}</small>
              <span class="compteur">{{ o.progression.realisees }}<span>/{{ o.progression.cible }}</span></span>
            </div>
          </a>
          <div class="cote">
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
            @if (o.progression.faitAujourdhui && o.categorie !== 'AUTRE') {
              <button type="button" class="lien-details" (click)="ouvrirDetails(o)">+ détails</button>
            }
          </div>
        </li>
      }
    </ul>

    @if (objectifs().length > 0) {
      <p-button class="fab" icon="pi pi-plus" ariaLabel="Nouvel objectif" routerLink="/objectifs/nouveau" />
    }

    <p-dialog
      [header]="enDetail()?.nom ?? ''"
      [visible]="enDetail() !== null"
      (visibleChange)="!$event && enDetail.set(null)"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: 'min(30rem, 95vw)' }"
    >
      <p class="aide">Détails de la séance du jour, tout est facultatif.</p>
      <form [formGroup]="formDetails" (ngSubmit)="enregistrerDetails()">
        <formly-form [form]="formDetails" [fields]="champsDetails()" [model]="modelDetails" />
        <div class="actions">
          <p-button label="Annuler" [text]="true" (onClick)="enDetail.set(null)" />
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
  private readonly celebration = inject(CelebrationService);
  private readonly router = inject(Router);

  protected readonly semaine = libelleSemaine(new Date());
  protected readonly objectifs = signal<Objectif[]>([]);
  protected readonly charge = signal(false);
  protected readonly pop = signal<number | null>(null);
  protected readonly tenus = computed(() => this.objectifs().filter((o) => o.progression.atteint).length);
  protected readonly faitsAujourdhui = computed(
    () => this.objectifs().filter((o) => o.progression.faitAujourdhui).length,
  );
  protected readonly enDetail = signal<Objectif | null>(null);
  protected readonly champsDetails = signal<FormlyFieldConfig[]>([]);
  protected formDetails = new FormGroup({});
  protected modelDetails: Record<string, unknown> = {};
  private enCours = new Set<number>();

  ngOnInit(): void {
    this.api.listerObjectifs(false).subscribe((liste) => {
      this.objectifs.set(liste);
      this.charge.set(true);
    });
    this.notifications.synchroniser();
  }

  protected segments(o: Objectif): boolean[] {
    return Array.from({ length: o.progression.cible }, (_, i) => i < o.progression.realisees);
  }

  basculer(o: Objectif): void {
    if (this.enCours.has(o.id)) return; // évite les doubles taps
    this.enCours.add(o.id);
    const cocher = !o.progression.faitAujourdhui;
    if (cocher) this.celebration.coche();
    const appel = cocher
      ? this.api.validerObjectif(o.id, { date: aujourdhui() })
      : this.api.annulerValidation(o.id, aujourdhui());
    appel.subscribe({
      next: (maj) => {
        this.remplacer(maj);
        this.notifications.synchroniser();
        if (cocher) this.feterSiBesoin(o, maj);
      },
      complete: () => this.enCours.delete(o.id),
      error: () => this.enCours.delete(o.id),
    });
  }

  /** Animation à chaque coche ; écran de célébration quand la semaine est réussie ou qu'un palier est franchi. */
  private feterSiBesoin(avant: Objectif, apres: Objectif): void {
    this.pop.set(apres.id);
    setTimeout(() => this.pop.set(null), 500);
    const p = apres.progression;
    const tousFaits = this.objectifs().every((x) => x.progression.faitAujourdhui);
    if (p.uniteSerie === 'SEMAINES' && p.atteint && !avant.progression.atteint) {
      this.celebration.celebrer({
        titre: 'Semaine réussie !',
        sousTitre: `${apres.nom} : ${p.cible}/${p.cible} cette semaine.` + (p.serie === p.meilleureSerie && p.serie > 1 ? ' Nouveau record !' : ''),
        nombre: String(p.serie),
        legende: "semaine(s) d'affilée",
      });
    } else if (p.uniteSerie === 'JOURS' && CelebrationService.PALIERS_JOURS.includes(p.serie)) {
      this.celebration.celebrer({
        titre: `${p.serie} jours d'affilée !`,
        sousTitre: `${apres.nom} : continue comme ça.`,
        nombre: String(p.serie),
        legende: "jours d'affilée",
      });
    } else if (tousFaits && this.objectifs().length > 1) {
      this.celebration.celebrer({
        titre: 'Journée complète !',
        sousTitre: 'Tous tes objectifs sont cochés aujourd\'hui.',
        nombre: `${this.objectifs().length}/${this.objectifs().length}`,
        legende: "objectifs faits aujourd'hui",
      });
    }
  }

  ouvrirDetails(o: Objectif): void {
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
