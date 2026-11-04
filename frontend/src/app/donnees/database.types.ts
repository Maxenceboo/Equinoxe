export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      binome: {
        Row: {
          depuis: string;
          objectif_id: number;
          utilisateur_id: string;
        };
        ComputedFields: never;
        Insert: {
          depuis?: string;
          objectif_id: number;
          utilisateur_id?: string;
        };
        Update: {
          depuis?: string;
          objectif_id?: number;
          utilisateur_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'binome_objectif_id_fkey';
            columns: ['objectif_id'];
            isOneToOne: false;
            referencedRelation: 'objectif';
            referencedColumns: ['id'];
          },
        ];
      };
      amitie: {
        Row: { a: string; b: string; depuis: string }
        Insert: { a: string; b: string; depuis?: string }
        Update: { a?: string; b?: string; depuis?: string }
        Relationships: []
      }
      encouragement: {
        Row: { a: string; cree_le: string; de: string; foyer_id: number; id: number; type: string; vu: boolean }
        Insert: { a: string; cree_le?: string; de?: string; foyer_id: number; id?: number; type: string; vu?: boolean }
        Update: { a?: string; cree_le?: string; de?: string; foyer_id?: number; id?: number; type?: string; vu?: boolean }
        Relationships: []
      }
      joker_achete: {
        Row: { cree_le: string; id: number; mois: string; objectif_id: number; utilisateur_id: string }
        Insert: { cree_le?: string; id?: number; mois: string; objectif_id: number; utilisateur_id?: string }
        Update: { cree_le?: string; id?: number; mois?: string; objectif_id?: number; utilisateur_id?: string }
        Relationships: [
          { foreignKeyName: 'joker_achete_objectif_id_fkey'; columns: ['objectif_id']; isOneToOne: false; referencedRelation: 'objectif'; referencedColumns: ['id'] },
        ]
      }
      palette_achetee: {
        Row: { cree_le: string; palette: string; utilisateur_id: string }
        Insert: { cree_le?: string; palette: string; utilisateur_id?: string }
        Update: { cree_le?: string; palette?: string; utilisateur_id?: string }
        Relationships: []
      }
      foyer: {
        Row: { code: string; cree_le: string; id: number; nom: string; objectif_semaine: number; recompense: string | null }
        Insert: { code: string; cree_le?: string; id?: number; nom: string; objectif_semaine?: number; recompense?: string | null }
        Update: { code?: string; cree_le?: string; id?: number; nom?: string; objectif_semaine?: number; recompense?: string | null }
        Relationships: []
      }
      foyer_membre: {
        Row: { depuis: string; foyer_id: number; parent: boolean; prenom: string; utilisateur_id: string }
        Insert: { depuis?: string; foyer_id: number; parent?: boolean; prenom: string; utilisateur_id?: string }
        Update: { depuis?: string; foyer_id?: number; parent?: boolean; prenom?: string; utilisateur_id?: string }
        Relationships: []
      }
      objectif: {
        Row: {
          archive: boolean;
          categorie: string;
          cible: number;
          cible_depuis: string | null;
          code_partage: string | null;
          couleur: string;
          date_creation: string;
          heure: string;
          id: number;
          mesure: string | null;
          nom: string;
          objectif_quantite: number | null;
          rappel_auto: boolean;
          type_frequence: string;
          utilisateur_id: string;
          visible_amis: boolean;
        };
        ComputedFields: never;
        Insert: {
          archive?: boolean;
          categorie: string;
          cible: number;
          cible_depuis?: string | null;
          code_partage?: string | null;
          couleur?: string;
          date_creation?: string;
          heure: string;
          id?: number;
          mesure?: string | null;
          nom: string;
          objectif_quantite?: number | null;
          rappel_auto?: boolean;
          type_frequence: string;
          utilisateur_id?: string;
          visible_amis?: boolean;
        };
        Update: {
          archive?: boolean;
          categorie?: string;
          cible?: number;
          cible_depuis?: string | null;
          code_partage?: string | null;
          couleur?: string;
          date_creation?: string;
          heure?: string;
          id?: number;
          mesure?: string | null;
          nom?: string;
          objectif_quantite?: number | null;
          rappel_auto?: boolean;
          type_frequence?: string;
          utilisateur_id?: string;
          visible_amis?: boolean;
        };
        Relationships: [];
      };
      validation: {
        Row: {
          duree_minutes: number | null;
          heure_coche: string | null;
          jour: string;
          objectif_id: number;
          ponctualite: string | null;
          quantite: number | null;
          ressenti: string | null;
          reveil: string | null;
          type_seance: string | null;
        };
        ComputedFields: never;
        Insert: {
          duree_minutes?: number | null;
          heure_coche?: string | null;
          jour: string;
          objectif_id: number;
          ponctualite?: string | null;
          quantite?: number | null;
          ressenti?: string | null;
          reveil?: string | null;
          type_seance?: string | null;
        };
        Update: {
          duree_minutes?: number | null;
          heure_coche?: string | null;
          jour?: string;
          objectif_id?: number;
          ponctualite?: string | null;
          quantite?: number | null;
          ressenti?: string | null;
          reveil?: string | null;
          type_seance?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'validation_objectif_id_fkey';
            columns: ['objectif_id'];
            isOneToOne: false;
            referencedRelation: 'objectif';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      creer_foyer: { Args: { p_nom: string; p_prenom: string }; Returns: string }
      foyer_semaine: {
        Args: { p_foyer: number; p_lundi: string }
        Returns: { coches: number; moi: boolean; objectifs: number; parent: boolean; prenom: string; tenus: number; utilisateur_id: string }[]
      }
      mon_foyer: { Args: Record<PropertyKey, never>; Returns: number }
      rejoindre_foyer: { Args: { p_code: string; p_parent?: boolean; p_prenom: string }; Returns: number }
      est_membre: { Args: { p_foyer: number }; Returns: boolean }
      est_parent: { Args: { p_foyer: number }; Returns: boolean }
      nommer_parent: { Args: { p_foyer: number; p_membre: string }; Returns: undefined }
      enregistrer_push: { Args: { p_endpoint: string; p_p256dh: string; p_auth: string }; Returns: undefined }
      programmer_rappels: { Args: { p_rappels: Json }; Returns: undefined }
      oublier_push: { Args: { p_endpoint: string }; Returns: undefined }
      supprimer_mon_compte: { Args: Record<PropertyKey, never>; Returns: undefined }
      objectifs_suivis: {
        Args: Record<PropertyKey, never>;
        Returns: {
          ami: string;
          categorie: string;
          cible: number;
          date_creation: string;
          jours: string[];
          nom: string;
          objectif_id: number;
          type_frequence: string;
        }[];
      };
      partager_objectif: {
        Args: { p_objectif_id: number };
        Returns: {
          abonnes: number;
          code: string;
        }[];
      };
      rejoindre_binome: { Args: { p_code: string }; Returns: number };
      mon_code_ami: { Args: Record<PropertyKey, never>; Returns: string };
      ajouter_ami: { Args: { p_code: string }; Returns: string };
      retirer_ami: { Args: { p_ami: string }; Returns: undefined };
      mes_amis: { Args: Record<PropertyKey, never>; Returns: { ami_id: string; nom: string; depuis: string }[] };
      objectifs_amis: {
        Args: Record<PropertyKey, never>;
        Returns: {
          objectif_id: number;
          ami_id: string;
          nom: string;
          categorie: string;
          type_frequence: string;
          cible: number;
          date_creation: string;
          jours: string[];
          en_commun?: boolean;
        }[];
      };
      rejoindre_objectif_ami: { Args: { p_objectif: number }; Returns: number };
      inviter_commun: { Args: { p_objectif: number; p_ami: string }; Returns: number };
      accepter_commun: { Args: { p_id: number }; Returns: number };
      quitter_commun: { Args: { p_id: number }; Returns: undefined };
      mes_communs: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: number;
          statut: string;
          demande?: boolean;
          ami_id: string;
          ami: string;
          mon_objectif: number | null;
          nom: string;
          categorie: string;
          type_frequence: string;
          cible: number;
          heure: string;
          depuis: string | null;
          mes_jours: string[];
          jours_ami: string[];
        }[];
      };
      amis_qui_voient: { Args: { p_objectif: number }; Returns: { nom: string }[] };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
