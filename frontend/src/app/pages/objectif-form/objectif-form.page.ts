import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FormlyFieldConfig, FormlyForm } from '@ngx-formly/core';
import { NavigationService } from '../../core/navigation.service';
import { Button } from 'primeng/button';
import { Objectif, ObjectifSaisie } from '../../api/generated';
import { AmisService, ObjectifsService } from '../../application/services';
import { NotificationsService } from '../../core/notifications.service';
import { SchemaFormService } from '../../core/schema-form.service';
import { estChiffre, saisieDe } from '../../shared/objectifs';

@Component({
  selector: 'app-objectif-form',
  imports: [ReactiveFormsModule, FormlyForm, Button],
  template: `
    <header class="entete">
      <p-button icon="pi pi-arrow-left" [text]="true" ariaLabel="Retour" (onClick)="navigation.retour()" />
      <h1>{{ id() ? 'Modifier l\\'objectif' : 'Nouvel objectif' }}</h1>
    </header>

    @if (pret()) {
      <form [formGroup]="form" (ngSubmit)="enregistrer()">
        @if (createur(); as c) {
          <p class="aide encart-membre">« {{ model.nom }} » est fait ensemble : {{ c }} règle le nom et le rythme pour tout le monde. Ici, tu choisis ton rappel et qui le voit.</p>
        }
        <formly-form [form]="form" [fields]="champs" [model]="model" [options]="options" />
        <p-button type="submit" label="Enregistrer" [loading]="enCours()" styleClass="w-full" />
      </form>
    }
  `,
})
export class ObjectifFormPage implements OnInit {
  protected readonly navigation = inject(NavigationService);
  readonly id = input<string>();

  private readonly api = inject(ObjectifsService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationsService);

  protected readonly form = new FormGroup({});
  protected model: Partial<ObjectifSaisie> = {};
  protected readonly pret = signal(false);
  protected readonly enCours = signal(false);
  /** Objectif fait ensemble créé par quelqu'un d'autre : son nom, sinon null. */
  protected readonly createur = signal<string | null>(null);
  protected readonly options = { formState: { membre: false } };
  private readonly amis = inject(AmisService);
  private original: ObjectifSaisie | null = null;

  // Champs construits depuis le schéma ObjectifSaisie, avec deux règles d'affichage
  protected readonly champs: FormlyFieldConfig[] = inject(SchemaFormService).champs('ObjectifSaisie', {
    cible: {
      type: 'radio',
      props: { options: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: n, label: String(n) })) },
      expressions: { hide: 'model.typeFrequence === "QUOTIDIEN" || formState.membre' },
    },
    // Objectif fait ensemble : seul son créateur change le nom, la catégorie, le rythme et la quantité
    nom: { expressions: { hide: 'formState.membre' } },
    categorie: { expressions: { hide: 'formState.membre' } },
    typeFrequence: { expressions: { hide: 'formState.membre' } },
    mesure: { expressions: { hide: 'formState.membre' } },
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
      type: 'quantite',
      props: { dureeMax: 99 * 60 },
      expressions: {
        hide: '!model.mesure || model.mesure === "AUCUNE" || formState.membre',
        'props.duree': 'model.mesure === "MINUTES"',
        'props.label': (f: FormlyFieldConfig) =>
          f.model?.mesure === 'MINUTES' ? 'Temps visé par semaine (facultatif)' : 'Total visé par semaine (facultatif)',
      },
    },
  });

  ngOnInit(): void {
    const id = this.id();
    if (!id) {
      const reprise = (history.state as { saisie?: Partial<ObjectifSaisie> } | null)?.saisie;
      if (reprise) this.model = { ...reprise, nom: reprise.nom || undefined };
      this.pret.set(true);
      return;
    }
    this.api.lireObjectif(Number(id)).subscribe((o: Objectif) => {
      this.model = saisieDe(o);
      this.original = saisieDe(o);
      this.amis.communs().subscribe({
        next: (l) => {
          const c = l.find((x) => x.monObjectif === o.id && x.statut === 'ACTIF' && !x.creeParMoi);
          if (c) {
            this.createur.set(c.createur ?? 'Le créateur');
            this.options.formState.membre = true;
          }
          this.pret.set(true);
        },
        error: () => this.pret.set(true),
      });
    });
  }

  enregistrer(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    let saisie = { ...this.model } as ObjectifSaisie;
    // Membre d'un objectif fait ensemble : on garde tels quels les réglages du créateur
    const o = this.original;
    if (this.options.formState.membre && o) {
      saisie = { ...saisie, nom: o.nom, categorie: o.categorie, typeFrequence: o.typeFrequence, cible: o.cible, mesure: o.mesure, objectifQuantite: o.objectifQuantite };
    }
    if (saisie.typeFrequence === 'QUOTIDIEN') saisie.cible = 7;
    if (!estChiffre(saisie.mesure)) saisie.objectifQuantite = undefined;
    if (saisie.categorie === 'SOMMEIL') saisie.rappelAuto = false;
    const id = this.id();
    const appel = id ? this.api.modifierObjectif(Number(id), saisie) : this.api.creerObjectif(saisie);
    this.enCours.set(true);
    appel.subscribe({
      next: (o) => {
        this.notifications.synchroniser();
        this.router.navigate(id ? ['/objectifs', o.id] : ['/'], { replaceUrl: true });
      },
      error: () => this.enCours.set(false),
    });
  }
}
