// AUTOGENERERAD – redigera inte för hand.
// Regenereras med Supabase CLI mot produktionsschemat:
//   npx supabase gen types typescript --project-id <ref> --schema public > types/supabase.ts
// Delade domäntyper (Garment, Outfit, WishItem, Profile) byggs ovanpå denna i
// types/models.ts – importera dem därifrån, inte härifrån.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_quota: {
        Row: {
          count: number
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          count: number
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      collages: {
        Row: {
          canvas_height: number | null
          canvas_width: number | null
          created_at: string
          id: string
          items: Json
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          canvas_height?: number | null
          canvas_width?: number | null
          created_at?: string
          id?: string
          items?: Json
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          canvas_height?: number | null
          canvas_width?: number | null
          created_at?: string
          id?: string
          items?: Json
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          pro_until: string | null
          product_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          pro_until?: string | null
          product_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          pro_until?: string | null
          product_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      garment_sets: {
        Row: {
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      garments: {
        Row: {
          archive_reason: string | null
          archived: boolean | null
          brand: string | null
          category: string | null
          color: string | null
          created_at: string | null
          fit: string | null
          for_sale: boolean | null
          household_id: string | null
          id: string
          image_url: string | null
          in_laundry: boolean
          last_worn: string | null
          lendable: boolean | null
          location: string | null
          maternity_friendly: boolean
          name: string
          paused_pregnancy: boolean
          person_id: string | null
          price: number | null
          season: string | null
          set_id: string | null
          size: string | null
          size_cm: number | null
          sold: boolean | null
          status: string | null
          subcategory: string | null
          times_worn: number | null
          user_id: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived?: boolean | null
          brand?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          fit?: string | null
          for_sale?: boolean | null
          household_id?: string | null
          id?: string
          image_url?: string | null
          in_laundry?: boolean
          last_worn?: string | null
          lendable?: boolean | null
          location?: string | null
          maternity_friendly?: boolean
          name: string
          paused_pregnancy?: boolean
          person_id?: string | null
          price?: number | null
          season?: string | null
          set_id?: string | null
          size?: string | null
          size_cm?: number | null
          sold?: boolean | null
          status?: string | null
          subcategory?: string | null
          times_worn?: number | null
          user_id?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived?: boolean | null
          brand?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          fit?: string | null
          for_sale?: boolean | null
          household_id?: string | null
          id?: string
          image_url?: string | null
          in_laundry?: boolean
          last_worn?: string | null
          lendable?: boolean | null
          location?: string | null
          maternity_friendly?: boolean
          name?: string
          paused_pregnancy?: boolean
          person_id?: string | null
          price?: number | null
          season?: string | null
          set_id?: string | null
          size?: string | null
          size_cm?: number | null
          sold?: boolean | null
          status?: string | null
          subcategory?: string | null
          times_worn?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garments_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "garment_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          household_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          household_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          household_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string | null
          household_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          household_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          household_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          created_at: string | null
          id: string
          is_archive: boolean
          name: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archive?: boolean
          name: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archive?: boolean
          name?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: []
      }
      moodboard: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      outfit_calendar: {
        Row: {
          created_at: string | null
          date: string
          id: string
          outfit_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          outfit_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          outfit_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outfit_calendar_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
        ]
      }
      outfit_likes: {
        Row: {
          created_at: string | null
          outfit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          outfit_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          outfit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_likes_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
        ]
      }
      outfits: {
        Row: {
          context: string | null
          created_at: string | null
          garment_ids: string[] | null
          garment_names: string[] | null
          id: string
          image_urls: string[] | null
          mood: string | null
          name: string | null
          person_id: string | null
          rating: number | null
          saved: boolean
          style: string | null
          temperature: number | null
          user_id: string | null
          weather_condition: string | null
          worn_on: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          garment_ids?: string[] | null
          garment_names?: string[] | null
          id?: string
          image_urls?: string[] | null
          mood?: string | null
          name?: string | null
          person_id?: string | null
          rating?: number | null
          saved?: boolean
          style?: string | null
          temperature?: number | null
          user_id?: string | null
          weather_condition?: string | null
          worn_on?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string | null
          garment_ids?: string[] | null
          garment_names?: string[] | null
          id?: string
          image_urls?: string[] | null
          mood?: string | null
          name?: string | null
          person_id?: string | null
          rating?: number | null
          saved?: boolean
          style?: string | null
          temperature?: number | null
          user_id?: string | null
          weather_condition?: string | null
          worn_on?: string | null
        }
        Relationships: []
      }
      pending_imports: {
        Row: {
          brand: string | null
          category: string | null
          color: string | null
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          order_date: string | null
          price: string | null
          season: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          order_date?: string | null
          price?: string | null
          season?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          order_date?: string | null
          price?: string | null
          season?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          avatar_url: string | null
          birthdate: string | null
          created_at: string | null
          current_size_cm: number | null
          gender: string | null
          household_id: string
          id: string
          name: string
          size_updated_at: string | null
          type: string
        }
        Insert: {
          avatar_url?: string | null
          birthdate?: string | null
          created_at?: string | null
          current_size_cm?: number | null
          gender?: string | null
          household_id: string
          id?: string
          name: string
          size_updated_at?: string | null
          type?: string
        }
        Update: {
          avatar_url?: string | null
          birthdate?: string | null
          created_at?: string | null
          current_size_cm?: number | null
          gender?: string | null
          household_id?: string
          id?: string
          name?: string
          size_updated_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          avoid_note: string | null
          birthday: string | null
          capsule_garment_ids: string | null
          city: string | null
          cold_sensitivity: number
          color_analysis: Json | null
          color_prefs: string | null
          current_season: string | null
          due_date: string | null
          fargsatt: string | null
          forward_code: string | null
          forward_link: string | null
          gender: string | null
          id: string
          import_token: string | null
          last_import_status: string | null
          last_notif_date: string | null
          last_notif_kind: string | null
          last_size_digest: string | null
          life_mode: string | null
          livsstil: string | null
          music_genres: string | null
          name: string | null
          notif_enabled: boolean
          notif_prefs: Json
          lang: string | null
          outfit_context_notes: Json
          pregnant: boolean
          push_lat: number | null
          push_lon: number | null
          push_platform: string | null
          push_token: string | null
          stil_profil: string | null
          style_prefs: string | null
          style_rules: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          avoid_note?: string | null
          birthday?: string | null
          capsule_garment_ids?: string | null
          city?: string | null
          cold_sensitivity?: number
          color_analysis?: Json | null
          color_prefs?: string | null
          current_season?: string | null
          due_date?: string | null
          fargsatt?: string | null
          forward_code?: string | null
          forward_link?: string | null
          gender?: string | null
          id: string
          import_token?: string | null
          last_import_status?: string | null
          last_notif_date?: string | null
          last_notif_kind?: string | null
          last_size_digest?: string | null
          life_mode?: string | null
          livsstil?: string | null
          music_genres?: string | null
          name?: string | null
          notif_enabled?: boolean
          notif_prefs?: Json
          lang?: string | null
          outfit_context_notes?: Json
          pregnant?: boolean
          push_lat?: number | null
          push_lon?: number | null
          push_platform?: string | null
          push_token?: string | null
          stil_profil?: string | null
          style_prefs?: string | null
          style_rules?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          avoid_note?: string | null
          birthday?: string | null
          capsule_garment_ids?: string | null
          city?: string | null
          cold_sensitivity?: number
          color_analysis?: Json | null
          color_prefs?: string | null
          current_season?: string | null
          due_date?: string | null
          fargsatt?: string | null
          forward_code?: string | null
          forward_link?: string | null
          gender?: string | null
          id?: string
          import_token?: string | null
          last_import_status?: string | null
          last_notif_date?: string | null
          last_notif_kind?: string | null
          last_size_digest?: string | null
          life_mode?: string | null
          livsstil?: string | null
          music_genres?: string | null
          name?: string | null
          notif_enabled?: boolean
          notif_prefs?: Json
          lang?: string | null
          outfit_context_notes?: Json
          pregnant?: boolean
          push_lat?: number | null
          push_lon?: number | null
          push_platform?: string | null
          push_token?: string | null
          stil_profil?: string | null
          style_prefs?: string | null
          style_rules?: string | null
          username?: string | null
        }
        Relationships: []
      }
      trips: {
        Row: {
          data: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          data?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          data?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          brand: string | null
          category: string | null
          color: string | null
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          notes: string | null
          price: number | null
          season: string | null
          sort_order: number | null
          subcategory: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          price?: number | null
          season?: string | null
          sort_order?: number | null
          subcategory?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          price?: number | null
          season?: string | null
          sort_order?: number | null
          subcategory?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_garment_wear: {
        Args: { p_date?: string; p_delta: number; p_ids: string[] }
        Returns: undefined
      }
      ai_credits_left: {
        Args: { max_free: number; window_seconds: number }
        Returns: number
      }
      bump_rate_limit: {
        Args: { max_calls: number; window_seconds: number }
        Returns: boolean
      }
      create_partner_invite: { Args: never; Returns: string }
      ensure_household: { Args: never; Returns: string }
      is_household_member: { Args: { target: string }; Returns: boolean }
      join_by_invite: { Args: { invite_code: string }; Returns: string }
      leave_household: { Args: never; Returns: undefined }
      my_household_ids: { Args: never; Returns: string[] }
      partner_calendar: {
        Args: { target: string }
        Returns: {
          created_at: string | null
          date: string
          id: string
          outfit_id: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "outfit_calendar"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      partner_garments: {
        Args: { target: string }
        Returns: {
          archive_reason: string | null
          archived: boolean | null
          brand: string | null
          category: string | null
          color: string | null
          created_at: string | null
          fit: string | null
          for_sale: boolean | null
          household_id: string | null
          id: string
          image_url: string | null
          in_laundry: boolean
          last_worn: string | null
          lendable: boolean | null
          location: string | null
          maternity_friendly: boolean
          name: string
          paused_pregnancy: boolean
          person_id: string | null
          price: number | null
          season: string | null
          set_id: string | null
          size: string | null
          size_cm: number | null
          sold: boolean | null
          status: string | null
          subcategory: string | null
          times_worn: number | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "garments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      partner_outfits: {
        Args: { target: string }
        Returns: {
          context: string | null
          created_at: string | null
          garment_ids: string[] | null
          garment_names: string[] | null
          id: string
          image_urls: string[] | null
          mood: string | null
          name: string | null
          rating: number | null
          saved: boolean
          style: string | null
          temperature: number | null
          user_id: string | null
          weather_condition: string | null
          worn_on: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "outfits"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      partner_profile: {
        Args: { target: string }
        Returns: {
          avatar_url: string
          id: string
          name: string
        }[]
      }
      partner_trip: { Args: { target: string }; Returns: Json }
      partner_wishlist: {
        Args: { target: string }
        Returns: {
          brand: string | null
          category: string | null
          color: string | null
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          notes: string | null
          price: number | null
          season: string | null
          sort_order: number | null
          subcategory: string | null
          url: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "wishlist"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      save_partner_outfit: {
        Args: {
          p_garment_names: string[]
          p_image_urls: string[]
          p_name: string
          target: string
        }
        Returns: string
      }
      toggle_outfit_like: { Args: { target_outfit: string }; Returns: boolean }
      use_ai_credit: {
        Args: { max_free: number; window_seconds: number }
        Returns: boolean
      }
      wear_partner_outfit: {
        Args: {
          p_date: string
          p_garment_names: string[]
          p_image_urls: string[]
          p_name: string
          target: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
