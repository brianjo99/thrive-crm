
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('owner', 'editor', 'videographer', 'client');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owners can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile and owner role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  IF (SELECT count(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'editor');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enums
CREATE TYPE public.client_type AS ENUM ('business', 'influencer', 'creator');
CREATE TYPE public.service_type AS ENUM ('film', 'edit', 'post', 'report');
CREATE TYPE public.pipeline_stage AS ENUM (
  'discovery', 'pre-production', 'filming', 'editing',
  'review', 'revisions', 'posting', 'reporting', 'complete'
);
CREATE TYPE public.task_status AS ENUM ('pending', 'in-progress', 'review', 'complete');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.campaign_template AS ENUM (
  'film-only', 'film-edit', 'film-edit-post', 'edit-only', 'full-service'
);

-- Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type client_type NOT NULL DEFAULT 'business',
  email TEXT,
  avatar_url TEXT,
  enabled_services service_type[] NOT NULL DEFAULT '{}',
  default_checklist JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update clients" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Owners can delete clients" ON public.clients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  template campaign_template NOT NULL,
  current_stage pipeline_stage NOT NULL DEFAULT 'discovery',
  stages pipeline_stage[] NOT NULL DEFAULT '{}',
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view campaigns" ON public.campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert campaigns" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update campaigns" ON public.campaigns FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Owners can delete campaigns" ON public.campaigns FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  assignee app_role,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  stage pipeline_stage NOT NULL,
  service_type service_type,
  checklist JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Owners can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Assets table
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view assets" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update assets" ON public.assets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Uploaders or owners can delete assets" ON public.assets FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'owner'));
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Approvals table
CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revision-requested', 'rejected')),
  reviewer_type TEXT NOT NULL DEFAULT 'internal' CHECK (reviewer_type IN ('internal', 'client')),
  reviewer_id UUID REFERENCES auth.users(id),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view approvals" ON public.approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert approvals" ON public.approvals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update approvals" ON public.approvals FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_approvals_updated_at BEFORE UPDATE ON public.approvals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Unpaid alerts table
CREATE TABLE public.unpaid_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_performed service_type NOT NULL,
  message TEXT NOT NULL,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.unpaid_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view alerts" ON public.unpaid_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert alerts" ON public.unpaid_alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update alerts" ON public.unpaid_alerts FOR UPDATE TO authenticated USING (true);

-- SOPs table
CREATE TABLE public.sops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  role app_role NOT NULL,
  category TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view SOPs" ON public.sops FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners can insert SOPs" ON public.sops FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update SOPs" ON public.sops FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can delete SOPs" ON public.sops FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'owner'));
CREATE TRIGGER update_sops_updated_at BEFORE UPDATE ON public.sops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for assets
INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true);
CREATE POLICY "Authenticated can upload assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assets');
CREATE POLICY "Anyone can view assets" ON storage.objects FOR SELECT USING (bucket_id = 'assets');
CREATE POLICY "Authenticated can update stored assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'assets');
CREATE POLICY "Authenticated can delete stored assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'assets');

-- Indexes
CREATE INDEX idx_tasks_campaign ON public.tasks(campaign_id);
CREATE INDEX idx_tasks_client ON public.tasks(client_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_campaigns_client ON public.campaigns(client_id);
CREATE INDEX idx_assets_campaign ON public.assets(campaign_id);
CREATE INDEX idx_assets_client ON public.assets(client_id);
CREATE INDEX idx_approvals_task ON public.approvals(task_id);
CREATE INDEX idx_approvals_status ON public.approvals(status);
