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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      active_timer: {
        Row: {
          item_id: string | null
          kind: string | null
          log_date: string | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          item_id?: string | null
          kind?: string | null
          log_date?: string | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          item_id?: string | null
          kind?: string | null
          log_date?: string | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          created_at: string
          id: string
          insights: string | null
          started_at: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          insights?: string | null
          started_at?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          insights?: string | null
          started_at?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          diet_note: string | null
          diet_pct: number | null
          log_date: string
          mood: number | null
          mood_note: string | null
          slept_at: string | null
          updated_at: string
          user_id: string
          water_ml: number
          woke_at: string | null
        }
        Insert: {
          diet_note?: string | null
          diet_pct?: number | null
          log_date: string
          mood?: number | null
          mood_note?: string | null
          slept_at?: string | null
          updated_at?: string
          user_id: string
          water_ml?: number
          woke_at?: string | null
        }
        Update: {
          diet_note?: string | null
          diet_pct?: number | null
          log_date?: string
          mood?: number | null
          mood_note?: string | null
          slept_at?: string | null
          updated_at?: string
          user_id?: string
          water_ml?: number
          woke_at?: string | null
        }
        Relationships: []
      }
      fixed_block_logs: {
        Row: {
          block_id: string
          checked: boolean
          id: string
          log_date: string
          note: string | null
          tracked_seconds: number
          user_id: string
        }
        Insert: {
          block_id: string
          checked?: boolean
          id?: string
          log_date: string
          note?: string | null
          tracked_seconds?: number
          user_id: string
        }
        Update: {
          block_id?: string
          checked?: boolean
          id?: string
          log_date?: string
          note?: string | null
          tracked_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_block_logs_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "fixed_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_blocks: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          name: string
          note_options: Json
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          name: string
          note_options?: Json
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          name?: string
          note_options?: Json
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      fixed_block_log_entries: {
        Row: {
          block_id: string
          created_at: string
          id: string
          log_date: string
          minutes: number
          note: string
          user_id: string
        }
        Insert: {
          block_id: string
          created_at?: string
          id?: string
          log_date: string
          minutes?: number
          note: string
          user_id: string
        }
        Update: {
          block_id?: string
          created_at?: string
          id?: string
          log_date?: string
          minutes?: number
          note?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_block_log_entries_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "fixed_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          checked: boolean
          habit_id: string
          id: string
          log_date: string
          note: string | null
          tracked_seconds: number
          user_id: string
        }
        Insert: {
          checked?: boolean
          habit_id: string
          id?: string
          log_date: string
          note?: string | null
          tracked_seconds?: number
          user_id: string
        }
        Update: {
          checked?: boolean
          habit_id?: string
          id?: string
          log_date?: string
          note?: string | null
          tracked_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          daily_budget_hours: number
          feature_flags: Json
          tag_colors: Json
          updated_at: string
          user_id: string
          water_goal_ml: number
        }
        Insert: {
          daily_budget_hours?: number
          feature_flags?: Json
          tag_colors?: Json
          updated_at?: string
          user_id: string
          water_goal_ml?: number
        }
        Update: {
          daily_budget_hours?: number
          feature_flags?: Json
          tag_colors?: Json
          updated_at?: string
          user_id?: string
          water_goal_ml?: number
        }
        Relationships: []
      }
      task_series: {
        Row: {
          category: string
          created_at: string
          id: string
          note: string | null
          priority: string
          repeat: string
          skipped_dates: string[]
          start_date: string
          time: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          note?: string | null
          priority?: string
          repeat: string
          skipped_dates?: string[]
          start_date: string
          time?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          note?: string | null
          priority?: string
          repeat?: string
          skipped_dates?: string[]
          start_date?: string
          time?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_statuses: {
        Row: {
          color: string
          created_at: string
          id: string
          is_done: boolean
          label: string
          sort_order: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_done?: boolean
          label: string
          sort_order?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_done?: boolean
          label?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string
          created_at: string
          date: string | null
          done: boolean
          duration_minutes: number | null
          id: string
          note: string | null
          priority: string
          quick: number
          series_id: string | null
          sort_order: number
          status_id: string | null
          time: string | null
          title: string
          tracked_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          date?: string | null
          done?: boolean
          duration_minutes?: number | null
          id?: string
          note?: string | null
          priority?: string
          quick?: number
          series_id?: string | null
          sort_order?: number
          status_id?: string | null
          time?: string | null
          title: string
          tracked_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          date?: string | null
          done?: boolean
          duration_minutes?: number | null
          id?: string
          note?: string | null
          priority?: string
          quick?: number
          series_id?: string | null
          sort_order?: number
          status_id?: string | null
          time?: string | null
          title?: string
          tracked_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "task_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "task_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
