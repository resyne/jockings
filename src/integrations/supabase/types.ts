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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      call_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          phone_number_id: string | null
          position: number | null
          prank_id: string
          scheduled_for: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          phone_number_id?: string | null
          position?: number | null
          prank_id: string
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          phone_number_id?: string | null
          position?: number | null
          prank_id?: string
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_queue_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "twilio_phone_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_queue_prank_id_fkey"
            columns: ["prank_id"]
            isOneToOne: false
            referencedRelation: "pranks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_queue_prank_id_fkey"
            columns: ["prank_id"]
            isOneToOne: false
            referencedRelation: "pranks_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      prank_presets: {
        Row: {
          background_sound_enabled: boolean | null
          background_sound_prompt: string | null
          background_sound_url: string | null
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          theme: string
          title: string
          updated_at: string
        }
        Insert: {
          background_sound_enabled?: boolean | null
          background_sound_prompt?: string | null
          background_sound_url?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          theme: string
          title: string
          updated_at?: string
        }
        Update: {
          background_sound_enabled?: boolean | null
          background_sound_prompt?: string | null
          background_sound_url?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          theme?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pranks: {
        Row: {
          call_status: string
          conversation_history: Json | null
          created_at: string
          creativity_level: number
          elevenlabs_similarity: number | null
          elevenlabs_speed: number | null
          elevenlabs_stability: number | null
          elevenlabs_style: number | null
          elevenlabs_voice_id: string | null
          id: string
          language: string
          max_duration: number
          personality_tone: string
          prank_theme: string
          pregenerated_background_url: string | null
          pregenerated_greeting_url: string | null
          real_detail: string | null
          recording_url: string | null
          scheduled_at: string | null
          send_recording: boolean
          twilio_call_sid: string | null
          updated_at: string
          user_id: string
          victim_first_name: string
          victim_gender: string | null
          victim_last_name: string
          victim_phone: string
          voice_gender: string
          voice_provider: string
        }
        Insert: {
          call_status?: string
          conversation_history?: Json | null
          created_at?: string
          creativity_level?: number
          elevenlabs_similarity?: number | null
          elevenlabs_speed?: number | null
          elevenlabs_stability?: number | null
          elevenlabs_style?: number | null
          elevenlabs_voice_id?: string | null
          id?: string
          language?: string
          max_duration?: number
          personality_tone?: string
          prank_theme: string
          pregenerated_background_url?: string | null
          pregenerated_greeting_url?: string | null
          real_detail?: string | null
          recording_url?: string | null
          scheduled_at?: string | null
          send_recording?: boolean
          twilio_call_sid?: string | null
          updated_at?: string
          user_id: string
          victim_first_name: string
          victim_gender?: string | null
          victim_last_name: string
          victim_phone: string
          voice_gender: string
          voice_provider?: string
        }
        Update: {
          call_status?: string
          conversation_history?: Json | null
          created_at?: string
          creativity_level?: number
          elevenlabs_similarity?: number | null
          elevenlabs_speed?: number | null
          elevenlabs_stability?: number | null
          elevenlabs_style?: number | null
          elevenlabs_voice_id?: string | null
          id?: string
          language?: string
          max_duration?: number
          personality_tone?: string
          prank_theme?: string
          pregenerated_background_url?: string | null
          pregenerated_greeting_url?: string | null
          real_detail?: string | null
          recording_url?: string | null
          scheduled_at?: string | null
          send_recording?: boolean
          twilio_call_sid?: string | null
          updated_at?: string
          user_id?: string
          victim_first_name?: string
          victim_gender?: string | null
          victim_last_name?: string
          victim_phone?: string
          voice_gender?: string
          voice_provider?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number | null
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number | null
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      twilio_phone_numbers: {
        Row: {
          caller_id_anonymous: boolean | null
          country_code: string
          country_name: string
          created_at: string
          current_calls: number | null
          friendly_name: string | null
          id: string
          is_active: boolean | null
          max_concurrent_calls: number | null
          phone_number: string
          updated_at: string
        }
        Insert: {
          caller_id_anonymous?: boolean | null
          country_code: string
          country_name: string
          created_at?: string
          current_calls?: number | null
          friendly_name?: string | null
          id?: string
          is_active?: boolean | null
          max_concurrent_calls?: number | null
          phone_number: string
          updated_at?: string
        }
        Update: {
          caller_id_anonymous?: boolean | null
          country_code?: string
          country_name?: string
          created_at?: string
          current_calls?: number | null
          friendly_name?: string | null
          id?: string
          is_active?: boolean | null
          max_concurrent_calls?: number | null
          phone_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vapi_phone_numbers: {
        Row: {
          created_at: string
          friendly_name: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          phone_number: string | null
          phone_number_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          friendly_name?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          phone_number?: string | null
          phone_number_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          friendly_name?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          phone_number?: string | null
          phone_number_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      verified_caller_ids: {
        Row: {
          created_at: string
          current_calls: number | null
          friendly_name: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          max_concurrent_calls: number | null
          phone_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_calls?: number | null
          friendly_name?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_concurrent_calls?: number | null
          phone_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_calls?: number | null
          friendly_name?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_concurrent_calls?: number | null
          phone_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      voice_settings: {
        Row: {
          created_at: string
          description: string | null
          elevenlabs_similarity: number | null
          elevenlabs_speed: number | null
          elevenlabs_stability: number | null
          elevenlabs_style: number | null
          elevenlabs_voice_id: string | null
          gender: string
          id: string
          is_active: boolean | null
          language: string
          notes: string | null
          polly_voice_id: string | null
          updated_at: string
          voice_name: string | null
          voice_provider: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          elevenlabs_similarity?: number | null
          elevenlabs_speed?: number | null
          elevenlabs_stability?: number | null
          elevenlabs_style?: number | null
          elevenlabs_voice_id?: string | null
          gender: string
          id?: string
          is_active?: boolean | null
          language: string
          notes?: string | null
          polly_voice_id?: string | null
          updated_at?: string
          voice_name?: string | null
          voice_provider?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          elevenlabs_similarity?: number | null
          elevenlabs_speed?: number | null
          elevenlabs_stability?: number | null
          elevenlabs_style?: number | null
          elevenlabs_voice_id?: string | null
          gender?: string
          id?: string
          is_active?: boolean | null
          language?: string
          notes?: string | null
          polly_voice_id?: string | null
          updated_at?: string
          voice_name?: string | null
          voice_provider?: string
        }
        Relationships: []
      }
    }
    Views: {
      pranks_decrypted: {
        Row: {
          call_status: string | null
          conversation_history: Json | null
          created_at: string | null
          creativity_level: number | null
          elevenlabs_similarity: number | null
          elevenlabs_speed: number | null
          elevenlabs_stability: number | null
          elevenlabs_style: number | null
          elevenlabs_voice_id: string | null
          id: string | null
          language: string | null
          max_duration: number | null
          personality_tone: string | null
          prank_theme: string | null
          pregenerated_background_url: string | null
          pregenerated_greeting_url: string | null
          recording_url: string | null
          scheduled_at: string | null
          send_recording: boolean | null
          twilio_call_sid: string | null
          updated_at: string | null
          user_id: string | null
          victim_first_name: string | null
          victim_last_name: string | null
          victim_phone: string | null
          voice_gender: string | null
          voice_provider: string | null
        }
        Insert: {
          call_status?: string | null
          conversation_history?: Json | null
          created_at?: string | null
          creativity_level?: number | null
          elevenlabs_similarity?: number | null
          elevenlabs_speed?: number | null
          elevenlabs_stability?: number | null
          elevenlabs_style?: number | null
          elevenlabs_voice_id?: string | null
          id?: string | null
          language?: string | null
          max_duration?: number | null
          personality_tone?: string | null
          prank_theme?: string | null
          pregenerated_background_url?: string | null
          pregenerated_greeting_url?: string | null
          recording_url?: string | null
          scheduled_at?: string | null
          send_recording?: boolean | null
          twilio_call_sid?: string | null
          updated_at?: string | null
          user_id?: string | null
          victim_first_name?: never
          victim_last_name?: never
          victim_phone?: never
          voice_gender?: string | null
          voice_provider?: string | null
        }
        Update: {
          call_status?: string | null
          conversation_history?: Json | null
          created_at?: string | null
          creativity_level?: number | null
          elevenlabs_similarity?: number | null
          elevenlabs_speed?: number | null
          elevenlabs_stability?: number | null
          elevenlabs_style?: number | null
          elevenlabs_voice_id?: string | null
          id?: string | null
          language?: string | null
          max_duration?: number | null
          personality_tone?: string | null
          prank_theme?: string | null
          pregenerated_background_url?: string | null
          pregenerated_greeting_url?: string | null
          recording_url?: string | null
          scheduled_at?: string | null
          send_recording?: boolean | null
          twilio_call_sid?: string | null
          updated_at?: string | null
          user_id?: string | null
          victim_first_name?: never
          victim_last_name?: never
          victim_phone?: never
          voice_gender?: string | null
          voice_provider?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      decrypt_victim_data: { Args: { encrypted_text: string }; Returns: string }
      encrypt_victim_data: { Args: { plain_text: string }; Returns: string }
      get_user_pranks_decrypted: {
        Args: never
        Returns: {
          call_status: string
          conversation_history: Json
          created_at: string
          creativity_level: number
          elevenlabs_similarity: number
          elevenlabs_speed: number
          elevenlabs_stability: number
          elevenlabs_style: number
          elevenlabs_voice_id: string
          id: string
          language: string
          max_duration: number
          personality_tone: string
          prank_theme: string
          pregenerated_background_url: string
          pregenerated_greeting_url: string
          recording_url: string
          scheduled_at: string
          send_recording: boolean
          twilio_call_sid: string
          updated_at: string
          user_id: string
          victim_first_name: string
          victim_last_name: string
          victim_phone: string
          voice_gender: string
          voice_provider: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
