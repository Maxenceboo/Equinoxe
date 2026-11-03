import { Injectable, signal } from '@angular/core';
import { CodePalette, palette } from '../domaine/boutique';

const CLE_GRAND_TEXTE = 'equinoxe.grand-texte';
const CLE_PALETTE = 'equinoxe.palette';

function lire(cle: string): string | null {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}

function ecrire(cle: string, valeur: string): void {
  try {
    localStorage.setItem(cle, valeur);
  } catch {
    /* stockage indisponible : le réglage vaut pour cette session */
  }
}

/** Réglages d'affichage gardés sur le téléphone : grand texte, palette des animations. */
@Injectable({ providedIn: 'root' })
export class ReglagesService {
  readonly grandTexte = signal(lire(CLE_GRAND_TEXTE) === '1');
  /** Couleurs qui n'apparaissent que pendant les animations (coche, fête). */
  readonly palette = signal<CodePalette>(palette(lire(CLE_PALETTE)).code);

  constructor() {
    this.appliquer();
  }

  basculerGrandTexte(): void {
    this.grandTexte.update((v) => !v);
    ecrire(CLE_GRAND_TEXTE, this.grandTexte() ? '1' : '0');
    this.appliquer();
  }

  choisirPalette(code: CodePalette): void {
    this.palette.set(code);
    ecrire(CLE_PALETTE, code);
    this.appliquer();
  }

  private appliquer(): void {
    const html = document.documentElement;
    html.classList.toggle('grand-texte', this.grandTexte());
    palette(this.palette()).couleurs.forEach((c, i) => html.style.setProperty(`--eclat-${i + 1}`, c));
  }
}
