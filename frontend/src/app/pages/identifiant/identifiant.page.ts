import { Component, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FormlyForm } from '@ngx-formly/core';
import { Button } from 'primeng/button';
import { Identifiant } from '../../api/generated';
import { AmisService } from '../../application/services';
import { NavigationService } from '../../core/navigation.service';
import { SchemaFormService } from '../../core/schema-form.service';

/** Choisir (ou changer) son identifiant : demandé une fois aux comptes qui n'en ont pas encore. */
@Component({
  selector: 'app-identifiant',
  imports: [ReactiveFormsModule, FormlyForm, Button],
  template: `
    <header class="entete">
      @if (amis.pseudo()) {
        <p-button icon="pi pi-arrow-left" [text]="true" ariaLabel="Retour" (onClick)="navigation.retour()" />
      }
      <div>
        <h1>{{ amis.pseudo() ? 'Ton identifiant' : 'Choisis ton identifiant' }}</h1>
        <small>Tes amis t'ajoutent avec, et c'est le nom qu'ils voient.</small>
      </div>
    </header>
    <form [formGroup]="form" (ngSubmit)="enregistrer()">
      <formly-form [form]="form" [fields]="champs" [model]="model" />
      <p-button type="submit" label="C'est mon identifiant" [loading]="enCours()" styleClass="w-full" />
    </form>
  `,
})
export class IdentifiantPage {
  protected readonly amis = inject(AmisService);
  protected readonly navigation = inject(NavigationService);
  private readonly router = inject(Router);
  protected readonly form = new FormGroup({});
  protected readonly model: Partial<Identifiant> = { pseudo: this.amis.pseudo() ?? undefined };
  protected readonly champs = inject(SchemaFormService).champs('Identifiant', {
    pseudo: { props: { placeholder: 'ex. lea.martin', attributes: { autocapitalize: 'none', autocomplete: 'username' } } },
  });
  protected readonly enCours = signal(false);

  enregistrer(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.model.pseudo) return;
    const changement = !!this.amis.pseudo();
    this.enCours.set(true);
    this.amis.choisirPseudo(this.model.pseudo).subscribe({
      next: () => (changement ? this.navigation.retour() : void this.router.navigateByUrl('/', { replaceUrl: true })),
      error: () => this.enCours.set(false),
    });
  }
}
