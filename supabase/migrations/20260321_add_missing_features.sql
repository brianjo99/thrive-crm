-- Client Onboarding Table
CREATE TABLE public.client_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed')),
  requirements JSONB DEFAULT '{}',
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view onboarding" ON public.client_onboarding FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert onboarding" ON public.client_onboarding FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update onboarding" ON public.client_onboarding FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Owners can delete onboarding" ON public.client_onboarding FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE TRIGGER update_client_onboarding_updated_at BEFORE UPDATE ON public.client_onboarding FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Shot Lists Table
CREATE TABLE public.shot_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  scheduled_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in-progress', 'completed', 'cancelled')),
  shots JSONB DEFAULT '[]',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shot_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view shot lists" ON public.shot_lists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert shot lists" ON public.shot_lists FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update shot lists" ON public.shot_lists FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Owners can delete shot lists" ON public.shot_lists FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE TRIGGER update_shot_lists_updated_at BEFORE UPDATE ON public.shot_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Deliverables Table
CREATE TABLE public.deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'image', 'document', 'report', 'reel', 'thumbnail')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'ready', 'delivered', 'approved')),
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id),
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view deliverables" ON public.deliverables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert deliverables" ON public.deliverables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update deliverables" ON public.deliverables FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Owners can delete deliverables" ON public.deliverables FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE TRIGGER update_deliverables_updated_at BEFORE UPDATE ON public.deliverables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notifications Table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('approval', 'task', 'campaign', 'asset', 'message')),
  title TEXT NOT NULL,
  message TEXT,
  related_id UUID,
  related_type TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Comments Table (for collaboration)
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  approval_id UUID REFERENCES public.approvals(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view comments" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authors can update own comments" ON public.comments FOR UPDATE TO authenticated USING (author_id = auth.uid());
CREATE POLICY "Authors can delete own comments" ON public.comments FOR DELETE TO authenticated USING (author_id = auth.uid());
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Client Portal Access Tokens
CREATE TABLE public.client_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_portal_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view tokens" ON public.client_portal_tokens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners can manage tokens" ON public.client_portal_tokens FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner'));

-- Campaign Performance Metrics
CREATE TABLE public.campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  tasks_completed INTEGER DEFAULT 0,
  tasks_pending INTEGER DEFAULT 0,
  approvals_pending INTEGER DEFAULT 0,
  assets_uploaded INTEGER DEFAULT 0,
  on_schedule BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view metrics" ON public.campaign_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert metrics" ON public.campaign_metrics FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_client_onboarding_client ON public.client_onboarding(client_id);
CREATE INDEX idx_shot_lists_campaign ON public.shot_lists(campaign_id);
CREATE INDEX idx_shot_lists_assigned ON public.shot_lists(assigned_to);
CREATE INDEX idx_deliverables_campaign ON public.deliverables(campaign_id);
CREATE INDEX idx_deliverables_status ON public.deliverables(status);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_comments_task ON public.comments(task_id);
CREATE INDEX idx_comments_approval ON public.comments(approval_id);
CREATE INDEX idx_campaign_metrics_campaign ON public.campaign_metrics(campaign_id);
