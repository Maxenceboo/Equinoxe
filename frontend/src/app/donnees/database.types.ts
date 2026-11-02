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
