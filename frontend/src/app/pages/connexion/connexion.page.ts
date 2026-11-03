import { Component, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FormlyForm } from '@ngx-formly/core';
import { Button } from 'primeng/button';
import { Observable } from 'rxjs';
import { Identifiants } from '../../api/generated';
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

      <form [formGroup]="form" (ngSubmit)="envoyer()">
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
  protected readonly enCours = signal(false);

  envoyer(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const identifiants = this.model as Identifiants;
    const appel: Observable<Session> = this.modeInscription()
      ? this.auth.inscription(identifiants)
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
