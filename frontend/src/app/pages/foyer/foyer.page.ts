import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormlyForm } from '@ngx-formly/core';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { CreationFoyer, Foyer, MembreFoyer, ReglagesFoyer, RejoindreFoyer, TypeEncouragement } from '../../api/generated';
import { FoyerService } from '../../application/services';
import { SchemaFormService } from '../../core/schema-form.service';

export const ENCOURAGEMENTS: { type: TypeEncouragement; texte: string }[] = [
  { type: 'BRAVO', texte: 'Bravo' },
  { type: 'COURAGE', texte: 'Courage' },
  { type: 'FIER', texte: 'Fier de toi' },
  { type: 'MERCI', texte: 'Merci' },
];

/** Le Foyer : la jauge commune de la semaine, la récompense, les membres et les encouragements. */
@Component({
  selector: 'app-foyer',
  imports: [ReactiveFormsModule, FormlyForm, Button],
  template: `
    @if (charge()) {
      @if (foyer(); as f) {
        <header class="entete">
          <div>
            <h1>{{ f.nom }}</h1>
            <small>{{ f.membres.length }} membre(s) · on avance ensemble</small>
          </div>
        </header>

        <section class="foyer-jauge" aria-label="Objectif commun de la semaine">
          <p class="etiquette">Cette semaine, ensemble</p>
          <div class="foyer-chiffres">
            <strong>{{ f.cochesSemaine }}</strong><span>/{{ f.objectifSemaine }} coches</span>
          </div>
          <div class="jauge grande" role="progressbar" [attr.aria-valuenow]="f.cochesSemaine" aria-valuemin="0" [attr.aria-valuemax]="f.objectifSemaine">
            <span [style.width.%]="avancement()"></span>
          </div>
          @if (f.recompense) {
            <p class="recompense">
              <i class="pi pi-gift"></i>
              @if (f.cochesSemaine >= f.objectifSemaine) {
                Gagné : {{ f.recompense }} !
              } @else {
                À la clé : {{ f.recompense }}
              }
            </p>
          } @else if (f.parent) {
            <p class="aide">Choisis une récompense pour la famille dans les réglages ci-dessous.</p>
          }
        </section>

        <h2 class="titre-section">Membres</h2>
        <ul class="membres">
          @for (m of f.membres; track m.id) {
            <li class="membre">
              <div class="membre-infos">
                <span class="nom">{{ m.prenom }}{{ m.moi ? ' (toi)' : '' }}</span>
                <small>{{ resume(m) }}</small>
              </div>
              @if (!m.moi) {
                <div class="encourager">
                  @for (e of encouragements; track e.type) {
                    <button type="button" class="puce" [class.envoye]="envoye() === m.id + e.type" (click)="encourager(m, e.type)">{{ e.texte }}</button>
                  }
                </div>
              }
            </li>
          }
        </ul>

        <div class="encart">
          <p><strong>Inviter quelqu'un</strong></p>
          <p class="aide">Donne ce code. Sur l'écran d'accueil de l'app, il suffit de choisir « J'ai un code de famille ».</p>
          <p class="code-foyer" aria-label="Code du foyer">{{ f.code.slice(0, 3) }} {{ f.code.slice(3) }}</p>
          <p-button label="Partager le code" icon="pi pi-share-alt" [outlined]="true" (onClick)="partager(f)" />
        </div>

        @if (f.parent) {
          <h2 class="titre-section">Réglages du Foyer</h2>
          <form [formGroup]="formReglages" (ngSubmit)="regler()">
            <formly-form [form]="formReglages" [fields]="champsReglages" [model]="modelReglages" />
            <p-button type="submit" label="Enregistrer" [outlined]="true" [loading]="enCours()" />
          </form>
        }

        <p-button class="quitter-foyer" label="Quitter le Foyer" [text]="true" severity="secondary" (onClick)="quitter()" />
      } @else {
        <header class="entete">
          <div>
            <h1>Foyer</h1>
            <small>Tenir ses objectifs, c'est plus facile à plusieurs</small>
          </div>
        </header>

        <p class="aide">Réunis la famille : chaque coche fait avancer une jauge commune, et les parents choisissent la récompense de la semaine.</p>

        <div class="choix-foyer">
          <button type="button" class="carte-choix" [class.choisi]="mode() === 'creer'" (click)="mode.set('creer')">
            <strong>Créer le Foyer</strong>
            <small>Je suis parent, j'invite la famille</small>
          </button>
          <button type="button" class="carte-choix" [class.choisi]="mode() === 'rejoindre'" (click)="mode.set('rejoindre')">
            <strong>Rejoindre un Foyer</strong>
            <small>J'ai reçu un code à 6 chiffres</small>
          </button>
        </div>

        @if (mode() === 'creer') {
          <form [formGroup]="formCreer" (ngSubmit)="creer()">
            <formly-form [form]="formCreer" [fields]="champsCreer" [model]="modelCreer" />
            <p-button type="submit" label="Créer le Foyer" [loading]="enCours()" styleClass="w-full" />
          </form>
        } @else if (mode() === 'rejoindre') {
          <form [formGroup]="formRejoindre" (ngSubmit)="rejoindre()">
            <formly-form [form]="formRejoindre" [fields]="champsRejoindre" [model]="modelRejoindre" />
            <p-button type="submit" label="Rejoindre" [loading]="enCours()" styleClass="w-full" />
          </form>
        }
      }
    }
  `,
})
export class FoyerPage implements OnInit {
  private readonly api = inject(FoyerService);
  private readonly messages = inject(MessageService);
  private readonly schemas = inject(SchemaFormService);

