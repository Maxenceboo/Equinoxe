import { Injectable, inject } from '@angular/core';
import type { Categorie, Mesure, TypeFrequence } from '../api/generated';
import { Coche, ObjectifPerso } from '../domaine/modele';
import { Database } from './database.types';
import { SupabaseService } from './supabase.service';

type LigneObjectif = Database['public']['Tables']['objectif']['Row'];
type LigneCoche = Database['public']['Tables']['validation']['Row'];
export type ReglagesObjectif = Omit<
  Database['public']['Tables']['objectif']['Insert'],
  'id' | 'utilisateur_id' | 'code_partage' | 'archive'
>;

const AVEC_COCHES = '*, validation(*)';

/** Adaptateur Supabase : lit et écrit les objectifs et leurs coches, et les convertit pour le domaine. */
@Injectable({ providedIn: 'root' })
export class DepotObjectifs {
  private readonly db = inject(SupabaseService).client;

  async lister(archives: boolean): Promise<ObjectifPerso[]> {
    const { data, error } = await this.db.from('objectif').select(AVEC_COCHES).eq('archive', archives).order('id');
    if (error) throw error;
    return data.map(versDomaine);
  }

  async lire(id: number): Promise<ObjectifPerso> {
    const { data, error } = await this.db.from('objectif').select(AVEC_COCHES).eq('id', id).single();
    if (error) throw error;
    return versDomaine(data);
  }

  async creer(reglages: ReglagesObjectif): Promise<ObjectifPerso> {
    const { data, error } = await this.db.from('objectif').insert(reglages).select(AVEC_COCHES).single();
    if (error) throw error;
    return versDomaine(data);
  }

  async modifier(id: number, champs: Database['public']['Tables']['objectif']['Update']): Promise<ObjectifPerso> {
    const { data, error } = await this.db.from('objectif').update(champs).eq('id', id).select(AVEC_COCHES).single();
    if (error) throw error;
    return versDomaine(data);
  }

  async enregistrerCoche(objectifId: number, c: Coche): Promise<void> {
    const { error } = await this.db.from('validation').upsert({
      objectif_id: objectifId,
      jour: c.jour,
      type_seance: c.typeSeance ?? null,
      duree_minutes: c.dureeMinutes ?? null,
      ressenti: c.ressenti ?? null,
      ponctualite: c.ponctualite ?? null,
      reveil: c.reveil ?? null,
      heure_coche: c.heure ?? null,
      quantite: c.quantite ?? null,
    });
    if (error) throw error;
  }

  async supprimerCoche(objectifId: number, jour: string): Promise<void> {
    const { error } = await this.db.from('validation').delete().eq('objectif_id', objectifId).eq('jour', jour);
    if (error) throw error;
  }

  async partager(objectifId: number): Promise<{ code: string; abonnes: number }> {
    const { data, error } = await this.db.rpc('partager_objectif', { p_objectif_id: objectifId });
    if (error) throw error;
    return data[0];
  }

  async rejoindre(code: string): Promise<number> {
    const { data, error } = await this.db.rpc('rejoindre_binome', { p_code: code });
    if (error) throw error;
    return data;
  }

  /** Objectifs d'amis suivis, sous forme d'objectifs du domaine (jours cochés seulement). */
  async suivis(): Promise<(ObjectifPerso & { ami: string })[]> {
    const { data, error } = await this.db.rpc('objectifs_suivis');
    if (error) throw error;
    return data.map((s) => ({
      id: s.objectif_id,
      nom: s.nom,
      ami: s.ami,
      categorie: s.categorie as Categorie,
      typeFrequence: s.type_frequence as TypeFrequence,
      cible: s.cible,
      heure: '00:00',
      couleur: '#ffffff',
      archive: false,
      dateCreation: s.date_creation,
      mesure: null,
      objectifQuantite: null,
      rappelAuto: false,
      cibleDepuis: null,
      codePartage: null,
      coches: (s.jours ?? []).map((jour) => ({ jour })),
    }));
  }

  async quitter(objectifId: number): Promise<void> {
    const { error } = await this.db.from('binome').delete().eq('objectif_id', objectifId);
    if (error) throw error;
  }
}

function versDomaine(l: LigneObjectif & { validation: LigneCoche[] }): ObjectifPerso {
  return {
    id: l.id,
    nom: l.nom,
    categorie: l.categorie as Categorie,
    typeFrequence: l.type_frequence as TypeFrequence,
    cible: l.cible,
    heure: l.heure.slice(0, 5),
    couleur: l.couleur,
    archive: l.archive,
    dateCreation: l.date_creation,
    mesure: (l.mesure as Exclude<Mesure, 'AUCUNE'> | null) ?? null,
    objectifQuantite: l.objectif_quantite,
    rappelAuto: l.rappel_auto,
    cibleDepuis: l.cible_depuis,
    codePartage: l.code_partage,
    coches: l.validation.map((v) => ({
      jour: v.jour,
      typeSeance: v.type_seance,
      dureeMinutes: v.duree_minutes,
      ressenti: v.ressenti,
      ponctualite: v.ponctualite,
      reveil: v.reveil,
      heure: v.heure_coche?.slice(0, 5) ?? null,
      quantite: v.quantite,
    })),
  };
}
