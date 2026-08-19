-- Production security hardening for account status, authorization and audit trails.
-- This migration is intentionally additive/idempotent and can be applied on top of
-- the existing production schema without replaying the historical migration set.

-- -----------------------------------------------------------------------------
-- Active-account authorization
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND p.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_internal_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role::text IN ('owner', 'editor', 'videographer')
      AND p.status = 'active'
  )
$$;

-- Called after Supabase establishes a valid session. It activates invited users,
-- records last activity, and returns the server-authoritative access state.
CREATE OR REPLACE FUNCTION public.get_current_access_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status text;
  current_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.profiles
  SET status = CASE WHEN status = 'invited' THEN 'active' ELSE status END,
      last_seen_at = now(),
      updated_at = now()
  WHERE user_id = auth.uid()
  RETURNING status INTO current_status;

  IF current_status IS NULL THEN
    current_status := 'unregistered';
  END IF;

  SELECT ur.role::text
  INTO current_role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1;

  RETURN jsonb_build_object(
    'status', current_status,
    'role', current_role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_current_access_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_access_state() TO authenticated;

-- Profiles are created by the auth trigger. Regular users may no longer change
-- their own status or identity columns from the browser.
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "internal users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "owners can update profiles" ON public.profiles;

CREATE POLICY "internal users can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_internal_user());

CREATE POLICY "owners can update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role));

-- Settings metadata can be read only by active internal accounts.
DROP POLICY IF EXISTS "all authenticated can read role_permissions" ON public.role_permissions;
CREATE POLICY "internal users can read role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS "all authenticated can read module_visibility" ON public.module_visibility;
CREATE POLICY "internal users can read module_visibility"
  ON public.module_visibility FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS "all authenticated can read teams" ON public.teams;
CREATE POLICY "internal users can read teams"
  ON public.teams FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS "all authenticated can read team_members" ON public.team_members;
CREATE POLICY "internal users can read team_members"
  ON public.team_members FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS "all authenticated can read org_settings" ON public.org_settings;
CREATE POLICY "internal users can read org_settings"
  ON public.org_settings FOR SELECT TO authenticated
  USING (public.is_internal_user());

-- -----------------------------------------------------------------------------
-- Close policies that exposed or allowed mutation of internal data too broadly.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "stage_history_all" ON public.campaign_stage_history;
CREATE POLICY "internal users can read campaign_stage_history"
  ON public.campaign_stage_history FOR SELECT TO authenticated
  USING (public.is_internal_user());
CREATE POLICY "owners can manage campaign_stage_history"
  ON public.campaign_stage_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role));

DROP POLICY IF EXISTS "client_notes_all" ON public.client_notes;
CREATE POLICY "internal users can read client_notes"
  ON public.client_notes FOR SELECT TO authenticated
  USING (public.is_internal_user());
CREATE POLICY "internal users can create client_notes"
  ON public.client_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_internal_user());
CREATE POLICY "internal users can update client_notes"
  ON public.client_notes FOR UPDATE TO authenticated
  USING (public.is_internal_user())
  WITH CHECK (public.is_internal_user());
CREATE POLICY "internal users can delete client_notes"
  ON public.client_notes FOR DELETE TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS "campaign_costs_policy" ON public.campaign_costs;
CREATE POLICY "owners can manage campaign_costs"
  ON public.campaign_costs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role));

DROP POLICY IF EXISTS "contracts_policy" ON public.contracts;
CREATE POLICY "owners can manage contracts"
  ON public.contracts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role));

DROP POLICY IF EXISTS "Authenticated users can manage quotes" ON public.quotes;
CREATE POLICY "owners can manage quotes"
  ON public.quotes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role));

DROP POLICY IF EXISTS "Authenticated can view tokens" ON public.client_portal_tokens;
CREATE POLICY "owners can view portal tokens"
  ON public.client_portal_tokens FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role));

DROP POLICY IF EXISTS "Authenticated can view brand_kit" ON public.brand_kit;
DROP POLICY IF EXISTS "Authenticated can insert brand_kit" ON public.brand_kit;
DROP POLICY IF EXISTS "Authenticated can update brand_kit" ON public.brand_kit;
CREATE POLICY "internal users can view brand_kit"
  ON public.brand_kit FOR SELECT TO authenticated
  USING (public.is_internal_user());
CREATE POLICY "owners can insert brand_kit"
  ON public.brand_kit FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role));
CREATE POLICY "owners can update brand_kit"
  ON public.brand_kit FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role));

DROP POLICY IF EXISTS "System can insert metrics" ON public.campaign_metrics;
DROP POLICY IF EXISTS "Authenticated can view metrics" ON public.campaign_metrics;
CREATE POLICY "internal users can view campaign_metrics"
  ON public.campaign_metrics FOR SELECT TO authenticated
  USING (public.is_internal_user());
CREATE POLICY "owners can insert campaign_metrics"
  ON public.campaign_metrics FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role));

