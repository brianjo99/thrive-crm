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
      campaigns: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          current_stage: Database["public"]["Enums"]["pipeline_stage"]
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
      clients: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          default_checklist: Json
          email: string | null
          enabled_services: Database["public"]["Enums"]["service_type"][]
          id: string
          name: string
          type: Database["public"]["Enums"]["client_type"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          default_checklist?: Json
          email?: string | null
          enabled_services?: Database["public"]["Enums"]["service_type"][]
          id?: string
          name: string
          type?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          default_checklist?: Json
          email?: string | null
          enabled_services?: Database["public"]["Enums"]["service_type"][]
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
          email: string | null
          status: string
          last_seen_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          email?: string | null
          status?: string
          last_seen_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          email?: string | null
          status?: string
          last_seen_at?: string | null
        }
        Relationships: []
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
          assigned_user_id: string | null
        }
        Insert: {
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
          assigned_user_id?: string | null
        }
        Update: {
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
          assigned_user_id?: string | null
        }
        Relationships: [
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
          {
            foreignKeyName: "tasks_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
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
      leads: {
        Row: {
          id: string
          nombre: string
          email: string
          servicio: string | null
          mensaje: string | null
          status: "new" | "contacted" | "converted" | "closed"
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          email: string
          servicio?: string | null
          mensaje?: string | null
          status?: "new" | "contacted" | "converted" | "closed"
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          email?: string
          servicio?: string | null
          mensaje?: string | null
          status?: "new" | "contacted" | "converted" | "closed"
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      websites: {
        Row: {
          id: string
          name: string
          slug: string
          template_type: string
          content: Json
          published: boolean | null
          views: number | null
          leads_count: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          template_type: string
          content?: Json
          published?: boolean | null
          views?: number | null
          leads_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          template_type?: string
          content?: Json
          published?: boolean | null
          views?: number | null
          leads_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_onboarding: {
        Row: {
          id: string
          client_id: string
          step: number
          status: string
          requirements: Json | null
          notes: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          step?: number
          status?: string
          requirements?: Json | null
          notes?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          step?: number
          status?: string
          requirements?: Json | null
          notes?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_onboarding_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      shot_lists: {
        Row: {
          id: string
          campaign_id: string
          title: string
          description: string | null
          location: string | null
          scheduled_date: string | null
          assigned_to: string | null
          status: string
          shots: Json | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          title: string
          description?: string | null
          location?: string | null
          scheduled_date?: string | null
          assigned_to?: string | null
          status?: string
          shots?: Json | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          title?: string
          description?: string | null
          location?: string | null
          scheduled_date?: string | null
          assigned_to?: string | null
          status?: string
          shots?: Json | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shot_lists_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          }
        ]
      }
      deliverables: {
        Row: {
          id: string
          campaign_id: string
          name: string
          type: string
          description: string | null
          status: string
          due_date: string | null
          assigned_to: string | null
          asset_id: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          name: string
          type: string
          description?: string | null
          status?: string
          due_date?: string | null
          assigned_to?: string | null
          asset_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          name?: string
          type?: string
          description?: string | null
          status?: string
          due_date?: string | null
          assigned_to?: string | null
          asset_id?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string | null
          related_id: string | null
          related_type: string | null
          read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message?: string | null
          related_id?: string | null
          related_type?: string | null
          read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string | null
          related_id?: string | null
          related_type?: string | null
          read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          task_id: string | null
          approval_id: string | null
          asset_id: string | null
          author_id: string
          content: string
          mentions: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id?: string | null
          approval_id?: string | null
          asset_id?: string | null
          author_id: string
          content: string
          mentions?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string | null
          approval_id?: string | null
          asset_id?: string | null
          author_id?: string
          content?: string
          mentions?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
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
          }
        ]
      }
      client_portal_tokens: {
        Row: {
          id: string
          client_id: string
          campaign_id: string
          token: string
          expires_at: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          campaign_id: string
          token: string
          expires_at: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          campaign_id?: string
          token?: string
          expires_at?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_tokens_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          }
        ]
      }
      campaign_metrics: {
        Row: {
          id: string
          campaign_id: string
          date: string
          tasks_completed: number | null
          tasks_pending: number | null
          approvals_pending: number | null
          assets_uploaded: number | null
          on_schedule: boolean | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          date?: string
          tasks_completed?: number | null
          tasks_pending?: number | null
          approvals_pending?: number | null
          assets_uploaded?: number | null
          on_schedule?: boolean | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          date?: string
          tasks_completed?: number | null
          tasks_pending?: number | null
          approvals_pending?: number | null
          assets_uploaded?: number | null
          on_schedule?: boolean | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          }
        ]
      }
      teams: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role_in_team: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role_in_team?: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role_in_team?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          actor_name: string | null
          action: string
          resource_type: string
          resource_id: string | null
          resource_name: string | null
          old_value: Json | null
          new_value: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          actor_name?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          resource_name?: string | null
          old_value?: Json | null
          new_value?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          actor_name?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          resource_name?: string | null
          old_value?: Json | null
          new_value?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          id: string
          role: string
          module: string
          can_view: boolean
          can_create: boolean
          can_edit: boolean
          can_delete: boolean
          can_approve: boolean
          can_manage: boolean
        }
        Insert: {
          id?: string
          role: string
          module: string
          can_view?: boolean
          can_create?: boolean
          can_edit?: boolean
          can_delete?: boolean
          can_approve?: boolean
          can_manage?: boolean
        }
        Update: {
          id?: string
          role?: string
          module?: string
          can_view?: boolean
          can_create?: boolean
          can_edit?: boolean
          can_delete?: boolean
          can_approve?: boolean
          can_manage?: boolean
        }
        Relationships: []
      }
      module_visibility: {
        Row: {
          id: string
          role: string | null
          user_id: string | null
          module: string
          is_visible: boolean
        }
        Insert: {
          id?: string
          role?: string | null
          user_id?: string | null
          module: string
          is_visible?: boolean
        }
        Update: {
          id?: string
          role?: string | null
          user_id?: string | null
          module?: string
          is_visible?: boolean
        }
        Relationships: []
      }
      org_settings: {
        Row: {
          key: string
          value: Json | null
          updated_at: string
        }
        Insert: {
          key: string
          value?: Json | null
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      scripts: {
        Row: {
          id: string
          campaign_id: string | null
          title: string
          content: string | null
          version: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id?: string | null
          title: string
          content?: string | null
          version?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string | null
          title?: string
          content?: string | null
          version?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scripts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          }
        ]
      }
      invoices: {
        Row: {
          id: string
          client_id: string | null
          campaign_id: string | null
          invoice_number: string
          status: string
          subtotal: number
          tax: number
          total: number
          due_date: string | null
          paid_date: string | null
          notes: string | null
          company_name: string | null
          items: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          campaign_id?: string | null
          invoice_number: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          due_date?: string | null
          paid_date?: string | null
          notes?: string | null
          company_name?: string | null
          items?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          campaign_id?: string | null
          invoice_number?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          due_date?: string | null
          paid_date?: string | null
          notes?: string | null
          company_name?: string | null
          items?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          }
        ]
      }
      call_sheets: {
        Row: {
          id: string
          campaign_id: string | null
          title: string
          shoot_date: string | null
          location: string | null
          call_time: string | null
          wrap_time: string | null
          notes: string | null
          crew: Json | null
          schedule: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id?: string | null
          title: string
          shoot_date?: string | null
          location?: string | null
          call_time?: string | null
          wrap_time?: string | null
          notes?: string | null
          crew?: Json | null
          schedule?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string | null
          title?: string
          shoot_date?: string | null
          location?: string | null
          call_time?: string | null
          wrap_time?: string | null
          notes?: string | null
          crew?: Json | null
          schedule?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_sheets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          }
        ]
      }
      content_calendar: {
        Row: {
          id: string
          campaign_id: string | null
          client_id: string | null
          platform: string
          scheduled_date: string
          content_type: string
          status: string
          caption: string | null
          hashtags: string | null
          notes: string | null
          asset_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id?: string | null
          client_id?: string | null
          platform: string
          scheduled_date: string
          content_type: string
          status?: string
          caption?: string | null
          hashtags?: string | null
          notes?: string | null
          asset_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string | null
          client_id?: string | null
          platform?: string
          scheduled_date?: string
          content_type?: string
          status?: string
          caption?: string | null
          hashtags?: string | null
          notes?: string | null
          asset_url?: string | null
          created_at?: string
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
          }
        ]
      }
      revision_rounds: {
        Row: {
          id: string
          approval_id: string
          round_number: number
          feedback: string
          created_at: string
        }
        Insert: {
          id?: string
          approval_id: string
          round_number: number
          feedback: string
          created_at?: string
        }
        Update: {
          id?: string
          approval_id?: string
          round_number?: number
          feedback?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_rounds_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "approvals"
            referencedColumns: ["id"]
          }
        ]
      }
      brand_kit: {
        Row: {
          id: string
          client_id: string
          tone_of_voice: string | null
          content_pillars: string[]
          preferred_ctas: string[]
          brand_colors: string[]
          visual_references: string | null
          no_gos: string | null
          social_handles: Json
          strategic_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          tone_of_voice?: string | null
          content_pillars?: string[]
          preferred_ctas?: string[]
          brand_colors?: string[]
          visual_references?: string | null
          no_gos?: string | null
          social_handles?: Json
          strategic_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          tone_of_voice?: string | null
          content_pillars?: string[]
          preferred_ctas?: string[]
          brand_colors?: string[]
          visual_references?: string | null
          no_gos?: string | null
          social_handles?: Json
          strategic_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kit_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
