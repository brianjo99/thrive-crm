import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { CLIENT_TYPE_CHECKLISTS, SERVICE_TEMPLATES } from "@/types/thrive";
import type { ClientType, CampaignTemplate, ServiceType } from "@/types/thrive";

// ---- Clients ----
export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      email?: string;
      type: ClientType;
      enabledServices: ServiceType[];
    }) => {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: input.name,
          email: input.email || null,
          type: input.type,
          enabled_services: input.enabledServices,
          default_checklist: JSON.parse(JSON.stringify(CLIENT_TYPE_CHECKLISTS[input.type])),
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      email?: string;
      type: ClientType;
      enabledServices: ServiceType[];
    }) => {
      const { error } = await supabase
        .from("clients")
        .update({
          name: input.name,
          email: input.email || null,
          type: input.type,
          enabled_services: input.enabledServices,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}

// ---- Campaigns ----
export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      clientId: string;
      template: CampaignTemplate;
    }) => {
      const templateConfig = SERVICE_TEMPLATES[input.template];
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          name: input.name,
          client_id: input.clientId,
          template: input.template,
          current_stage: templateConfig.stages[0],
          stages: templateConfig.stages,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<"campaigns">>) => {
      const { error } = await supabase.from("campaigns").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

// ---- Tasks ----
export function useTasks(filters?: { campaignId?: string; assignee?: "owner" | "editor" | "videographer" | "client"; status?: "pending" | "in-progress" | "review" | "complete" }) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      let query = supabase.from("tasks").select("*, clients(name)").order("due_date", { ascending: true });
      if (filters?.campaignId) query = query.eq("campaign_id", filters.campaignId);
      if (filters?.assignee) query = query.eq("assignee", filters.assignee);
      if (filters?.status) query = query.eq("status", filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"tasks">) => {
      const { data, error } = await supabase.from("tasks").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<"tasks">>) => {
      const { error } = await supabase.from("tasks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

// ---- Assets ----
export function useAssets(filters?: { campaignId?: string; clientId?: string }) {
  return useQuery({
    queryKey: ["assets", filters],
    queryFn: async () => {
      let query = supabase.from("assets").select("*, clients(name), campaigns(name)").order("created_at", { ascending: false });
      if (filters?.campaignId) query = query.eq("campaign_id", filters.campaignId);
      if (filters?.clientId) query = query.eq("client_id", filters.clientId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useUploadAsset() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      file: File;
      campaignId?: string;
      clientId?: string;
      tags?: string[];
      notes?: string;
    }) => {
      const filePath = `${user?.id}/${Date.now()}_${input.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(filePath, input.file);
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("assets")
        .insert({
          name: input.file.name,
          file_path: filePath,
          file_type: input.file.type,
          file_size: input.file.size,
          campaign_id: input.campaignId || null,
          client_id: input.clientId || null,
          uploaded_by: user?.id,
          tags: input.tags || [],
          notes: input.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (asset: { id: string; file_path: string }) => {
      await supabase.storage.from("assets").remove([asset.file_path]);
      const { error } = await supabase.from("assets").delete().eq("id", asset.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
}

export function getAssetPublicUrl(filePath: string) {
  const { data } = supabase.storage.from("assets").getPublicUrl(filePath);
  return data.publicUrl;
}

// ---- Approvals ----
export function useApprovals(filters?: { campaignId?: string; status?: string }) {
  return useQuery({
    queryKey: ["approvals", filters],
    queryFn: async () => {
      let query = supabase.from("approvals").select("*, tasks(title), clients(name), assets(name, file_path)").order("created_at", { ascending: false });
      if (filters?.campaignId) query = query.eq("campaign_id", filters.campaignId);
      if (filters?.status) query = query.eq("status", filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"approvals">) => {
      const { data, error } = await supabase.from("approvals").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approvals"] }),
  });
}

export function useUpdateApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; feedback?: string; reviewer_id?: string }) => {
      const { error } = await supabase.from("approvals").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

// ---- Unpaid Alerts ----
export function useUnpaidAlerts() {
  return useQuery({
    queryKey: ["unpaid_alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unpaid_alerts")
        .select("*, clients(name)")
        .eq("dismissed", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useDismissAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("unpaid_alerts").update({ dismissed: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["unpaid_alerts"] }),
  });
}

// ---- User Role ----
export function useUserRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.role ?? null;
    },
    enabled: !!user,
  });
}

// ---- SOPs ----
export function useSOPs(role?: "owner" | "editor" | "videographer" | "client") {
  return useQuery({
    queryKey: ["sops", role],
    queryFn: async () => {
      let query = supabase.from("sops").select("*").order("sort_order", { ascending: true });
      if (role) query = query.eq("role", role);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}


// ---- Client Onboarding ----
export function useClientOnboarding(clientId?: string) {
  return useQuery({
    queryKey: ["client_onboarding", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("client_onboarding")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    },
    enabled: !!clientId,
  });
}

export function useCreateClientOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_id: string; requirements: Record<string, any> }) => {
      const { data, error } = await supabase
        .from("client_onboarding")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_onboarding"] }),
  });
}

export function useUpdateClientOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<"client_onboarding">>) => {
      const { error } = await supabase.from("client_onboarding").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_onboarding"] }),
  });
}

// ---- Shot Lists ----
export function useShotLists(filters?: { campaignId?: string; assignedTo?: string }) {
  return useQuery({
    queryKey: ["shot_lists", filters],
    queryFn: async () => {
      let query = supabase.from("shot_lists").select("*").order("scheduled_date", { ascending: true });
      if (filters?.campaignId) query = query.eq("campaign_id", filters.campaignId);
      if (filters?.assignedTo) query = query.eq("assigned_to", filters.assignedTo);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateShotList() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      campaign_id: string;
      title: string;
      description?: string;
      location?: string;
      scheduled_date?: string;
      assigned_to?: string;
    }) => {
      const { data, error } = await supabase
        .from("shot_lists")
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shot_lists"] }),
  });
}

export function useUpdateShotList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<"shot_lists">>) => {
      const { error } = await supabase.from("shot_lists").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shot_lists"] }),
  });
}

export function useDeleteShotList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shot_lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shot_lists"] }),
  });
}

// ---- Deliverables ----
export function useDeliverables(filters?: { campaignId?: string; status?: string }) {
  return useQuery({
    queryKey: ["deliverables", filters],
    queryFn: async () => {
      let query = supabase.from("deliverables").select("*").order("due_date", { ascending: true });
      if (filters?.campaignId) query = query.eq("campaign_id", filters.campaignId);
      if (filters?.status) query = query.eq("status", filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDeliverable() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      campaign_id: string;
      name: string;
      type: string;
      description?: string;
      due_date?: string;
      assigned_to?: string;
    }) => {
      const { data, error } = await supabase
        .from("deliverables")
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliverables"] }),
  });
}

export function useUpdateDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<"deliverables">>) => {
      const { error } = await supabase.from("deliverables").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliverables"] }),
  });
}

export function useDeleteDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deliverables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliverables"] }),
  });
}

// ---- Notifications ----
export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: ["notifications", user.id] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: ["notifications", user.id] });
    },
  });
}

// ---- Comments ----
export function useComments(filters?: { taskId?: string; approvalId?: string; assetId?: string }) {
  return useQuery({
    queryKey: ["comments", filters],
    queryFn: async () => {
      let query = supabase.from("comments").select("*, author:author_id(display_name, avatar_url)").order("created_at", { ascending: true });
      if (filters?.taskId) query = query.eq("task_id", filters.taskId);
      if (filters?.approvalId) query = query.eq("approval_id", filters.approvalId);
      if (filters?.assetId) query = query.eq("asset_id", filters.assetId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      task_id?: string;
      approval_id?: string;
      asset_id?: string;
      content: string;
      mentions?: string[];
    }) => {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          ...input,
          author_id: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments"] }),
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments"] }),
  });
}

// ---- Campaign Metrics ----
export function useCampaignMetrics(campaignId?: string) {
  return useQuery({
    queryKey: ["campaign_metrics", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("campaign_metrics")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });
}