-- Service-role clients bypass RLS, so no browser INSERT policy is needed.
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "active users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_internal_user());
CREATE POLICY "active users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.is_internal_user())
  WITH CHECK (user_id = auth.uid() AND public.is_internal_user());
CREATE POLICY "active users can delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.is_internal_user());

DROP POLICY IF EXISTS "Authenticated can view SOPs" ON public.sops;
CREATE POLICY "internal users can view sops"
  ON public.sops FOR SELECT TO authenticated
  USING (public.is_internal_user());

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "active users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_internal_user());

-- Public forms submit through a narrow RPC so callers cannot forge status,
-- internal notes, ad attribution, timestamps, or oversized payloads.
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
REVOKE INSERT ON public.leads FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_public_lead(
  p_nombre text,
  p_email text,
  p_servicio text DEFAULT NULL,
  p_mensaje text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_id uuid;
  clean_name text := trim(COALESCE(p_nombre, ''));
  clean_email text := lower(trim(COALESCE(p_email, '')));
BEGIN
  IF length(clean_name) < 2 OR length(clean_name) > 120 THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;
  IF length(clean_email) > 254 OR clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;
  IF length(COALESCE(p_servicio, '')) > 160 OR length(COALESCE(p_mensaje, '')) > 3000 THEN
    RAISE EXCEPTION 'Payload too long';
  END IF;

  INSERT INTO public.leads (nombre, email, servicio, mensaje, status, source)
  VALUES (
    clean_name,
    clean_email,
    NULLIF(trim(p_servicio), ''),
    NULLIF(trim(p_mensaje), ''),
    'new',
    'website'
  )
  RETURNING id INTO lead_id;

  RETURN lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_lead(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_lead(text, text, text, text) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Tamper-resistant audit trail
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "audit_read" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "service can insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "owners can read audit_logs" ON public.audit_logs;

CREATE POLICY "owners can read audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role));

REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_row jsonb := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  new_row jsonb := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  event_action text;
  event_resource_type text := TG_TABLE_NAME;
  event_resource_id text;
  event_resource_name text;
  event_old_value jsonb;
  event_new_value jsonb;
  current_actor_name text;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'user_roles' THEN
      event_action := 'change_role';
      event_resource_type := 'account';
      event_resource_id := COALESCE(new_row->>'user_id', old_row->>'user_id');
      event_old_value := CASE WHEN old_row IS NULL THEN NULL ELSE jsonb_build_object('role', old_row->>'role') END;
      event_new_value := CASE WHEN new_row IS NULL THEN NULL ELSE jsonb_build_object('role', new_row->>'role') END;
    WHEN 'profiles' THEN
      IF old_row->>'status' IS NOT DISTINCT FROM new_row->>'status' THEN RETURN NEW; END IF;
      event_action := 'change_status';
      event_resource_type := 'account';
      event_resource_id := new_row->>'user_id';
      event_resource_name := new_row->>'display_name';
      event_old_value := jsonb_build_object('status', old_row->>'status');
      event_new_value := jsonb_build_object('status', new_row->>'status');
    WHEN 'role_permissions' THEN
      event_action := 'change_permission';
      event_resource_type := 'role_permission';
      event_resource_id := COALESCE(new_row->>'role', old_row->>'role') || ':' || COALESCE(new_row->>'module', old_row->>'module');
      event_old_value := old_row - ARRAY['id'];
      event_new_value := new_row - ARRAY['id'];
    WHEN 'module_visibility' THEN
      event_action := 'change_visibility';
      event_resource_type := 'module_visibility';
      event_resource_id := COALESCE(new_row->>'role', old_row->>'role', new_row->>'user_id', old_row->>'user_id') || ':' || COALESCE(new_row->>'module', old_row->>'module');
      event_old_value := CASE WHEN old_row IS NULL THEN NULL ELSE jsonb_build_object('is_visible', (old_row->>'is_visible')::boolean) END;
      event_new_value := CASE WHEN new_row IS NULL THEN NULL ELSE jsonb_build_object('is_visible', (new_row->>'is_visible')::boolean) END;
    WHEN 'org_settings' THEN
      event_action := 'change_setting';
      event_resource_type := 'setting';
      event_resource_id := new_row->>'key';
      event_resource_name := new_row->>'key';
      event_old_value := old_row->'value';
      event_new_value := new_row->'value';
    WHEN 'teams' THEN
      event_action := CASE TG_OP WHEN 'INSERT' THEN 'create_team' WHEN 'DELETE' THEN 'delete_team' ELSE 'update_team' END;
      event_resource_type := 'team';
      event_resource_id := COALESCE(new_row->>'id', old_row->>'id');
      event_resource_name := COALESCE(new_row->>'name', old_row->>'name');
    WHEN 'team_members' THEN
      event_action := CASE TG_OP WHEN 'DELETE' THEN 'remove_team_member' ELSE 'add_team_member' END;
      event_resource_type := 'team_member';
      event_resource_id := COALESCE(new_row->>'id', old_row->>'id');
      event_new_value := new_row - ARRAY['id', 'created_at'];
      event_old_value := old_row - ARRAY['id', 'created_at'];
    WHEN 'campaigns' THEN
      IF TG_OP = 'INSERT' THEN
        event_action := 'create_campaign';
      ELSIF old_row->>'current_stage' IS DISTINCT FROM new_row->>'current_stage' THEN
        event_action := 'advance_stage';
        event_old_value := jsonb_build_object('stage', old_row->>'current_stage');
        event_new_value := jsonb_build_object('stage', new_row->>'current_stage');
      ELSE
        RETURN NEW;
      END IF;
      event_resource_type := 'campaign';
      event_resource_id := new_row->>'id';
      event_resource_name := new_row->>'name';
    WHEN 'clients' THEN
      event_action := 'create_client';
      event_resource_type := 'client';
      event_resource_id := new_row->>'id';
      event_resource_name := new_row->>'name';
    WHEN 'campaign_costs' THEN
      event_action := CASE TG_OP WHEN 'DELETE' THEN 'delete_cost' ELSE 'create_cost' END;
      event_resource_type := 'campaign_cost';
      event_resource_id := COALESCE(new_row->>'id', old_row->>'id');
      event_resource_name := COALESCE(new_row->>'description', old_row->>'description');
      event_new_value := CASE WHEN new_row IS NULL THEN NULL ELSE jsonb_build_object('amount', new_row->>'amount', 'category', new_row->>'category') END;
    WHEN 'contracts' THEN
      event_action := CASE TG_OP WHEN 'DELETE' THEN 'delete_contract' ELSE 'create_contract' END;
      event_resource_type := 'contract';
      event_resource_id := COALESCE(new_row->>'id', old_row->>'id');
      event_resource_name := COALESCE(new_row->>'name', old_row->>'name');
    WHEN 'leads' THEN
      IF old_row->>'status' IS NOT DISTINCT FROM new_row->>'status' THEN RETURN NEW; END IF;
      event_action := 'lead_status';
      event_resource_type := 'lead';
      event_resource_id := new_row->>'id';
      event_resource_name := COALESCE(new_row->>'nombre', new_row->>'name');
      event_old_value := jsonb_build_object('status', old_row->>'status');
      event_new_value := jsonb_build_object('status', new_row->>'status');
    WHEN 'ad_accounts' THEN
      event_action := CASE TG_OP WHEN 'INSERT' THEN 'create_ad_account' WHEN 'DELETE' THEN 'delete_ad_account' ELSE 'update_ad_account' END;
      event_resource_type := 'ad_account';
      event_resource_id := COALESCE(new_row->>'id', old_row->>'id');
      event_resource_name := COALESCE(new_row->>'account_name', old_row->>'account_name');
      event_old_value := CASE WHEN old_row IS NULL THEN NULL ELSE jsonb_build_object('platform', old_row->>'platform', 'status', old_row->>'status', 'monthly_budget', old_row->>'monthly_budget') END;
      event_new_value := CASE WHEN new_row IS NULL THEN NULL ELSE jsonb_build_object('platform', new_row->>'platform', 'status', new_row->>'status', 'monthly_budget', new_row->>'monthly_budget') END;
    ELSE
      IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END CASE;

  SELECT p.display_name INTO current_actor_name
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;

  INSERT INTO public.audit_logs (
    actor_id, actor_name, action, resource_type, resource_id,
    resource_name, old_value, new_value
  ) VALUES (
    auth.uid(), COALESCE(current_actor_name, 'Sistema'), event_action,
    event_resource_type, event_resource_id, event_resource_name,
    event_old_value, event_new_value
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_profile_status ON public.profiles;
CREATE TRIGGER audit_profile_status AFTER UPDATE OF status ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_role_permissions ON public.role_permissions;
CREATE TRIGGER audit_role_permissions AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_module_visibility ON public.module_visibility;
CREATE TRIGGER audit_module_visibility AFTER INSERT OR UPDATE OR DELETE ON public.module_visibility
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_org_settings ON public.org_settings;
CREATE TRIGGER audit_org_settings AFTER INSERT OR UPDATE OR DELETE ON public.org_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_teams ON public.teams;
CREATE TRIGGER audit_teams AFTER INSERT OR UPDATE OR DELETE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_team_members ON public.team_members;
CREATE TRIGGER audit_team_members AFTER INSERT OR DELETE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_campaigns ON public.campaigns;
CREATE TRIGGER audit_campaigns AFTER INSERT OR UPDATE OF current_stage ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_clients ON public.clients;
CREATE TRIGGER audit_clients AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_campaign_costs ON public.campaign_costs;
CREATE TRIGGER audit_campaign_costs AFTER INSERT OR DELETE ON public.campaign_costs
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_contracts ON public.contracts;
CREATE TRIGGER audit_contracts AFTER INSERT OR DELETE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_lead_status ON public.leads;
CREATE TRIGGER audit_lead_status AFTER UPDATE OF status ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_ad_accounts ON public.ad_accounts;
CREATE TRIGGER audit_ad_accounts AFTER INSERT OR UPDATE OR DELETE ON public.ad_accounts
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
