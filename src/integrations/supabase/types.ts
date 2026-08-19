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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ad_accounts: {
        Row: {
          account_id: string | null
          account_name: string | null
          created_at: string
          id: string
          monthly_budget: number | null
          notes: string | null
          platform: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          created_at?: string
          id?: string
          monthly_budget?: number | null
          notes?: string | null
          platform: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          created_at?: string
          id?: string
          monthly_budget?: number | null
          notes?: string | null
          platform?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      approvals: {
        Row: {
          asset_id: string | null
          campaign_id: string
          client_id: string
          created_at: string
          feedback: string | null
          id: string
          reviewer_id: string | null
          reviewer_type: string
          status: string
          task_id: string
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          campaign_id: string
          client_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          reviewer_id?: string | null
          reviewer_type?: string
          status?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          campaign_id?: string
          client_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          reviewer_id?: string | null
          reviewer_type?: string
          status?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          campaign_id: string | null
          client_id: string | null
          created_at: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          name: string
          notes: string | null
          tags: string[] | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          name: string
          notes?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          name?: string
          notes?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string
        }
        Relationships: []
      }
      brand_kit: {
        Row: {
          brand_colors: string[]
          client_id: string
          content_pillars: string[]
          created_at: string
          id: string
          no_gos: string | null
          preferred_ctas: string[]
          social_handles: Json
          strategic_notes: string | null
          tone_of_voice: string | null
          updated_at: string
          visual_references: string | null
        }
        Insert: {
          brand_colors?: string[]
          client_id: string
          content_pillars?: string[]
          created_at?: string
          id?: string
          no_gos?: string | null
          preferred_ctas?: string[]
          social_handles?: Json
          strategic_notes?: string | null
          tone_of_voice?: string | null
          updated_at?: string
          visual_references?: string | null
        }
        Update: {
          brand_colors?: string[]
          client_id?: string
          content_pillars?: string[]
          created_at?: string
          id?: string
          no_gos?: string | null
          preferred_ctas?: string[]
          social_handles?: Json
          strategic_notes?: string | null
          tone_of_voice?: string | null
          updated_at?: string
          visual_references?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sheets: {
        Row: {
          call_time: string | null
          campaign_id: string | null
          created_at: string | null
          crew: Json | null
          id: string
          location: string | null
          notes: string | null
          schedule: Json | null
          shoot_date: string
          title: string
          updated_at: string | null
          wrap_time: string | null
        }
        Insert: {
          call_time?: string | null
          campaign_id?: string | null
          created_at?: string | null
          crew?: Json | null
          id?: string
          location?: string | null
          notes?: string | null
          schedule?: Json | null
          shoot_date: string
          title: string
          updated_at?: string | null
          wrap_time?: string | null
        }
        Update: {
          call_time?: string | null
          campaign_id?: string | null
          created_at?: string | null
          crew?: Json | null
          id?: string
          location?: string | null
          notes?: string | null
          schedule?: Json | null
          shoot_date?: string
          title?: string
          updated_at?: string | null
          wrap_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sheets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_costs: {
        Row: {
          amount: number
          campaign_id: string
          category: string | null
          cost_date: string | null
          created_at: string | null
          description: string
          id: string
        }
        Insert: {
          amount?: number
          campaign_id: string
          category?: string | null
          cost_date?: string | null
          created_at?: string | null
          description: string
          id?: string
        }
        Update: {
          amount?: number
          campaign_id?: string
          category?: string | null
          cost_date?: string | null
          created_at?: string | null
          description?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_costs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_metrics: {
        Row: {
          approvals_pending: number | null
          assets_uploaded: number | null
          campaign_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          on_schedule: boolean | null
          tasks_completed: number | null
          tasks_pending: number | null
        }
        Insert: {
          approvals_pending?: number | null
          assets_uploaded?: number | null
          campaign_id: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          on_schedule?: boolean | null
          tasks_completed?: number | null
          tasks_pending?: number | null
        }
        Update: {
          approvals_pending?: number | null
          assets_uploaded?: number | null
          campaign_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          on_schedule?: boolean | null
          tasks_completed?: number | null
          tasks_pending?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_stage_history: {
        Row: {
          campaign_id: string
          entered_at: string
          id: string
          stage: string
        }
        Insert: {
          campaign_id: string
          entered_at?: string
          id?: string
          stage: string
        }
        Update: {
          campaign_id?: string
          entered_at?: string
          id?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_stage_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          current_stage: Database["public"]["Enums"]["pipeline_stage"]
          drive_folder_url: string | null
          due_date: string | null
          id: string
          name: string
          stages: Database["public"]["Enums"]["pipeline_stage"][]
          start_date: string
          template: Database["public"]["Enums"]["campaign_template"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          current_stage?: Database["public"]["Enums"]["pipeline_stage"]
          drive_folder_url?: string | null
          due_date?: string | null
          id?: string
          name: string
          stages?: Database["public"]["Enums"]["pipeline_stage"][]
          start_date?: string
          template: Database["public"]["Enums"]["campaign_template"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          current_stage?: Database["public"]["Enums"]["pipeline_stage"]
          drive_folder_url?: string | null
          due_date?: string | null
          id?: string
          name?: string
          stages?: Database["public"]["Enums"]["pipeline_stage"][]
          start_date?: string
          template?: Database["public"]["Enums"]["campaign_template"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          client_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          type: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          type?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_onboarding: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          requirements: Json | null
          status: string
          step: number
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          requirements?: Json | null
          status?: string
          step?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          requirements?: Json | null
          status?: string
          step?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_onboarding_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_tokens: {
        Row: {
          campaign_id: string
          client_id: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          campaign_id: string
          client_id: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          token: string
        }
        Update: {
          campaign_id?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_tokens_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          default_checklist: Json
          drive_folder_url: string | null
          email: string | null
          enabled_services: Database["public"]["Enums"]["service_type"][]
          id: string
          name: string
          phone: string | null
          type: Database["public"]["Enums"]["client_type"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          default_checklist?: Json
          drive_folder_url?: string | null
          email?: string | null
          enabled_services?: Database["public"]["Enums"]["service_type"][]
          id?: string
          name: string
          phone?: string | null
          type?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          default_checklist?: Json
          drive_folder_url?: string | null
          email?: string | null
          enabled_services?: Database["public"]["Enums"]["service_type"][]
          id?: string
          name?: string
          phone?: string | null
          type?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          approval_id: string | null
          asset_id: string | null
          author_id: string
          content: string
          created_at: string
          id: string
          mentions: string[] | null
          task_id: string | null
          updated_at: string
        }
        Insert: {
          approval_id?: string | null
          asset_id?: string | null
          author_id: string
          content: string
          created_at?: string
          id?: string
          mentions?: string[] | null
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          approval_id?: string | null
          asset_id?: string | null
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          mentions?: string[] | null
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      content_calendar: {
        Row: {
          asset_url: string | null
          campaign_id: string | null
          caption: string | null
          client_id: string | null
          content_type: string | null
          created_at: string | null
          hashtags: string | null
          id: string
          notes: string | null
          platform: string
          scheduled_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          asset_url?: string | null
          campaign_id?: string | null
          caption?: string | null
          client_id?: string | null
          content_type?: string | null
          created_at?: string | null
          hashtags?: string | null
          id?: string
          notes?: string | null
          platform: string
          scheduled_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_url?: string | null
          campaign_id?: string | null
          caption?: string | null
          client_id?: string | null
          content_type?: string | null
          created_at?: string | null
          hashtags?: string | null
          id?: string
          notes?: string | null
          platform?: string
          scheduled_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_calendar_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_calendar_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_id: string
          created_at: string | null
          file_url: string | null
          id: string
          name: string
          notes: string | null
          signed_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          name: string
          notes?: string | null
          signed_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          name?: string
          notes?: string | null
          signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverables: {
        Row: {
          asset_id: string | null
          assigned_to: string | null
          campaign_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          name: string
          notes: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          assigned_to?: string | null
          campaign_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          notes?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          assigned_to?: string | null
          campaign_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          campaign_id: string | null
          client_id: string | null
          company_name: string | null
          created_at: string | null
          due_date: string | null
          id: string
          invoice_number: string
          items: Json | null
          notes: string | null
          paid_date: string | null
          status: string | null
          subtotal: number
          tax: number | null
          total: number
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          client_id?: string | null
          company_name?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          items?: Json | null
          notes?: string | null
          paid_date?: string | null
          status?: string | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          client_id?: string | null
          company_name?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          items?: Json | null
          notes?: string | null
          paid_date?: string | null
          status?: string | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ad_campaign: string | null
          ad_platform: string | null
          created_at: string
          email: string
          id: string
          mensaje: string | null
          nombre: string
          notes: string | null
          servicio: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ad_campaign?: string | null
          ad_platform?: string | null
          created_at?: string
          email: string
          id?: string
          mensaje?: string | null
          nombre: string
          notes?: string | null
          servicio?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ad_campaign?: string | null
          ad_platform?: string | null
          created_at?: string
          email?: string
          id?: string
          mensaje?: string | null
          nombre?: string
          notes?: string | null
          servicio?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      module_visibility: {
        Row: {
          id: string
          is_visible: boolean
          module: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          is_visible?: boolean
          module: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          is_visible?: boolean
          module?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean
          read_at: string | null
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      org_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          last_seen_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          last_seen_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          last_seen_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          campaign_id: string | null
          client_id: string | null
          created_at: string
          id: string
          items: Json
          notes: string | null
          quote_number: string
          status: string
          subtotal: number
          tax: number
          total: number
          valid_until: string | null
        }
        Insert: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          quote_number: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          valid_until?: string | null
        }
        Update: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          quote_number?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_rounds: {
        Row: {
          approval_id: string | null
          created_at: string | null
          feedback: string | null
          id: string
          round_number: number
          status: string | null
        }
        Insert: {
          approval_id?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          round_number?: number
          status?: string | null
        }
        Update: {
          approval_id?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          round_number?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revision_rounds_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "approvals"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_approve: boolean
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_manage: boolean
          can_view: boolean
          id: string
          module: string
          role: string
        }
        Insert: {
          can_approve?: boolean
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_manage?: boolean
          can_view?: boolean
          id?: string
          module: string
          role: string
        }
        Update: {
          can_approve?: boolean
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_manage?: boolean
          can_view?: boolean
          id?: string
          module?: string
          role?: string
        }
        Relationships: []
      }
      scripts: {
        Row: {
          campaign_id: string | null
          content: string | null
          created_at: string | null
          id: string
          status: string | null
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          campaign_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          campaign_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scripts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      shot_lists: {
        Row: {
          assigned_to: string | null
          campaign_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          notes: string | null
          scheduled_date: string | null
          shots: Json | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          campaign_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_date?: string | null
          shots?: Json | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          campaign_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_date?: string | null
          shots?: Json | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shot_lists_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      sops: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_user_id: string | null
          assignee: Database["public"]["Enums"]["app_role"] | null
          campaign_id: string
          checklist: Json | null
          client_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          service_type: Database["public"]["Enums"]["service_type"] | null
          stage: Database["public"]["Enums"]["pipeline_stage"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          assignee?: Database["public"]["Enums"]["app_role"] | null
          campaign_id: string
          checklist?: Json | null
          client_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          service_type?: Database["public"]["Enums"]["service_type"] | null
          stage: Database["public"]["Enums"]["pipeline_stage"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          assignee?: Database["public"]["Enums"]["app_role"] | null
          campaign_id?: string
          checklist?: Json | null
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          service_type?: Database["public"]["Enums"]["service_type"] | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role_in_team: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_in_team?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_in_team?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      unpaid_alerts: {
        Row: {
          client_id: string
          created_at: string
          dismissed: boolean
          id: string
          message: string
          service_performed: Database["public"]["Enums"]["service_type"]
        }
        Insert: {
          client_id: string
          created_at?: string
          dismissed?: boolean
          id?: string
          message: string
          service_performed: Database["public"]["Enums"]["service_type"]
        }
        Update: {
          client_id?: string
          created_at?: string
          dismissed?: boolean
          id?: string
          message?: string
          service_performed?: Database["public"]["Enums"]["service_type"]
        }
        Relationships: [
          {
            foreignKeyName: "unpaid_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      websites: {
        Row: {
          content: Json
          created_at: string
          id: string
          leads_count: number | null
          name: string
          published: boolean | null
          slug: string
          template_type: string
          updated_at: string
          views: number | null
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          leads_count?: number | null
          name: string
          published?: boolean | null
          slug: string
          template_type: string
          updated_at?: string
          views?: number | null
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          leads_count?: number | null
          name?: string
          published?: boolean | null
          slug?: string
          template_type?: string
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_access_state: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_website_leads: {
        Args: { website_id: string }
        Returns: undefined
      }
      increment_website_views: {
        Args: { website_id: string }
        Returns: undefined
      }
      is_internal_user: { Args: never; Returns: boolean }
      submit_public_lead: {
        Args: {
          p_email: string
          p_mensaje?: string | null
          p_nombre: string
          p_servicio?: string | null
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "owner" | "editor" | "videographer" | "client"
      campaign_template:
        | "film-only"
        | "film-edit"
        | "film-edit-post"
        | "edit-only"
        | "full-service"
      client_type: "business" | "influencer" | "creator"
      pipeline_stage:
        | "discovery"
        | "pre-production"
        | "filming"
        | "editing"
        | "review"
        | "revisions"
        | "posting"
        | "reporting"
        | "complete"
      service_type: "film" | "edit" | "post" | "report"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "pending" | "in-progress" | "review" | "complete"
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
      app_role: ["owner", "editor", "videographer", "client"],
      campaign_template: [
        "film-only",
        "film-edit",
        "film-edit-post",
        "edit-only",
        "full-service",
      ],
      client_type: ["business", "influencer", "creator"],
      pipeline_stage: [
        "discovery",
        "pre-production",
        "filming",
        "editing",
        "review",
        "revisions",
        "posting",
        "reporting",
        "complete",
      ],
      service_type: ["film", "edit", "post", "report"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["pending", "in-progress", "review", "complete"],
    },
  },
} as const
