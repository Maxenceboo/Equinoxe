import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FormlyForm } from '@ngx-formly/core';
import { Button } from 'primeng/button';
import { CreationFoyer, Foyer, RejoindreFoyer, TypeEncouragement } from '../../api/generated';
import { FoyerService } from '../../application/services';
import { SchemaFormService } from '../../core/schema-form.service';
import { viderCacheAmis } from './amis';
import { NavigationService } from '../../core/navigation.service';

export const ENCOURAGEMENTS: { type: TypeEncouragement; texte: string }[] = [
  { type: 'BRAVO', texte: 'Bravo' },
  { type: 'COURAGE', texte: 'Courage' },
  { type: 'FIER', texte: 'Fier de toi' },
  { type: 'MERCI', texte: 'Merci' },
];

let derniersFoyers: Foyer[] | null = null;

/** À la déconnexion : rien ne doit rester du compte précédent. */
export function viderCacheProches(): void {
  derniersFoyers = null;
  viderCacheAmis();
}

/** Mes groupes (famille, coloc, collègues…) : page secondaire, ouverte depuis le bas de Proches. */
@Component({
  selector: 'app-foyer',
  imports: [ReactiveFormsModule, RouterLink, FormlyForm, Button],
  template: `
    <header class="entete entete-assistant">
      <p-button icon="pi pi-arrow-left" [text]="true" ariaLabel="Retour" (onClick)="navigation.retour()" />
      <div><h1>Groupes</h1></div>
    </header>

    <section class="section-groupes" aria-label="Groupes">
    @if (!charge()) {
      <p class="aide chargement"><i class="pi pi-spin pi-spinner"></i> Chargement des groupes…</p>
    } @else {
      <ul class="groupes">
        @for (f of foyers(); track f.id) {
          <li>
            <a class="foyer-bande" [routerLink]="['/foyer', f.id]">
              <div class="foyer-bande-haut">
                <strong>{{ f.nom }}</strong>
                <span>{{ f.cochesSemaine }}/{{ f.objectifSemaine }} coches <i class="pi pi-chevron-right"></i></span>
              </div>
              <div class="jauge"><span [style.width.%]="avancement(f)"></span></div>
              <small>{{ f.membres.length }} membre(s){{ f.recompense ? ' · À la clé : ' + f.recompense : '' }}</small>
            </a>
          </li>
        }
      </ul>
      @if (foyers().length === 0 && mode() === null) {
        <p class="aide">Famille, coloc, collègues : chaque coche remplit une jauge commune, avec une récompense si elle est pleine dimanche.</p>
      }

      @if (mode() === null) {
        <p-button label="Créer ou rejoindre un groupe" icon="pi pi-plus" [outlined]="true" (onClick)="mode.set('choix')" />
      } @else {
        <div class="choix-foyer">
          <button type="button" class="carte-choix" [class.choisi]="mode() === 'creer'" (click)="mode.set('creer')">
            <strong>Créer un groupe</strong>
            <small>J'invite ma famille ou mes amis</small>
          </button>
          <button type="button" class="carte-choix" [class.choisi]="mode() === 'rejoindre'" (click)="mode.set('rejoindre')">
            <strong>Rejoindre un groupe</strong>
            <small>J'ai reçu un code à 6 chiffres</small>
          </button>
        </div>

        @if (mode() === 'creer') {
          <form [formGroup]="formCreer" (ngSubmit)="creer()">
            <formly-form [form]="formCreer" [fields]="champsCreer" [model]="modelCreer" />
            <p-button type="submit" label="Créer le groupe" [loading]="enCours()" styleClass="w-full" />
          </form>
        } @else if (mode() === 'rejoindre') {
          <form [formGroup]="formRejoindre" (ngSubmit)="rejoindre()">
            <formly-form [form]="formRejoindre" [fields]="champsRejoindre" [model]="modelRejoindre" />
            <p-button type="submit" label="Rejoindre" [loading]="enCours()" styleClass="w-full" />
          </form>
        }
        <p-button label="Annuler" [text]="true" severity="secondary" (onClick)="mode.set(null)" />
      }
    }
    </section>
  `,
})
export class FoyerPage implements OnInit {
  private readonly api = inject(FoyerService);
  private readonly router = inject(Router);
  private readonly schemas = inject(SchemaFormService);

  // Dernière liste connue : la page s'affiche tout de suite au retour, puis se met à jour
  protected readonly foyers = signal<Foyer[]>(derniersFoyers ?? []);
  protected readonly charge = signal(derniersFoyers !== null);
  protected readonly enCours = signal(false);
  protected readonly mode = signal<'choix' | 'creer' | 'rejoindre' | null>(null);

  protected formCreer = new FormGroup({});
  protected modelCreer: Partial<CreationFoyer> = {};
  protected readonly champsCreer = this.schemas.champs('CreationFoyer');
  protected formRejoindre = new FormGroup({});
  protected modelRejoindre: Partial<RejoindreFoyer> = {};
  protected readonly champsRejoindre = this.schemas.champs('RejoindreFoyer', {
    code: { props: { attributes: { inputmode: 'numeric', autocomplete: 'off' } } },
  });

  /** Code de groupe reçu par un lien d'invitation (?rejoindre=123456) : le formulaire est prérempli. */
  readonly codeGroupe = input<string>(undefined, { alias: 'rejoindre' });

  protected readonly navigation = inject(NavigationService);

  ngOnInit(): void {
    const code = this.codeGroupe();
    if (code) {
      this.modelRejoindre = { code };
      this.mode.set('rejoindre');
          }
    this.api.foyers().subscribe({
      next: (l) => {
        derniersFoyers = l;
        this.foyers.set(l);
        this.charge.set(true);
      },
      error: () => this.charge.set(true),
    });
  }

  protected avancement(f: Foyer): number {
    return Math.min(100, Math.round((f.cochesSemaine / f.objectifSemaine) * 100));
  }

  creer(): void {
    this.formCreer.markAllAsTouched();
    if (this.formCreer.invalid) return;
    this.enCours.set(true);
    this.api.creer(this.modelCreer as CreationFoyer).subscribe({
      next: (code) => this.ouvrirCree(code),
      error: () => this.enCours.set(false),
    });
  }

  rejoindre(): void {
    this.formRejoindre.markAllAsTouched();
    if (this.formRejoindre.invalid) return;
    this.enCours.set(true);
    this.api.rejoindre(this.modelRejoindre as RejoindreFoyer).subscribe({
      next: (id) => {
        this.enCours.set(false);
        this.router.navigate(['/foyer', id]);
      },
      error: () => this.enCours.set(false),
    });
  }

  /** Après une création (on en est déjà membre), on ouvre le nouveau groupe pour partager son code. */
  private ouvrirCree(code: string): void {
    this.api.foyers().subscribe((l) => {
      this.enCours.set(false);
      this.foyers.set(l);
      this.mode.set(null);
      const cree = l.find((f) => f.code === code) ?? l[l.length - 1];
      if (cree) this.router.navigate(['/foyer', cree.id]);
    });
  }
}
