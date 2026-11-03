/** Boutique : on dépense ses points en jokers en plus et en palettes de couleurs pour les animations. */

export const COUT_JOKER = 200;

export type CodePalette = 'AURORE' | 'OCEAN' | 'FORET' | 'BRAISE' | 'PRISME';

export interface Palette {
  code: CodePalette;
  nom: string;
  /** Trois couleurs : éclat de la coche, confettis, lueur de la fête. */
  couleurs: [string, string, string];
  cout: number;
}

/** Aurore est offerte : tout le monde voit de la couleur dès la première coche. */
export const PALETTES: Palette[] = [
  { code: 'AURORE', nom: 'Aurore', couleurs: ['#ff7aa2', '#ffb36b', '#b48cff'], cout: 0 },
  { code: 'OCEAN', nom: 'Océan', couleurs: ['#3ad6ff', '#4f7dff', '#7cf2d0'], cout: 300 },
  { code: 'FORET', nom: 'Forêt', couleurs: ['#7be37b', '#c6f06a', '#2fbf8f'], cout: 500 },
  { code: 'BRAISE', nom: 'Braise', couleurs: ['#ff5a3c', '#ffb02e', '#ffe066'], cout: 800 },
  { code: 'PRISME', nom: 'Prisme', couleurs: ['#ff4d6d', '#4dd2ff', '#ffe14d'], cout: 1500 },
];

export interface Achats {
  jokers: number;
  palettes: CodePalette[];
}

export function palette(code: string | null | undefined): Palette {
  return PALETTES.find((p) => p.code === code) ?? PALETTES[0];
}

/** Points encore disponibles : tout ce qui a été gagné, moins ce qui a été dépensé. */
export function solde(pointsGagnes: number, achats: Achats): number {
  const depense = achats.jokers * COUT_JOKER + achats.palettes.reduce((t, c) => t + palette(c).cout, 0);
  return Math.max(0, pointsGagnes - depense);
}

export function possede(achats: Achats, code: CodePalette): boolean {
  return palette(code).cout === 0 || achats.palettes.includes(code);
}
