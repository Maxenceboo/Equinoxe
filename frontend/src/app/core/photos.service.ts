import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseService } from '../donnees/supabase.service';
import { SUPABASE } from '../supabase.config';
import { SessionService } from './session.service';

const TAILLE = 320;

/** Réduit la photo choisie à un carré de 320 px en JPEG (léger à envoyer et à afficher). */
async function carre(fichier: File): Promise<Blob> {
  const image = await createImageBitmap(fichier);
  const cote = Math.min(image.width, image.height);
  const toile = document.createElement('canvas');
  toile.width = toile.height = TAILLE;
  const ctx = toile.getContext('2d');
  if (!ctx) throw new Error('Photo illisible');
  ctx.drawImage(image, (image.width - cote) / 2, (image.height - cote) / 2, cote, cote, 0, 0, TAILLE, TAILLE);
  return new Promise((ok, ko) => toile.toBlob((b) => (b ? ok(b) : ko(new Error('Photo illisible'))), 'image/jpeg', 0.85));
}

/**
 * Photos de profil : la mienne, celles de mes amis et des membres de mes groupes.
 * Elles sont dans le stockage public « photos », sous un nom tiré au hasard.
 */
@Injectable({ providedIn: 'root' })
export class PhotosService {
  private readonly db = inject(SupabaseService).client;
  private readonly session = inject(SessionService);
  private readonly chemins = signal<Map<string, string>>(new Map());
  private chargee = false;
  readonly maPhoto = computed(() => this.url(this.session.utilisateur()?.id));

  url(utilisateurId: string | null | undefined): string | null {
    const chemin = utilisateurId ? this.chemins().get(utilisateurId) : undefined;
    return chemin ? `${SUPABASE.url}/storage/v1/object/public/photos/${chemin}` : null;
  }

  /** Charge les photos (une fois, sauf si on force après un ajout d'ami ou de groupe). */
  async charger(forcer = false): Promise<void> {
    if (this.chargee && !forcer) return;
    this.chargee = true;
    const { data, error } = await this.db.rpc('photos');
    if (error) {
      this.chargee = false;
      return;
    }
    this.chemins.set(new Map(data.map((p) => [p.utilisateur_id, p.chemin])));
  }

  async choisir(fichier: File): Promise<void> {
    const moi = this.session.utilisateur()?.id;
    if (!moi) return;
    const ancien = this.chemins().get(moi);
    const chemin = `${moi}/${crypto.randomUUID().slice(0, 8)}.jpg`;
    const { error } = await this.db.storage.from('photos').upload(chemin, await carre(fichier), { contentType: 'image/jpeg' });
    if (error) throw error;
    const { error: e2 } = await this.db.rpc('choisir_photo', { p_chemin: chemin });
    if (e2) throw e2;
    if (ancien) await this.db.storage.from('photos').remove([ancien]);
    this.chemins.update((m) => new Map(m).set(moi, chemin));
  }

  async retirer(): Promise<void> {
    const moi = this.session.utilisateur()?.id;
    const ancien = moi ? this.chemins().get(moi) : undefined;
    if (!moi || !ancien) return;
    const { error } = await this.db.rpc('choisir_photo', { p_chemin: null });
    if (error) throw error;
    await this.db.storage.from('photos').remove([ancien]);
    this.chemins.update((m) => {
      const n = new Map(m);
      n.delete(moi);
      return n;
    });
  }

  vider(): void {
    this.chemins.set(new Map());
    this.chargee = false;
  }
}
