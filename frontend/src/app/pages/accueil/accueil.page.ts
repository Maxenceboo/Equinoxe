import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FormlyFieldConfig, FormlyForm } from '@ngx-formly/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { CodeBinome, Mesure, Objectif, ObjectifSaisie, ObjectifSuivi, ValidationSaisie } from '../../api/generated';
import { BinomesService, ObjectifsService } from '../../application/services';
import { HorsLigneService } from '../../core/hors-ligne.service';
import { CelebrationService } from '../../core/celebration.service';
import { NotificationsService } from '../../core/notifications.service';
import { SchemaFormService } from '../../core/schema-form.service';
import { SessionService } from '../../core/session.service';
import { SonsService } from '../../core/sons.service';
import { aujourdhui, libelleSemaine } from '../../shared/dates';
import { Flamme } from '../../shared/flamme';
import {
  ecarterSuggestion,
  estChiffre,
  quantiteSemaine,
  saisieDe,
  suggestionEcartee,
  unite,
} from '../../shared/objectifs';

@Component({
  selector: 'app-accueil',
  imports: [RouterLink, ReactiveFormsModule, FormlyForm, Button, Dialog, Flamme],
  template: `
    <header class="entete">
      <div>
        <h1>Cette<br />semaine</h1>
        <small>{{ semaine }}</small>
      </div>
      <div class="outils">
        <p-button icon="pi pi-chart-bar" [text]="true" ariaLabel="Bilan de la semaine" routerLink="/bilan" />
        <p-button
          [icon]="sons.actif() ? 'pi pi-volume-up' : 'pi pi-volume-off'"
          [text]="true"
          [ariaLabel]="sons.actif() ? 'Couper le son' : 'Activer le son'"
          (onClick)="sons.basculer()"
        />
        <p-button icon="pi pi-sign-out" [text]="true" ariaLabel="Se déconnecter" (onClick)="deconnecter()" />
      </div>
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

    @if (suggestion(); as o) {
      <section class="conseil" aria-label="Proposition de nouvelle cible">
        <p class="etiquette">{{ o.nom }}</p>
        <p>{{ o.suggestion?.raison }}</p>
        <div class="actions">
          <p-button label="Plus tard" [text]="true" (onClick)="plusTard(o)" />
          <p-button [label]="'Passer à ' + o.suggestion?.nouvelleCible + ' par semaine'" (onClick)="accepter(o)" />
        </div>
      </section>
    }

    @if (horsLigne.horsLigne() || horsLigne.enAttente().length > 0) {
      <p class="bandeau-hors-ligne">
        <i class="pi pi-wifi"></i>
        Hors ligne. {{ horsLigne.enAttente().length }} action(s) enregistrée(s) sur le téléphone, envoyée(s) au retour du réseau.
      </p>
    }

    @if (charge() && objectifs().length === 0) {
      <div class="vide">
        <p class="etiquette">Pour commencer</p>
        <p>Choisis un objectif, il est prêt en un tap. Tu pourras le modifier ensuite.</p>
        <div class="modeles">
          @for (m of modeles; track m.nom) {
            <button type="button" class="modele" [disabled]="creation()" (click)="creerDepuisModele(m)">
              <strong>{{ m.nom }}</strong>
              <small>{{ m.detail }}</small>
            </button>
          }
        </div>
        <p-button label="Autre objectif" icon="pi pi-plus" [text]="true" routerLink="/objectifs/nouveau" />
      </div>
    }

    <ul class="objectifs">
      @for (o of objectifs(); track o.id) {
        <li class="objectif" [class.pop]="pop() === o.id" [class.atteint]="o.progression.atteint" >
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
            @if (chiffre(o.mesure)) {
              <small class="quantite">{{ quantite(o) }} cette semaine</small>
            }
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
                <svg class="coche-trait" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              }
            </button>
            @if (o.progression.faitAujourdhui && (o.categorie !== 'AUTRE' || chiffre(o.mesure))) {
              <button type="button" class="lien-details" (click)="ouvrirDetails(o)">{{ chiffre(o.mesure) ? '+ ' + uniteDe(o.mesure) : '+ détails' }}</button>
            }
          </div>
        </li>
      }
    </ul>

    @if (objectifs().length > 0 || binomes().length > 0) {
      <section class="binomes" aria-label="Binômes">
        <div class="titre-section">
          <p class="etiquette">Binômes</p>
          <button type="button" class="lien-details" (click)="ouvrirRejoindre()">Rejoindre avec un code</button>
        </div>
        @for (b of binomes(); track b.objectifId) {
          <div class="binome">
            <div class="ligne-haut">
              <span class="nom">{{ b.nom }} <small>· {{ b.ami }}</small></span>
              <app-flamme [valeur]="b.progression.serie" [unite]="b.progression.uniteSerie" />
            </div>
            <div class="segments" aria-hidden="true">
              @for (plein of segmentsDe(b.progression.realisees, b.progression.cible); track $index) {
                <i [class.plein]="plein"></i>
              }
            </div>
            <div class="ligne-bas">
              <small>{{ etatBinome(b) }}</small>
              <span class="compteur">{{ b.progression.realisees }}<span>/{{ b.progression.cible }}</span></span>
            </div>
            <button type="button" class="lien-details quitter" (click)="quitter(b)">Ne plus suivre</button>
          </div>
        } @empty {
          <small class="aide">Fais-le à deux : partage un objectif depuis sa page, ou entre le code d'un ami.</small>
        }
      </section>
    }

    <p class="lien-archives"><a routerLink="/archives">Objectifs archivés</a></p>

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
      <p class="aide">
        {{ aideDetails() }}
      </p>
      <form [formGroup]="formDetails" (ngSubmit)="enregistrerDetails()">
        <formly-form [form]="formDetails" [fields]="champsDetails()" [model]="modelDetails" />
        <div class="actions">
          <p-button label="Annuler" [text]="true" (onClick)="enDetail.set(null)" />
          <p-button type="submit" label="Enregistrer" />
        </div>
      </form>
    </p-dialog>

    <p-dialog
      header="Rejoindre un binôme"
      [visible]="rejoindre()"
      (visibleChange)="!$event && rejoindre.set(false)"
      [modal]="true"
      [dismissableMask]="true"
      [style]="{ width: 'min(30rem, 95vw)' }"
    >
      <p class="aide">Demande à ton ami le code affiché sur la page de son objectif. Tu verras sa progression et sa flamme, lui verra que tu le suis.</p>
      <form [formGroup]="formCode" (ngSubmit)="envoyerCode()">
        <formly-form [form]="formCode" [fields]="champsCode" [model]="modelCode" />
        <div class="actions">
          <p-button label="Annuler" [text]="true" (onClick)="rejoindre.set(false)" />
          <p-button type="submit" label="Suivre" />
        </div>
      </form>
    </p-dialog>
  `,
})
export class AccueilPage implements OnInit, OnDestroy {
  protected readonly session = inject(SessionService);
  protected readonly sons = inject(SonsService);
  protected readonly horsLigne = inject(HorsLigneService);
  protected readonly creation = signal(false);
  protected readonly modeles: (ObjectifSaisie & { detail: string })[] = [
    { nom: 'Sport', categorie: 'SPORT', typeFrequence: 'PAR_SEMAINE', cible: 3, heure: '18:00', detail: '3 fois par semaine, rappel à 18 h' },
    { nom: 'Me coucher tôt', categorie: 'SOMMEIL', typeFrequence: 'QUOTIDIEN', cible: 7, heure: '23:00', detail: 'Tous les soirs, coucher à 23 h' },
    { nom: 'Lire', categorie: 'AUTRE', typeFrequence: 'PAR_SEMAINE', cible: 4, heure: '21:00', detail: '4 fois par semaine, rappel à 21 h' },
    { nom: 'Marcher 30 min', categorie: 'SPORT', typeFrequence: 'QUOTIDIEN', cible: 7, heure: '12:30', detail: 'Tous les jours, rappel à 12 h 30' },
  ];
  private readonly api = inject(ObjectifsService);
  private readonly binomesApi = inject(BinomesService);
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

