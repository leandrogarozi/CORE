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
          id: string
          item_id: string
          kind: string
          log_date: string
          started_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          kind: string
          log_date: string
          started_at: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          kind?: string
          log_date?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          created_at: string
          id: string
          insights: string | null
          priority: string
          sort_order: number
          started_at: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          insights?: string | null
          priority?: string
          sort_order?: number
          started_at?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          insights?: string | null
          priority?: string
          sort_order?: number
          started_at?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      checklists: {
        Row: {
          created_at: string
          expenses: Json
          expenses_budget_cents: number | null
          expenses_enabled: boolean
          id: string
          items: Json
          sort_order: number | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expenses?: Json
          expenses_budget_cents?: number | null
          expenses_enabled?: boolean
          id?: string
          items?: Json
          sort_order: number | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expenses?: Json
          expenses_budget_cents?: number | null
          expenses_enabled?: boolean
          id?: string
          items?: Json
          sort_order?: number | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          diet_meal_notes: Json
          diet_meals_checked: string[]
          diet_note: string | null
          diet_pct: number | null
          log_date: string
          mood: number | null
          mood_emotion: string | null
          mood_note: string | null
          slept_at: string | null
          updated_at: string
          user_id: string
          water_ml: number
          woke_at: string | null
        }
        Insert: {
          diet_meal_notes?: Json
          diet_meals_checked?: string[]
          diet_note?: string | null
          diet_pct?: number | null
          log_date: string
          mood?: number | null
          mood_emotion?: string | null
          mood_note?: string | null
          slept_at?: string | null
          updated_at?: string
          user_id: string
          water_ml?: number
          woke_at?: string | null
        }
        Update: {
          diet_meal_notes?: Json
          diet_meals_checked?: string[]
          diet_note?: string | null
          diet_pct?: number | null
          log_date?: string
          mood?: number | null
          mood_emotion?: string | null
          mood_note?: string | null
          slept_at?: string | null
          updated_at?: string
          user_id?: string
          water_ml?: number
          woke_at?: string | null
        }
        Relationships: []
      }
      diet_meals: {
        Row: {
          active: boolean
          created_at: string
          id: string
          meal_time: string
          message: string
          name: string
          notify_whatsapp: boolean
          user_id: string
          week_days: number[] | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          meal_time: string
          message?: string
          name: string
          notify_whatsapp?: boolean
          user_id: string
          week_days?: number[] | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          meal_time?: string
          message?: string
          name?: string
          notify_whatsapp?: boolean
          user_id?: string
          week_days?: number[] | null
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
          category: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          name: string
          note_options: Json
          sort_order: number
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          name: string
          note_options?: Json
          sort_order?: number
          user_id: string
        }
        Update: {
          category?: string | null
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
          category: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          name: string
          note_options: Json
          sort_order: number
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          name: string
          note_options?: Json
          sort_order?: number
          user_id: string
        }
        Update: {
          category?: string | null
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
      maintenance_assets: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          kind: string
          name: string
          odometer_reminder_days: number | null
          odometer_unit: string
          sort_order: number
          tracks_odometer: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind?: string
          name: string
          odometer_reminder_days?: number | null
          odometer_unit?: string
          sort_order?: number
          tracks_odometer?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind?: string
          name?: string
          odometer_reminder_days?: number | null
          odometer_unit?: string
          sort_order?: number
          tracks_odometer?: boolean
          user_id?: string
        }
        Relationships: []
      }
      maintenance_odometer_readings: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          read_on: string
          reading: number
          user_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          read_on?: string
          reading: number
          user_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          read_on?: string
          reading?: number
          user_id?: string
        }
        Relationships: []
      }
      maintenance_items: {
        Row: {
          active: boolean
          alert_days_before: number
          alert_distance_before: number
          asset_id: string
          created_at: string
          deleted_at: string | null
          id: string
          interval_distance: number | null
          interval_months: number | null
          last_done_odometer: number | null
          last_done_on: string | null
          name: string
          note: string
          whatsapp: boolean | null
          buy_days_before: number | null
          bought_on: string | null
          whatsapp_buy: boolean
          whatsapp_overdue: boolean
          app_buy: boolean
          app_do: boolean
          app_overdue: boolean
          overdue_from: string | null
          sort_order: number
          user_id: string
        }
        Insert: {
          active?: boolean
          alert_days_before?: number
          alert_distance_before?: number
          asset_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          interval_distance?: number | null
          interval_months?: number | null
          last_done_odometer?: number | null
          last_done_on?: string | null
          name: string
          note?: string
          whatsapp?: boolean | null
          buy_days_before?: number | null
          bought_on?: string | null
          whatsapp_buy?: boolean
          whatsapp_overdue?: boolean
          app_buy?: boolean
          app_do?: boolean
          app_overdue?: boolean
          overdue_from?: string | null
          sort_order?: number
          user_id: string
        }
        Update: {
          active?: boolean
          alert_days_before?: number
          alert_distance_before?: number
          asset_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          interval_distance?: number | null
          interval_months?: number | null
          last_done_odometer?: number | null
          last_done_on?: string | null
          name?: string
          note?: string
          whatsapp?: boolean | null
          buy_days_before?: number | null
          bought_on?: string | null
          whatsapp_buy?: boolean
          whatsapp_overdue?: boolean
          app_buy?: boolean
          app_do?: boolean
          app_overdue?: boolean
          overdue_from?: string | null
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      maintenance_services: {
        Row: {
          cost_cents: number | null
          created_at: string
          done_on: string
          id: string
          item_id: string
          note: string
          odometer: number | null
          user_id: string
        }
        Insert: {
          cost_cents?: number | null
          created_at?: string
          done_on?: string
          id?: string
          item_id: string
          note?: string
          odometer?: number | null
          user_id: string
        }
        Update: {
          cost_cents?: number | null
          created_at?: string
          done_on?: string
          id?: string
          item_id?: string
          note?: string
          odometer?: number | null
          user_id?: string
        }
        Relationships: []
      }
      medication_groups: {
        Row: {
          active: boolean
          created_at: string
          duration_days: number | null
          id: string
          name: string
          notes: string | null
          shared_time: string | null
          start_date: string | null
          time_mode: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          duration_days?: number | null
          id?: string
          name: string
          notes?: string | null
          shared_time?: string | null
          start_date?: string | null
          time_mode?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          duration_days?: number | null
          id?: string
          name?: string
          notes?: string | null
          shared_time?: string | null
          start_date?: string | null
          time_mode?: string
          user_id?: string
        }
        Relationships: []
      }
      medications: {
        Row: {
          active: boolean
          created_at: string
          duration_days: number | null
          group_id: string | null
          id: string
          med_time: string | null
          name: string
          notes: string | null
          start_date: string | null
          user_id: string
          whatsapp: boolean | null
          week_days: number[] | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          duration_days?: number | null
          group_id?: string | null
          id?: string
          med_time?: string | null
          name: string
          notes?: string | null
          start_date?: string | null
          user_id: string
          whatsapp?: boolean | null
          week_days?: number[] | null
        }
        Update: {
          active?: boolean
          created_at?: string
          duration_days?: number | null
          group_id?: string | null
          id?: string
          med_time?: string | null
          name?: string
          notes?: string | null
          start_date?: string | null
          user_id?: string
          whatsapp?: boolean | null
          week_days?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "medications_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "medication_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          alert_minutes_before: number | null
          created_at: string
          deleted_at: string | null
          done: boolean
          id: string
          note: string | null
          remind_date: string | null
          remind_time: string | null
          repeat: string | null
          status: string
          source_id: string | null
          source_kind: string | null
          source_stage: string | null
          in_app: boolean
          task_id: string | null
          title: string
          user_id: string
          whatsapp: boolean | null
          week_days: number[] | null
          whatsapp_notified_at: string | null
          push_sent_for: string | null
        }
        Insert: {
          alert_minutes_before?: number | null
          created_at?: string
          deleted_at?: string | null
          done?: boolean
          id?: string
          note?: string | null
          remind_date?: string | null
          remind_time?: string | null
          repeat?: string | null
          status?: string
          source_id?: string | null
          source_kind?: string | null
          source_stage?: string | null
          in_app?: boolean
          task_id?: string | null
          title: string
          user_id: string
          whatsapp?: boolean | null
          week_days?: number[] | null
          whatsapp_notified_at?: string | null
          push_sent_for?: string | null
        }
        Update: {
          alert_minutes_before?: number | null
          created_at?: string
          deleted_at?: string | null
          done?: boolean
          id?: string
          note?: string | null
          remind_date?: string | null
          remind_time?: string | null
          repeat?: string | null
          status?: string
          source_id?: string | null
          source_kind?: string | null
          source_stage?: string | null
          in_app?: boolean
          task_id?: string | null
          title?: string
          user_id?: string
          whatsapp?: boolean | null
          week_days?: number[] | null
          whatsapp_notified_at?: string | null
          push_sent_for?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      saude_desafios: {
        Row: {
          created_at: string
          fim: string
          id: string
          inicio: string
          meta: number
          partida: number | null
          proposta: boolean
          status: string
          tipo: string
          titulo: string
          unidade: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fim: string
          id?: string
          inicio: string
          meta: number
          partida?: number | null
          proposta?: boolean
          status?: string
          tipo: string
          titulo: string
          unidade: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          fim?: string
          id?: string
          inicio?: string
          meta?: number
          partida?: number | null
          proposta?: boolean
          status?: string
          tipo?: string
          titulo?: string
          unidade?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saude_fotos: {
        Row: {
          created_at: string
          deleted_at: string | null
          dia: string
          id: string
          pose: string
          storage_path: string
          ts: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          dia: string
          id?: string
          pose: string
          storage_path: string
          ts?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          dia?: string
          id?: string
          pose?: string
          storage_path?: string
          ts?: string
          user_id?: string
        }
        Relationships: []
      }
      saude_plano: {
        Row: {
          dieta_autor: string | null
          historico: Json
          lembretes: Json
          lembretes_periodicos: Json
          metas: Json
          nota: string | null
          plano_corrida: Json | null
          refeicoes: Json
          regras: Json
          schema: string
          semana_minima: number[]
          semana_padrao: Json
          treino_nota: string | null
          trocas: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          dieta_autor?: string | null
          historico?: Json
          lembretes?: Json
          lembretes_periodicos?: Json
          metas?: Json
          nota?: string | null
          plano_corrida?: Json | null
          refeicoes?: Json
          regras?: Json
          schema?: string
          semana_minima?: number[]
          semana_padrao?: Json
          treino_nota?: string | null
          trocas?: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          dieta_autor?: string | null
          historico?: Json
          lembretes?: Json
          lembretes_periodicos?: Json
          metas?: Json
          nota?: string | null
          plano_corrida?: Json | null
          refeicoes?: Json
          regras?: Json
          schema?: string
          semana_minima?: number[]
          semana_padrao?: Json
          treino_nota?: string | null
          trocas?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saude_registros: {
        Row: {
          aderencia: string | null
          cintura_cm: number | null
          created_at: string
          deleted_at: string | null
          dia: string
          distancia_km: number | null
          dor: string | null
          duracao_min: number | null
          energia: number | null
          esforco: number | null
          fome: number | null
          gordura_pct: number | null
          horas_sono: number | null
          humor: number | null
          id: string
          item: string | null
          itens: string | null
          modalidade: string | null
          motivo: string | null
          obs: string | null
          origem: string
          peso_kg: number | null
          refeicao: string | null
          resumo: string | null
          sensacoes: string[] | null
          situacao: string | null
          texto: string | null
          tipo: string
          ts: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aderencia?: string | null
          cintura_cm?: number | null
          created_at?: string
          deleted_at?: string | null
          dia: string
          distancia_km?: number | null
          dor?: string | null
          duracao_min?: number | null
          energia?: number | null
          esforco?: number | null
          fome?: number | null
          gordura_pct?: number | null
          horas_sono?: number | null
          humor?: number | null
          id?: string
          item?: string | null
          itens?: string | null
          modalidade?: string | null
          motivo?: string | null
          obs?: string | null
          origem?: string
          peso_kg?: number | null
          refeicao?: string | null
          resumo?: string | null
          sensacoes?: string[] | null
          situacao?: string | null
          texto?: string | null
          tipo: string
          ts?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          aderencia?: string | null
          cintura_cm?: number | null
          created_at?: string
          deleted_at?: string | null
          dia?: string
          distancia_km?: number | null
          dor?: string | null
          duracao_min?: number | null
          energia?: number | null
          esforco?: number | null
          fome?: number | null
          gordura_pct?: number | null
          horas_sono?: number | null
          humor?: number | null
          id?: string
          item?: string | null
          itens?: string | null
          modalidade?: string | null
          motivo?: string | null
          obs?: string | null
          origem?: string
          peso_kg?: number | null
          refeicao?: string | null
          resumo?: string | null
          sensacoes?: string[] | null
          situacao?: string | null
          texto?: string | null
          tipo?: string
          ts?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saude_resumos: {
        Row: {
          conteudo: Json
          created_at: string
          dia: string
          id: string
          modelo: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          conteudo: Json
          created_at?: string
          dia: string
          id?: string
          modelo?: string | null
          tipo: string
          user_id?: string
        }
        Update: {
          conteudo?: Json
          created_at?: string
          dia?: string
          id?: string
          modelo?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          backup_areas: string[] | null
          backup_name: string | null
          bg_intensity: number | null
          bg_tone: string | null
          avatar_url: string | null
          birth_date: string | null
          daily_budget_hours: number
          diet_app_opt_in: boolean
          diet_plan: string | null
          diet_whatsapp_opt_in: boolean
          water_strategies: string | null
          feature_flags: Json
          notify_phone: string | null
          preferred_name: string | null
          tag_colors: Json
          timezone: string | null
          updated_at: string
          user_id: string
          water_goal_ml: number
          whatsapp_monthly_cap_brl: number | null
          whatsapp_msg_cost_usd: number
          whatsapp_usd_brl: number
        }
        Insert: {
          backup_areas?: string[] | null
          backup_name?: string | null
          bg_intensity?: number | null
          bg_tone?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          daily_budget_hours?: number
          diet_app_opt_in?: boolean
          diet_plan?: string | null
          diet_whatsapp_opt_in?: boolean
          feature_flags?: Json
          notify_phone?: string | null
          preferred_name?: string | null
          tag_colors?: Json
          timezone?: string | null
          updated_at?: string
          user_id: string
          water_goal_ml?: number
          water_strategies?: string | null
          whatsapp_monthly_cap_brl?: number | null
          whatsapp_msg_cost_usd?: number
          whatsapp_usd_brl?: number
        }
        Update: {
          backup_areas?: string[] | null
          backup_name?: string | null
          bg_intensity?: number | null
          bg_tone?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          daily_budget_hours?: number
          diet_app_opt_in?: boolean
          diet_plan?: string | null
          diet_whatsapp_opt_in?: boolean
          feature_flags?: Json
          notify_phone?: string | null
          preferred_name?: string | null
          tag_colors?: Json
          timezone?: string | null
          updated_at?: string
          user_id?: string
          water_goal_ml?: number
          water_strategies?: string | null
          whatsapp_monthly_cap_brl?: number | null
          whatsapp_msg_cost_usd?: number
          whatsapp_usd_brl?: number
        }
        Relationships: []
      }
      whatsapp_sends: {
        Row: {
          delivery_error: string | null
          delivery_status: string | null
          delivery_status_at: string | null
          error: string | null
          id: string
          kind: string
          message_id: string | null
          ok: boolean
          reminder_id: string | null
          sent_at: string
          template: string | null
          user_id: string
          wa_id: string | null
        }
        Insert: {
          delivery_error?: string | null
          delivery_status?: string | null
          delivery_status_at?: string | null
          error?: string | null
          id?: string
          kind?: string
          message_id?: string | null
          ok?: boolean
          reminder_id?: string | null
          sent_at?: string
          template?: string | null
          user_id: string
          wa_id?: string | null
        }
        Update: {
          delivery_error?: string | null
          delivery_status?: string | null
          delivery_status_at?: string | null
          error?: string | null
          id?: string
          kind?: string
          message_id?: string | null
          ok?: boolean
          reminder_id?: string | null
          sent_at?: string
          template?: string | null
          user_id?: string
          wa_id?: string | null
        }
        Relationships: []
      }
      shopping_items: {
        Row: {
          created_at: string
          deleted_at: string | null
          done: boolean
          done_on: string | null
          id: string
          in_app: boolean
          kind: string
          links: Json
          name: string
          note: string
          remind_on: string | null
          remind_time: string
          repeat_days: number | null
          sort_order: number
          user_id: string
          whatsapp: boolean
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          done?: boolean
          done_on?: string | null
          id: string
          in_app?: boolean
          kind?: string
          links?: Json
          name: string
          note?: string
          remind_on?: string | null
          remind_time?: string
          repeat_days?: number | null
          sort_order?: number
          user_id: string
          whatsapp?: boolean
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          done?: boolean
          done_on?: string | null
          id?: string
          in_app?: boolean
          kind?: string
          links?: Json
          name?: string
          note?: string
          remind_on?: string | null
          remind_time?: string
          repeat_days?: number | null
          sort_order?: number
          user_id?: string
          whatsapp?: boolean
        }
        Relationships: []
      }
      synapses: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          kind: string
          learning: string
          questions: string
          source: string | null
          title: string
          title_auto: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id: string
          kind?: string
          learning?: string
          questions?: string
          source?: string | null
          title: string
          title_auto?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind?: string
          learning?: string
          questions?: string
          source?: string | null
          title?: string
          title_auto?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_series: {
        Row: {
          category: string
          category2: string | null
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
          category2?: string | null
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
          category2?: string | null
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
          is_scheduled: boolean
          label: string
          sort_order: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_done?: boolean
          is_scheduled?: boolean
          label: string
          sort_order?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_done?: boolean
          is_scheduled?: boolean
          label?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      task_time_entries: {
        Row: {
          created_at: string
          id: string
          log_date: string
          seconds: number
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date: string
          seconds?: number
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          seconds?: number
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          category: string
          category2: string | null
          created_at: string
          deadline: string | null
          deleted_at: string | null
          description: string
          id: string
          name: string
          session_minutes: number
          start_date: string | null
          status: string
          total_minutes: number | null
          updated_at: string
          user_id: string
          week_days: number[]
        }
        Insert: {
          category?: string
          category2?: string | null
          created_at?: string
          deadline?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          name: string
          session_minutes?: number
          start_date?: string | null
          status?: string
          total_minutes?: number | null
          updated_at?: string
          user_id: string
          week_days?: number[]
        }
        Update: {
          category?: string
          category2?: string | null
          created_at?: string
          deadline?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          name?: string
          session_minutes?: number
          start_date?: string | null
          status?: string
          total_minutes?: number | null
          updated_at?: string
          user_id?: string
          week_days?: number[]
        }
        Relationships: []
      }
      task_postponements: {
        Row: {
          created_at: string
          from_date: string | null
          id: string
          reason: string | null
          task_id: string
          to_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          from_date?: string | null
          id?: string
          reason?: string | null
          task_id: string
          to_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          from_date?: string | null
          id?: string
          reason?: string | null
          task_id?: string
          to_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string
          category2: string | null
          challenging: boolean
          follows: boolean
          client: string | null
          code: string | null
          created_at: string
          date: string | null
          deleted_at: string | null
          done: boolean
          duration_minutes: number | null
          end_date: string | null
          end_time: string | null
          expected_duration_min: number | null
          id: string
          is_event: boolean
          note: string | null
          priority: string
          project_id: string | null
          quick: number
          series_id: string | null
          sort_order: number
          status_id: string | null
          study_plan_id: string | null
          time: string | null
          title: string
          tracked_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          category2?: string | null
          challenging?: boolean
          follows?: boolean
          client?: string | null
          code?: string | null
          created_at?: string
          date?: string | null
          deleted_at?: string | null
          done?: boolean
          duration_minutes?: number | null
          end_date?: string | null
          end_time?: string | null
          expected_duration_min?: number | null
          id?: string
          is_event?: boolean
          note?: string | null
          priority?: string
          project_id?: string | null
          quick?: number
          series_id?: string | null
          sort_order?: number
          status_id?: string | null
          study_plan_id?: string | null
          time?: string | null
          title: string
          tracked_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          category2?: string | null
          challenging?: boolean
          follows?: boolean
          client?: string | null
          code?: string | null
          created_at?: string
          date?: string | null
          deleted_at?: string | null
          done?: boolean
          duration_minutes?: number | null
          end_date?: string | null
          end_time?: string | null
          expected_duration_min?: number | null
          id?: string
          is_event?: boolean
          note?: string | null
          priority?: string
          project_id?: string | null
          quick?: number
          series_id?: string | null
          sort_order?: number
          status_id?: string | null
          study_plan_id?: string | null
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
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          default_category: string | null
          default_category2: string | null
          description: string
          id: string
          naming_template: string | null
          name: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_category?: string | null
          default_category2?: string | null
          description?: string
          id?: string
          naming_template?: string | null
          name: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_category?: string | null
          default_category2?: string | null
          description?: string
          id?: string
          naming_template?: string | null
          name?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      backup_status: {
        Row: {
          aprendizado_arquivos: number | null
          aprendizado_enviado_em: string | null
          aprendizado_pedido_em: string | null
          created_at: string
          token: string | null
          ultimas_linhas: number | null
          ultimo_arquivo: string | null
          ultimo_aviso_em: string | null
          ultimo_backup_em: string | null
          ultimo_bytes: number | null
          user_id: string
        }
        Insert: {
          aprendizado_arquivos?: number | null
          aprendizado_enviado_em?: string | null
          aprendizado_pedido_em?: string | null
          created_at?: string
          token?: string | null
          ultimas_linhas?: number | null
          ultimo_arquivo?: string | null
          ultimo_aviso_em?: string | null
          ultimo_backup_em?: string | null
          ultimo_bytes?: number | null
          user_id: string
        }
        Update: {
          aprendizado_arquivos?: number | null
          aprendizado_enviado_em?: string | null
          aprendizado_pedido_em?: string | null
          created_at?: string
          token?: string | null
          ultimas_linhas?: number | null
          ultimo_arquivo?: string | null
          ultimo_aviso_em?: string | null
          ultimo_backup_em?: string | null
          ultimo_bytes?: number | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          id: string
          user_id: string
          entity_type: string
          entity_id: string
          file_name: string
          file_path: string
          mime_type: string
          size_bytes: number
          extracted_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entity_type: string
          entity_id: string
          file_name: string
          file_path: string
          mime_type: string
          size_bytes: number
          extracted_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entity_type?: string
          entity_id?: string
          file_name?: string
          file_path?: string
          mime_type?: string
          size_bytes?: number
          extracted_text?: string | null
          created_at?: string
        }
        Relationships: []
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
