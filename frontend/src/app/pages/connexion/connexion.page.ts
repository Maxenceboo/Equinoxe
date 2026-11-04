import { Component, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FormlyForm } from '@ngx-formly/core';
import { Button } from 'primeng/button';
import { Observable } from 'rxjs';
import { Identifiant, Identifiants, RejoindreFoyer } from '../../api/generated';
import { AuthService, Session } from '../../application/services';
import { SchemaFormService } from '../../core/schema-form.service';
import { SessionService } from '../../core/session.service';

@Component({
  selector: 'app-connexion',
  imports: [ReactiveFormsModule, FormlyForm, Button],
  template: `
    <section class="connexion">
      <svg class="logo" viewBox="0 0 100 100" aria-hidden="true">
        <mask id="logo-creux">
          <rect width="100" height="100" fill="#fff" />
          <circle cx="50" cy="42" r="27" fill="#000" />
        </mask>
        <circle cx="50" cy="52" r="32" fill="#fff" mask="url(#logo-creux)" />
        <circle cx="50" cy="58" r="11" fill="#fff" />
      </svg>
      <h1>Équinoxe</h1>
      <p class="sous-titre">Le jour pour avancer, la nuit pour récupérer.</p>

      @if (modeCode()) {
        <p class="aide">Entre le code à 6 chiffres qu'on t'a donné, et ton prénom. Pas besoin d'email.</p>
        <form [formGroup]="formCode" (ngSubmit)="entrerAvecCode()">
          <formly-form [form]="formCode" [fields]="champsCode" [model]="modelCode" />
          <p-button type="submit" label="Entrer" [loading]="enCours()" styleClass="w-full" />
        </form>
        <p-button label="J'ai un compte avec email" [text]="true" (onClick)="modeCode.set(false)" />
      } @else {
      <p-button label="Continuer avec Google" icon="pi pi-google" [outlined]="true" styleClass="w-full" [loading]="google()" (onClick)="avecGoogle()" />
      <div class="separateur"><span>ou avec ton email</span></div>

      <form [formGroup]="form" (ngSubmit)="envoyer()">
        @if (modeInscription()) {
          <formly-form [form]="formPseudo" [fields]="champsPseudo" [model]="modelPseudo" />
        }
        <formly-form [form]="form" [fields]="champs" [model]="model" />
        <p-button
          type="submit"
          [label]="modeInscription() ? 'Créer mon compte' : 'Se connecter'"
          [loading]="enCours()"
          styleClass="w-full"
        />
      </form>

      <p-button
        [label]="modeInscription() ? 'J\\'ai déjà un compte' : 'Pas encore de compte ? S\\'inscrire'"
        [text]="true"
        (onClick)="modeInscription.set(!modeInscription())"
      />

      <div class="separateur"><span>ou</span></div>
      <p-button label="J'ai un code de groupe" icon="pi pi-home" [outlined]="true" styleClass="w-full" (onClick)="modeCode.set(true)" />
      }

    </section>
  `,
})
export class ConnexionPage {
  protected readonly session = inject(SessionService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({});
  protected readonly model: Partial<Identifiants> = {};
  protected readonly champs = inject(SchemaFormService).champs('Identifiants');
  protected readonly modeInscription = signal(false);
  protected readonly formPseudo = new FormGroup({});
  protected readonly modelPseudo: Partial<Identifiant> = {};
  protected readonly champsPseudo = inject(SchemaFormService).champs('Identifiant', {
    pseudo: { props: { placeholder: 'ex. lea.martin', attributes: { autocapitalize: 'none', autocomplete: 'username' } } },
  });
  protected readonly google = signal(false);

  avecGoogle(): void {
    this.google.set(true);
    this.auth.connexionGoogle().subscribe({ error: () => this.google.set(false) });
  }
  protected readonly modeCode = signal(false);
  protected readonly formCode = new FormGroup({});
  protected readonly modelCode: Partial<RejoindreFoyer> = {};
  protected readonly champsCode = inject(SchemaFormService).champs('RejoindreFoyer', {
    code: { props: { attributes: { inputmode: 'numeric', autocomplete: 'off' } } },
  });

  entrerAvecCode(): void {
    this.formCode.markAllAsTouched();
    if (this.formCode.invalid) return;
    const { code, prenom } = this.modelCode as RejoindreFoyer;
    this.enCours.set(true);
    this.auth.rejoindreSansCompte(code, prenom).subscribe({
      next: () => {
        this.session.ouvrir(null, true);
        this.router.navigate(['/'], { replaceUrl: true });
      },
      error: () => this.enCours.set(false),
    });
  }
  protected readonly enCours = signal(false);

  envoyer(): void {
    this.form.markAllAsTouched();
    this.formPseudo.markAllAsTouched();
    if (this.form.invalid || (this.modeInscription() && this.formPseudo.invalid)) return;
    const identifiants = this.model as Identifiants;
    const appel: Observable<Session> = this.modeInscription()
      ? this.auth.inscription(identifiants, this.modelPseudo.pseudo ?? '')
      : this.auth.connexion(identifiants);
    this.enCours.set(true);
    appel.subscribe({
      next: (s) => {
        this.session.ouvrir(s.email);
        this.router.navigate(['/'], { replaceUrl: true });
      },
      error: () => this.enCours.set(false),
    });
  }
}
