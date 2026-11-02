import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import { ThemeNoir } from './theme';
import { provideFormlyCore } from '@ngx-formly/core';
import { withFormlyPrimeNG } from '@ngx-formly/primeng';

import { routes } from './app.routes';
import { Configuration } from './api/generated';
import { SessionService } from './core/session.service';
import { erreurInterceptor } from './core/erreur.interceptor';
import { messagesValidation } from './core/schema-form.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions({ skipInitialTransition: true })),
    provideHttpClient(withInterceptors([erreurInterceptor])),
    providePrimeNG({
      theme: { preset: ThemeNoir, options: { darkModeSelector: '.sombre' } },
    }),
    provideFormlyCore([...withFormlyPrimeNG(), { validationMessages: messagesValidation }]),
    MessageService,
    // Client généré depuis OpenAPI : adresse du serveur et jeton JWT
    {
      provide: Configuration,
      useFactory: () => {
        const session = inject(SessionService);
        return new Configuration({
          basePath: session.adresseServeur(),
          credentials: { bearerAuth: () => session.token() ?? undefined },
        });
      },
    },
  ],
};
