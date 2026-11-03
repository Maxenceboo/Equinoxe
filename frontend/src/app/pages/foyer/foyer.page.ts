import { Component, OnInit, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FormlyForm } from '@ngx-formly/core';
import { Button } from 'primeng/button';
import { CreationFoyer, Foyer, RejoindreFoyer, TypeEncouragement } from '../../api/generated';
import { FoyerService } from '../../application/services';
import { SchemaFormService } from '../../core/schema-form.service';
import { Amis } from './amis';

export const ENCOURAGEMENTS: { type: TypeEncouragement; texte: string }[] = [
  { type: 'BRAVO', texte: 'Bravo' },
  { type: 'COURAGE', texte: 'Courage' },
  { type: 'FIER', texte: 'Fier de toi' },
  { type: 'MERCI', texte: 'Merci' },
];

/** L'onglet Proches : mes groupes (famille, amis, collègues…), puis les amis suivis un par un. */
@Component({
  selector: 'app-foyer',
  imports: [ReactiveFormsModule, RouterLink, FormlyForm, Button, Amis],
  template: `
    <header class="entete">
      <div>
        <h1>Proches</h1>
        <small>Tenir ses objectifs, c'est plus facile à plusieurs</small>
      </div>
    </header>

    @if (charge()) {
      <h2 class="titre-section">Groupes</h2>
      @if (foyers().length === 0) {
        <p class="aide">Réunis ta famille ou tes amis : chaque coche fait avancer une jauge commune, et on peut se fixer une récompense pour la semaine.</p>
      }
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

      <app-amis />
    }
  `,
})
export class FoyerPage implements OnInit {
  private readonly api = inject(FoyerService);
  private readonly router = inject(Router);
  private readonly schemas = inject(SchemaFormService);

  protected readonly foyers = signal<Foyer[]>([]);
  protected readonly charge = signal(false);
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

  ngOnInit(): void {
    this.api.foyers().subscribe({
      next: (l) => {
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
      next: () => this.ouvrirDernier(),
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

  /** Après une création, on ouvre le nouveau groupe (le plus récent) pour partager son code. */
  private ouvrirDernier(): void {
    this.api.foyers().subscribe((l) => {
      this.enCours.set(false);
      const dernier = l[l.length - 1];
      if (dernier) this.router.navigate(['/foyer', dernier.id]);
    });
  }
}
