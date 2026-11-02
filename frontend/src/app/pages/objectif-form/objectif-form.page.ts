import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FormlyFieldConfig, FormlyForm } from '@ngx-formly/core';
import { Button } from 'primeng/button';
import { Objectif, ObjectifSaisie } from '../../api/generated';
import { ObjectifsService } from '../../application/services';
import { NotificationsService } from '../../core/notifications.service';
import { SchemaFormService } from '../../core/schema-form.service';
import { estChiffre, saisieDe, unite } from '../../shared/objectifs';

@Component({
  selector: 'app-objectif-form',
  imports: [ReactiveFormsModule, RouterLink, FormlyForm, Button],
  template: `
    <header class="entete">
      <p-button icon="pi pi-arrow-left" [text]="true" ariaLabel="Retour" [routerLink]="retour()" />
      <h1>{{ id() ? 'Modifier l\\'objectif' : 'Nouvel objectif' }}</h1>
    </header>

    @if (pret()) {
      <form [formGroup]="form" (ngSubmit)="enregistrer()">
        <formly-form [form]="form" [fields]="champs" [model]="model" />
        <p-button type="submit" label="Enregistrer" [loading]="enCours()" styleClass="w-full" />
      </form>
    }
  `,
})
export class ObjectifFormPage implements OnInit {
  readonly id = input<string>();

  private readonly api = inject(ObjectifsService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationsService);

  protected readonly form = new FormGroup({});
  protected model: Partial<ObjectifSaisie> = {};
  protected readonly pret = signal(false);
  protected readonly enCours = signal(false);

  // Champs construits depuis le schéma ObjectifSaisie, avec deux règles d'affichage
  protected readonly champs: FormlyFieldConfig[] = inject(SchemaFormService).champs('ObjectifSaisie', {
    cible: {
      type: 'radio',
      props: { options: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: n, label: String(n) })) },
      expressions: { hide: 'model.typeFrequence === "QUOTIDIEN"' },
    },
    // La DA est en noir et blanc : la couleur n'est plus affichée, on ne la demande pas
    couleur: { hide: true },
    heure: {
      expressions: {
        'props.label': (f: FormlyFieldConfig) =>
          f.model?.categorie === 'SOMMEIL'
            ? 'Heure de coucher visée (rappel 30 min avant)'
            : f.model?.rappelAuto
              ? "Heure du rappel, en attendant de connaître ton heure habituelle"
              : 'Heure du rappel',
      },
    },
    // Le sommeil a déjà son heure (le coucher visé) : pas d'heure apprise
    rappelAuto: { expressions: { hide: 'model.categorie === "SOMMEIL"' } },
    objectifQuantite: {
      expressions: {
        hide: '!model.mesure || model.mesure === "AUCUNE"',
        'props.label': (f: FormlyFieldConfig) => `Total visé par semaine, en ${unite(f.model?.mesure)} (facultatif)`,
      },
    },
  });

  retour(): unknown[] {
    return this.id() ? ['/objectifs', this.id()] : ['/'];
  }

  ngOnInit(): void {
    const id = this.id();
    if (!id) {
      this.pret.set(true);
      return;
    }
    this.api.lireObjectif(Number(id)).subscribe((o: Objectif) => {
      this.model = saisieDe(o);
      this.pret.set(true);
    });
  }

  enregistrer(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const saisie = { ...this.model } as ObjectifSaisie;
    if (saisie.typeFrequence === 'QUOTIDIEN') saisie.cible = 7;
    if (!estChiffre(saisie.mesure)) saisie.objectifQuantite = undefined;
    if (saisie.categorie === 'SOMMEIL') saisie.rappelAuto = false;
    const id = this.id();
    const appel = id ? this.api.modifierObjectif(Number(id), saisie) : this.api.creerObjectif(saisie);
    this.enCours.set(true);
    appel.subscribe({
      next: (o) => {
        this.notifications.synchroniser();
        this.router.navigate(id ? ['/objectifs', o.id] : ['/']);
      },
      error: () => this.enCours.set(false),
    });
  }
}