  protected readonly foyer = signal<Foyer | null>(null);
  protected readonly charge = signal(false);
  protected readonly enCours = signal(false);
  protected readonly mode = signal<'creer' | 'rejoindre' | null>(null);
  protected readonly envoye = signal<string | null>(null);
  protected readonly encouragements = ENCOURAGEMENTS;
  protected readonly avancement = computed(() => {
    const f = this.foyer();
    return f ? Math.min(100, Math.round((f.cochesSemaine / f.objectifSemaine) * 100)) : 0;
  });

  protected readonly formCreer = new FormGroup({});
  protected readonly modelCreer: Partial<CreationFoyer> = {};
  protected readonly champsCreer = this.schemas.champs('CreationFoyer');
  protected readonly formRejoindre = new FormGroup({});
  protected readonly modelRejoindre: Partial<RejoindreFoyer> = {};
  protected readonly champsRejoindre = this.schemas.champs('RejoindreFoyer', {
    code: { props: { attributes: { inputmode: 'numeric', autocomplete: 'off' } } },
  });
  protected readonly formReglages = new FormGroup({});
  protected modelReglages: Partial<ReglagesFoyer> = {};
  protected readonly champsReglages = this.schemas.champs('ReglagesFoyer', {
    objectifSemaine: { props: { type: 'number', attributes: { inputmode: 'numeric' } } },
  });

  ngOnInit(): void {
    this.charger();
  }

  private charger(): void {
    this.api.foyer().subscribe({
      next: (f) => {
        this.foyer.set(f);
        if (f) this.modelReglages = { recompense: f.recompense, objectifSemaine: f.objectifSemaine };
        this.charge.set(true);
      },
      error: () => this.charge.set(true),
    });
  }

  protected resume(m: MembreFoyer): string {
    if (m.objectifs === 0) return 'Pas encore d\'objectif';
    return `${m.coches} coche(s) · ${m.tenus}/${m.objectifs} objectif(s) tenu(s)`;
  }

  creer(): void {
    this.formCreer.markAllAsTouched();
    if (this.formCreer.invalid) return;
    this.enCours.set(true);
    this.api.creer(this.modelCreer as CreationFoyer).subscribe({
      next: () => {
        this.enCours.set(false);
        this.charger();
      },
      error: () => this.enCours.set(false),
    });
  }

  rejoindre(): void {
    this.formRejoindre.markAllAsTouched();
    if (this.formRejoindre.invalid) return;
    this.enCours.set(true);
    this.api.rejoindre(this.modelRejoindre as RejoindreFoyer).subscribe({
      next: () => {
        this.enCours.set(false);
        this.charger();
      },
      error: () => this.enCours.set(false),
    });
  }

  regler(): void {
    this.formReglages.markAllAsTouched();
    if (this.formReglages.invalid) return;
    this.enCours.set(true);
    this.api.regler(this.modelReglages as ReglagesFoyer).subscribe({
      next: () => {
        this.enCours.set(false);
        this.messages.add({ severity: 'success', summary: 'Enregistré', detail: 'La famille voit la nouvelle récompense.' });
        this.charger();
      },
      error: () => this.enCours.set(false),
    });
  }

  encourager(m: MembreFoyer, type: TypeEncouragement): void {
    this.api.encourager(m.id, type).subscribe(() => {
      this.envoye.set(m.id + type);
      this.messages.add({ severity: 'success', summary: 'Envoyé', detail: `${m.prenom} le verra en ouvrant l'app.` });
    });
  }

  async partager(f: Foyer): Promise<void> {
    const texte = `Rejoins notre Foyer sur Équinoxe avec le code ${f.code}. L'app : https://equinoxe-app.fr/telecharger/`;
    try {
      if (navigator.share) await navigator.share({ text: texte });
      else {
        await navigator.clipboard.writeText(texte);
        this.messages.add({ severity: 'success', summary: 'Copié', detail: 'Colle le message à ta famille.' });
      }
    } catch {
      /* partage annulé */
    }
  }

  quitter(): void {
    this.api.quitter().subscribe(() => {
      this.foyer.set(null);
      this.mode.set(null);
    });
  }
}
