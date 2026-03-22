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
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
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
