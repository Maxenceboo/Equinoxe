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

const AVEC_COCHES = '*, validation(*), joker_achete(mois)';

/** Adaptateur Supabase : lit et écrit les objectifs et leurs coches, et les convertit pour le domaine. */
@Injectable({ providedIn: 'root' })
export class DepotObjectifs {
  private readonly db = inject(SupabaseService).client;

  async lister(archives: boolean): Promise<ObjectifPerso[]> {
    const { data, error } = await this.db.from('objectif').select(AVEC_COCHES).eq('archive', archives).order('id');
    if (error) throw error;
    return data.map(versDomaine);
  }

  /** Tous les objectifs, archivés compris (pour les points et les badges). */
  async listerTout(): Promise<ObjectifPerso[]> {
    const { data, error } = await this.db.from('objectif').select(AVEC_COCHES).order('id');
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

  async monCodeAmi(): Promise<string> {
    const { data, error } = await this.db.rpc('mon_code_ami');
    if (error) throw error;
    return data;
  }

  async ajouterAmi(code: string): Promise<string> {
    const { data, error } = await this.db.rpc('ajouter_ami', { p_code: code });
    if (error) throw error;
    return data;
  }

  async retirerAmi(id: string): Promise<void> {
    const { error } = await this.db.rpc('retirer_ami', { p_ami: id });
    if (error) throw error;
  }

  /** Mes amis et leurs objectifs visibles (jours cochés seulement). */
  async rejoindreObjectifAmi(objectifId: number): Promise<number> {
    const { data, error } = await this.db.rpc('rejoindre_objectif_ami', { p_objectif: objectifId });
    if (error) throw error;
    return data;
  }

  async amis(): Promise<{ id: string; nom: string; objectifs: (ObjectifPerso & { enCommun: boolean })[] }[]> {
    const [amis, objectifs] = await Promise.all([this.db.rpc('mes_amis'), this.db.rpc('objectifs_amis')]);
    if (amis.error) throw amis.error;
    if (objectifs.error) throw objectifs.error;
    return amis.data.map((a) => ({
      id: a.ami_id,
      nom: a.nom,
      objectifs: objectifs.data.filter((o) => o.ami_id === a.ami_id).map((o) => ({
        id: o.objectif_id,
        nom: o.nom,
        categorie: o.categorie as Categorie,
        typeFrequence: o.type_frequence as TypeFrequence,
        cible: o.cible,
        heure: '00:00',
        couleur: '#ffffff',
        archive: false,
        dateCreation: o.date_creation,
        mesure: null,
        objectifQuantite: null,
        rappelAuto: false,
        cibleDepuis: null,
        codePartage: null,
        coches: (o.jours ?? []).map((jour) => ({ jour })),
        enCommun: !!o.en_commun,
      })),
    }));
  }

  async communs() {
    const { data, error } = await this.db.rpc('mes_communs');
    if (error) throw error;
    return data;
  }

  async inviterCommun(objectifId: number, amiId: string): Promise<void> {
    const { error } = await this.db.rpc('inviter_commun', { p_objectif: objectifId, p_ami: amiId });
    if (error) throw error;
  }

  async accepterCommun(id: number): Promise<number> {
    const { data, error } = await this.db.rpc('accepter_commun', { p_id: id });
    if (error) throw error;
    return data;
  }

  async quitterCommun(id: number): Promise<void> {
    const { error } = await this.db.rpc('quitter_commun', { p_id: id });
    if (error) throw error;
  }

  async amisQuiVoient(objectifId: number): Promise<string[]> {
    const { data, error } = await this.db.rpc('amis_qui_voient', { p_objectif: objectifId });
    if (error) throw error;
    return data.map((a) => a.nom);
  }

  /** Achats de la boutique : nombre de jokers achetés et palettes possédées. */
  async achats(): Promise<{ jokers: number; palettes: string[] }> {
    const [jokers, palettes] = await Promise.all([
      this.db.from('joker_achete').select('id', { count: 'exact', head: true }),
      this.db.from('palette_achetee').select('palette'),
    ]);
    if (jokers.error) throw jokers.error;
    if (palettes.error) throw palettes.error;
    return { jokers: jokers.count ?? 0, palettes: palettes.data.map((p) => p.palette) };
  }

  async acheterJoker(objectifId: number, mois: string): Promise<void> {
    const { error } = await this.db.from('joker_achete').insert({ objectif_id: objectifId, mois });
    if (error) throw error;
  }

  async acheterPalette(palette: string): Promise<void> {
    const { error } = await this.db.from('palette_achetee').insert({ palette });
    if (error) throw error;
  }

}

function versDomaine(l: LigneObjectif & { validation: LigneCoche[]; joker_achete?: { mois: string }[] }): ObjectifPerso {
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
    visibleAmis: l.visible_amis ?? false,
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
    jokersAchetes: (l.joker_achete ?? []).map((j) => j.mois),
  };
}
