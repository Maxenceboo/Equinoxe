import type { Categorie, Mesure, TypeFrequence } from '../api/generated';

/** Une coche : le jour, et ce qui a été noté (tout est facultatif). */
export interface Coche {
  jour: string;
  typeSeance?: string | null;
  dureeMinutes?: number | null;
  ressenti?: string | null;
  ponctualite?: string | null;
  reveil?: string | null;
  /** Heure de la coche (HH:mm), seulement si elle a été faite le jour même */
  heure?: string | null;
  quantite?: number | null;
}

/** Un objectif et toutes ses coches : c'est sur lui que portent toutes les règles de l'app. */
export interface ObjectifPerso {
  id: number;
  nom: string;
  categorie: Categorie;
  typeFrequence: TypeFrequence;
  /** Fois par semaine (7 pour un objectif quotidien) */
  cible: number;
  /** Heure du rappel, ou heure de coucher visée pour le sommeil (HH:mm) */
  heure: string;
  couleur: string;
  archive: boolean;
  dateCreation: string;
  /** null pour un objectif non chiffré */
  mesure: Exclude<Mesure, 'AUCUNE'> | null;
  objectifQuantite: number | null;
  rappelAuto: boolean;
  /** Dernier changement de cible, null s'il n'a jamais changé */
  cibleDepuis: string | null;
  codePartage: string | null;
  /** Visible par les amis ; sinon privé */
  visibleAmis?: boolean;
  coches: Coche[];
  /** Mois (AAAA-MM) où un joker en plus a été acheté avec des points, une entrée par joker. */
  jokersAchetes?: string[];
}

/** Ce que l'utilisateur détaille en cochant. */
export type DetailsCoche = Pick<Coche, 'typeSeance' | 'dureeMinutes' | 'ressenti' | 'ponctualite' | 'reveil'>;

/** Le moment présent vu du téléphone. */
export interface Maintenant {
  jour: string;
  heure: string;
}
