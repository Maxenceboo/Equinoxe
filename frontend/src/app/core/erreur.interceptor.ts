import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { SessionService } from './session.service';
import type { Erreur } from '../api/generated';

/** Affiche les erreurs de l'API et renvoie vers la connexion si le jeton a expiré. */
export const erreurInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const router = inject(Router);
  const messages = inject(MessageService);
  return next(req).pipe(
    catchError((e: HttpErrorResponse) => {
      const auth = req.url.includes('/auth/');
      if (e.status === 401 && !auth) {
        session.fermer();
        router.navigate(['/connexion']);
      } else {
        const corps = e.error as Partial<Erreur> | null;
        messages.add({
          severity: 'error',
          summary: e.status === 0 ? 'Serveur injoignable' : 'Oups',
          detail: e.status === 0 ? `Vérifie que le serveur tourne (${session.adresseServeur()})` : corps?.message,
        });
      }
      return throwError(() => e);
    }),
  );
};
