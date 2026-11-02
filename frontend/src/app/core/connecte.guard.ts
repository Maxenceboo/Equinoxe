import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

export const connecteGuard: CanActivateFn = () =>
  inject(SessionService).connecte() || inject(Router).createUrlTree(['/connexion']);