  // Cible qui s'adapte : une seule proposition à la fois, pour rester discret
  private readonly ecartees = signal(new Set<number>());
  protected readonly suggestion = computed(
    () => this.objectifs().find((o) => o.suggestion && !this.ecartees().has(o.id) && !suggestionEcartee(o)) ?? null,
  );

  // Binômes
  protected readonly binomes = signal<ObjectifSuivi[]>([]);
  protected readonly rejoindre = signal(false);
  protected formCode = new FormGroup({});
  protected modelCode: Partial<CodeBinome> = {};
  protected readonly champsCode = this.schemas.champs('CodeBinome', {
    code: { props: { placeholder: 'ABC234', attributes: { autocapitalize: 'characters', autocomplete: 'off' } } },
  });

  protected readonly chiffre = estChiffre;
  protected readonly uniteDe = (m: Mesure | undefined) => unite(m);
  protected readonly quantite = quantiteSemaine;

  private readonly auRetourDuReseau = () => this.synchroniserPuisCharger();

  ngOnInit(): void {
    this.synchroniserPuisCharger();
    window.addEventListener('online', this.auRetourDuReseau);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.auRetourDuReseau);
  }

  /** Envoie d'abord les coches faites hors ligne, puis recharge la liste (ou affiche la dernière connue). */
  private async synchroniserPuisCharger(): Promise<void> {
    await this.horsLigne.envoyer();
    this.chargerBinomes();
    this.api.listerObjectifs(false).subscribe({
      next: (liste) => {
        this.objectifs.set(liste);
        this.horsLigne.memoriser(liste);
        this.horsLigne.horsLigne.set(false);
        this.charge.set(true);
        this.notifications.synchroniser();
      },
      error: (e) => {
        if (HorsLigneService.estHorsLigne(e)) {
          this.horsLigne.horsLigne.set(true);
          this.objectifs.set(this.horsLigne.derniereListe());
          this.charge.set(true);
        }
      },
    });
  }

  private chargerBinomes(): void {
    this.binomesApi.listerBinomes().subscribe({ next: (l) => this.binomes.set(l), error: () => undefined });
  }

  creerDepuisModele(m: ObjectifSaisie & { detail: string }): void {
    const { detail, ...saisie } = m;
    this.creation.set(true);
    this.api.creerObjectif(saisie).subscribe({
      next: (o) => {
        this.objectifs.update((l) => [...l, o]);
        this.horsLigne.memoriser(this.objectifs());
        this.notifications.synchroniser();
        this.creation.set(false);
      },
      error: () => this.creation.set(false),
    });
  }

  protected segments(o: Objectif): boolean[] {
    return this.segmentsDe(o.progression.realisees, o.progression.cible);
  }

  protected segmentsDe(realisees: number, cible: number): boolean[] {
    return Array.from({ length: cible }, (_, i) => i < realisees);
  }

  basculer(o: Objectif): void {
    if (this.enCours.has(o.id)) return; // évite les doubles taps
    this.enCours.add(o.id);
    const cocher = !o.progression.faitAujourdhui;
    if (cocher) {
      // Effet immédiat au toucher, sans attendre le serveur
      this.celebration.coche();
      this.pop.set(o.id);
      setTimeout(() => this.pop.set(null), 350);
    } else {
      this.celebration.decoche();
    }
    const appel = cocher
      ? this.api.validerObjectif(o.id, { date: aujourdhui() })
      : this.api.annulerValidation(o.id, aujourdhui());
    appel.subscribe({
      next: (maj) => {
        this.remplacer(maj);
        this.notifications.synchroniser();
        if (!cocher) return;
        const fete = this.feterSiBesoin(o, maj);
        // Objectif chiffré : on demande la quantité juste après la coche (après la célébration s'il y en a une)
        if (estChiffre(maj.mesure)) setTimeout(() => this.ouvrirDetails(maj), fete ? 2700 : 450);
      },
      complete: () => this.enCours.delete(o.id),
      error: (e) => {
        this.enCours.delete(o.id);
        if (HorsLigneService.estHorsLigne(e)) {
          // Pas de réseau : on garde la coche sur le téléphone et on l'enverra plus tard
          this.horsLigne.mettreDeCote(
            cocher
              ? { type: 'valider', id: o.id, saisie: { date: aujourdhui() } }
              : { type: 'annuler', id: o.id, date: aujourdhui() },
          );
          this.remplacer(HorsLigneService.appliquerLocalement(o, cocher));
        }
      },
    });
  }

  /** Animation à chaque coche ; écran de célébration quand la semaine est réussie ou qu'un palier est franchi. */
  private feterSiBesoin(avant: Objectif, apres: Objectif): boolean {
    const p = apres.progression;
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
    } else {
      return false;
    }
    return true;
  }

  ouvrirDetails(o: Objectif): void {
    this.formDetails = new FormGroup({});
    this.modelDetails = {};
    const champs: FormlyFieldConfig[] = [];
    if (estChiffre(o.mesure)) {
      champs.push(
        ...this.schemas.champs('ValidationSaisie', {
          quantite: { props: { label: `Combien de ${unite(o.mesure)} ?`, type: 'number', attributes: { inputmode: 'decimal' } } },
        }).filter((c) => c.key === 'quantite'),
      );
    }
    if (o.categorie === 'SPORT') champs.push(...this.schemas.champs('DetailsSport'));
    if (o.categorie === 'SOMMEIL') champs.push(...this.schemas.champs('DetailsSommeil'));
    this.champsDetails.set(champs);
    this.enDetail.set(o);
  }

  enregistrerDetails(): void {
    const o = this.enDetail();
    if (!o) return;
    const { quantite, ...details } = this.modelDetails;
    const saisie: ValidationSaisie = { date: aujourdhui() };
    if (quantite != null && quantite !== '') saisie.quantite = Number(quantite);
    if (o.categorie === 'SPORT') saisie.sport = details;
    if (o.categorie === 'SOMMEIL') saisie.sommeil = details;
    this.api.validerObjectif(o.id, saisie).subscribe((maj) => {
      this.remplacer(maj);
      this.enDetail.set(null);
    });
  }

  plusTard(o: Objectif): void {
    ecarterSuggestion(o);
    this.ecartees.update((s) => new Set(s).add(o.id));
  }

  accepter(o: Objectif): void {
    const cible = o.suggestion?.nouvelleCible;
    if (!cible) return;
    this.api.modifierObjectif(o.id, saisieDe(o, { cible })).subscribe((maj) => {
      this.remplacer(maj);
      this.notifications.synchroniser();
    });
  }

  ouvrirRejoindre(): void {
    this.formCode = new FormGroup({});
    this.modelCode = {};
    this.rejoindre.set(true);
  }

  envoyerCode(): void {
    this.formCode.markAllAsTouched();
    const code = this.modelCode.code?.trim().toUpperCase();
    if (this.formCode.invalid || !code) return;
    this.binomesApi.rejoindreBinome({ code }).subscribe((b) => {
      this.binomes.update((l) => (l.some((x) => x.objectifId === b.objectifId) ? l : [...l, b]));
      this.rejoindre.set(false);
    });
  }

  protected aideDetails(): string {
    return estChiffre(this.enDetail()?.mesure)
      ? "Combien aujourd'hui ? Les détails sont facultatifs."
      : 'Détails de la séance du jour, tout est facultatif.';
  }

  protected etatBinome(b: ObjectifSuivi): string {
    if (b.progression.faitAujourdhui) return "Fait aujourd'hui";
    return b.progression.atteint ? 'Semaine réussie' : "Pas encore aujourd'hui";
  }

  quitter(b: ObjectifSuivi): void {
    this.binomesApi.quitterBinome(b.objectifId).subscribe(() =>
      this.binomes.update((l) => l.filter((x) => x.objectifId !== b.objectifId)),
    );
  }

  private remplacer(maj: Objectif): void {
    this.objectifs.update((liste) => liste.map((x) => (x.id === maj.id ? maj : x)));
    this.horsLigne.memoriser(this.objectifs());
  }

  async deconnecter(): Promise<void> {
    await this.notifications.toutAnnuler();
    this.horsLigne.oublier();
    await this.session.fermer();
    this.router.navigate(['/connexion']);
  }
}
