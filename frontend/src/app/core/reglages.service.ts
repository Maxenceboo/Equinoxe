import { Injectable, signal } from '@angular/core';

const CLE_GRAND_TEXTE = 'equinoxe.grand-texte';

function lire(cle: string): boolean {
  try {
    return localStorage.getItem(cle) === '1';
  } catch {
    return false;
  }
}

/** Réglages d'affichage gardés sur le téléphone. */
@Injectable({ providedIn: 'root' })
export class ReglagesService {
  readonly grandTexte = signal(lire(CLE_GRAND_TEXTE));

  constructor() {
    this.appliquer();
  }

  basculerGrandTexte(): void {
    this.grandTexte.update((v) => !v);
    try {
      localStorage.setItem(CLE_GRAND_TEXTE, this.grandTexte() ? '1' : '0');
    } catch {
      /* stockage indisponible : le réglage vaut pour cette session */
    }
    this.appliquer();
  }

  private appliquer(): void {
    document.documentElement.classList.toggle('grand-texte', this.grandTexte());
  }
}
