import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import { ThemeNoir } from './theme';
import { provideFormlyCore } from '@ngx-formly/core';
import { withFormlyPrimeNG } from '@ngx-formly/primeng';
import { ChampQuantite } from './shared/champ-quantite';

import { routes } from './app.routes';
import { SessionService } from './core/session.service';
import { messagesValidation } from './core/schema-form.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions({ skipInitialTransition: true })),
    providePrimeNG({
      theme: { preset: ThemeNoir, options: { darkModeSelector: '.sombre' } },
    }),
    provideFormlyCore([
      ...withFormlyPrimeNG(),
      { validationMessages: messagesValidation, types: [{ name: 'quantite', component: ChampQuantite, wrappers: ['form-field'] }] },
    ]),
    MessageService,
    // Reprend la session Supabase avant d'afficher le premier écran
    provideAppInitializer(() => inject(SessionService).demarrer()),
  ],
};
