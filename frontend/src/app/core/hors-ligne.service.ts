import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Objectif, ValidationSaisie } from '../api/generated';
import { ObjectifsService } from '../application/services';

const CLE_CACHE = 'objectifs.cache';
const CLE_ATTENTE = 'objectifs.attente';

export type ActionEnAttente =
  | { type: 'valider'; id: number; saisie: ValidationSaisie }
  | { type: 'annuler'; id: number; date: string };

/**
 * Mode hors ligne : garde la dernière liste d'objectifs, met de côté les coches faites sans réseau
 * et les envoie dès que le serveur répond à nouveau.
 */
@Injectable({ providedIn: 'root' })
export class HorsLigneService {
  private readonly api = inject(ObjectifsService);
  readonly enAttente = signal<ActionEnAttente[]>(lire<ActionEnAttente[]>(CLE_ATTENTE) ?? []);
  readonly horsLigne = signal(false);
  private envoiEnCours = false;

  static estHorsLigne(e: unknown): boolean {
    return e instanceof HttpErrorResponse && e.status === 0;
  }

  /** À la déconnexion : rien ne doit rester du compte précédent. */
  oublier(): void {
    ecrire(CLE_CACHE, null);
    ecrire(CLE_ATTENTE, null);
    this.enAttente.set([]);
    this.horsLigne.set(false);
  }

  memoriser(objectifs: Objectif[]): void {
    ecrire(CLE_CACHE, objectifs);
  }

  derniereListe(): Objectif[] {
    return lire<Objectif[]>(CLE_CACHE) ?? [];
  }

  mettreDeCote(action: ActionEnAttente): void {
    this.enAttente.update((l) => [...l, action]);
    ecrire(CLE_ATTENTE, this.enAttente());
    this.horsLigne.set(true);
  }

  /** Envoie les actions en attente, dans l'ordre. Renvoie true si tout est parti. */
  async envoyer(): Promise<boolean> {
    if (this.envoiEnCours || this.enAttente().length === 0) return this.enAttente().length === 0;
    this.envoiEnCours = true;
    try {
      while (this.enAttente().length > 0) {
        const a = this.enAttente()[0];
        try {
          if (a.type === 'valider') await firstValueFrom(this.api.validerObjectif(a.id, a.saisie));
          else await firstValueFrom(this.api.annulerValidation(a.id, a.date));
        } catch (e) {
          if (HorsLigneService.estHorsLigne(e)) return false; // toujours pas de réseau : on réessaiera
          // Autre erreur (objectif supprimé…) : l'action est abandonnée
        }
        this.enAttente.update((l) => l.slice(1));
        ecrire(CLE_ATTENTE, this.enAttente());
      }
      this.horsLigne.set(false);
      return true;
    } finally {
      this.envoiEnCours = false;
    }
  }

  /** Applique une coche localement pour que l'écran réagisse même sans réseau. */
  static appliquerLocalement(o: Objectif, cocher: boolean): Objectif {
    const p = o.progression;
    const realisees = Math.max(0, p.realisees + (cocher ? 1 : -1));
    return {
      ...o,
      progression: { ...p, realisees, faitAujourdhui: cocher, atteint: realisees >= p.cible, message: 'Enregistré sur le téléphone, envoi au retour du réseau.' },
    };
  }
}

function lire<T>(cle: string): T | null {
  try {
    const v = localStorage.getItem(cle);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

function ecrire(cle: string, valeur: unknown): void {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* stockage plein ou indisponible */
  }
}
