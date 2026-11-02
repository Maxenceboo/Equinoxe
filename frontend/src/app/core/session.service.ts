import { Injectable, computed, signal } from '@angular/core';

const CLE_TOKEN = 'objectifs.token';
const CLE_EMAIL = 'objectifs.email';
const CLE_SERVEUR = 'objectifs.serveur';
export const SERVEUR_PAR_DEFAUT = 'http://localhost:8080/api';

/** Session de l'utilisateur, gardée dans le stockage local (navigateur ou webview Android). */
@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly token = signal<string | null>(lire(CLE_TOKEN));
  readonly email = signal<string | null>(lire(CLE_EMAIL));
  readonly adresseServeur = signal<string>(lire(CLE_SERVEUR) ?? SERVEUR_PAR_DEFAUT);
  readonly connecte = computed(() => this.token() !== null);

  ouvrir(token: string, email: string): void {
    ecrire(CLE_TOKEN, token);
    ecrire(CLE_EMAIL, email);
    this.token.set(token);
    this.email.set(email);
  }

  fermer(): void {
    ecrire(CLE_TOKEN, null);
    ecrire(CLE_EMAIL, null);
    this.token.set(null);
    this.email.set(null);
  }

  /** Change l'adresse du serveur ; le client API la relit au rechargement de l'app. */
  changerServeur(adresse: string): void {
    ecrire(CLE_SERVEUR, adresse.replace(/\/+$/, ''));
    location.reload();
  }
}

function lire(cle: string): string | null {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}

function ecrire(cle: string, valeur: string | null): void {
  try {
    if (valeur === null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, valeur);
  } catch {
    /* stockage indisponible : la session reste en mémoire */
  }
}
