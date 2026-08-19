-- ============================================================
-- Settings Module Migration
-- Run this in Supabase → SQL Editor
-- ============================================================

-- 1. Add email & status to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'suspended', 'disabled')),
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Sync existing emails from auth.users into profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Trigger: keep profiles.email in sync with auth.users.email
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email();

-- Also populate on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name', NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = NEW.email;
  RETURN NEW;
END;
$$;

-- 2. Role permissions table (per-module permissions per role)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role        text NOT NULL,
  module      text NOT NULL,
  can_view    boolean NOT NULL DEFAULT false,
  can_create  boolean NOT NULL DEFAULT false,
  can_edit    boolean NOT NULL DEFAULT false,
  can_delete  boolean NOT NULL DEFAULT false,
  can_approve boolean NOT NULL DEFAULT false,
  can_manage  boolean NOT NULL DEFAULT false,
  UNIQUE(role, module)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners can manage role_permissions"
  ON public.role_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "all authenticated can read role_permissions"
  ON public.role_permissions FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. Module visibility (per role, optional user-level override)
CREATE TABLE IF NOT EXISTS public.module_visibility (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role       text,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  module     text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  CONSTRAINT one_scope CHECK (
    (role IS NOT NULL AND user_id IS NULL) OR
    (role IS NULL AND user_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS module_visibility_role_module
  ON public.module_visibility (role, module) WHERE user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS module_visibility_user_module
  ON public.module_visibility (user_id, module) WHERE role IS NULL;

ALTER TABLE public.module_visibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners can manage module_visibility"
  ON public.module_visibility FOR ALL
  USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "all authenticated can read module_visibility"
  ON public.module_visibility FOR SELECT
  USING (auth.role() = 'authenticated');

-- 4. Teams
CREATE TABLE IF NOT EXISTS public.teams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners can manage teams"
  ON public.teams FOR ALL
  USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "all authenticated can read teams"
  ON public.teams FOR SELECT
  USING (auth.role() = 'authenticated');

-- 5. Team members
CREATE TABLE IF NOT EXISTS public.team_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_team text NOT NULL DEFAULT 'member',
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners can manage team_members"
  ON public.team_members FOR ALL
  USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "all authenticated can read team_members"
  ON public.team_members FOR SELECT
  USING (auth.role() = 'authenticated');

-- 6. Audit log
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      uuid REFERENCES auth.users(id),
  actor_name    text,
  action        text NOT NULL,
  resource_type text NOT NULL,
  resource_id   text,
  resource_name text,
  old_value     jsonb,
  new_value     jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners can read audit_logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "service can insert audit_logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 7. Org settings (key-value store)
CREATE TABLE IF NOT EXISTS public.org_settings (
  key        text PRIMARY KEY,
  value      jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners can manage org_settings"
  ON public.org_settings FOR ALL
  USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "all authenticated can read org_settings"
  ON public.org_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Default org settings
INSERT INTO public.org_settings (key, value) VALUES
  ('org_name',    '"Thrive Agency"'),
  ('timezone',    '"America/New_York"'),
  ('currency',    '"USD"'),
  ('language',    '"es"'),
  ('date_format', '"MM/dd/yyyy"')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Default role permissions
-- ============================================================
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_approve, can_manage) VALUES
-- owner: full access to everything
('owner','dashboard',   true,true,true,true,true,true),
('owner','clients',     true,true,true,true,true,true),
('owner','campaigns',   true,true,true,true,true,true),
('owner','tasks',       true,true,true,true,true,true),
('owner','calendar',    true,true,true,true,true,true),
('owner','scripts',     true,true,true,true,true,true),
('owner','call_sheets', true,true,true,true,true,true),
('owner','assets',      true,true,true,true,true,true),
('owner','approvals',   true,true,true,true,true,true),
('owner','invoices',    true,true,true,true,true,true),
('owner','leads',       true,true,true,true,true,true),
('owner','ads',         true,true,true,true,true,true),
('owner','templates',   true,true,true,true,true,true),
('owner','settings',    true,true,true,true,true,true),
-- editor: only their work
('editor','tasks',       true,false,true,false,false,false),
('editor','assets',      true,true,true,false,false,false),
('editor','call_sheets', true,false,false,false,false,false),
-- videographer: filming only
('videographer','tasks',       true,false,true,false,false,false),
('videographer','call_sheets', true,false,false,false,false,false)
ON CONFLICT (role, module) DO NOTHING;

-- ============================================================
-- Default module visibility per role
-- ============================================================
INSERT INTO public.module_visibility (role, module, is_visible) VALUES
-- owner sees all
('owner','dashboard',   true),
('owner','clients',     true),
('owner','campaigns',   true),
('owner','tasks',       true),
('owner','calendar',    true),
('owner','scripts',     true),
('owner','call_sheets', true),
('owner','assets',      true),
('owner','approvals',   true),
('owner','invoices',    true),
('owner','leads',       true),
('owner','ads',         true),
('owner','templates',   true),
('owner','settings',    true),
-- editor: limited
('editor','dashboard',   false),
('editor','clients',     false),
('editor','campaigns',   false),
('editor','tasks',       true),
('editor','calendar',    false),
('editor','scripts',     false),
('editor','call_sheets', true),
('editor','assets',      true),
('editor','approvals',   false),
('editor','invoices',    false),
('editor','leads',       false),
('editor','ads',         false),
('editor','templates',   false),
('editor','settings',    false),
-- videographer: filming only
('videographer','dashboard',   false),
('videographer','clients',     false),
('videographer','campaigns',   false),
('videographer','tasks',       true),
('videographer','calendar',    false),
('videographer','scripts',     false),
('videographer','call_sheets', true),
('videographer','assets',      false),
('videographer','approvals',   false),
('videographer','invoices',    false),
('videographer','leads',       false),
('videographer','ads',         false),
('videographer','templates',   false),
('videographer','settings',    false)
ON CONFLICT DO NOTHING;
