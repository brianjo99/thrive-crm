-- ============================================================
-- RLS HARDENING: Role-based access control at database level
-- Applied: 2026-04-05
-- ============================================================

-- Helper: returns true if current user is an internal CRM user
CREATE OR REPLACE FUNCTION is_internal_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $func$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role::text IN ('owner', 'editor', 'videographer')
  )
$func$;

-- INVOICES: owner only
DROP POLICY IF EXISTS "auth_all_invoices" ON invoices;
CREATE POLICY "owner_all_invoices" ON invoices
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- AD ACCOUNTS: owner only
DROP POLICY IF EXISTS "Authenticated can manage ad accounts" ON ad_accounts;
CREATE POLICY "owner_all_ad_accounts" ON ad_accounts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- CONTENT CALENDAR: owner only
DROP POLICY IF EXISTS "auth_all_content_calendar" ON content_calendar;
CREATE POLICY "owner_all_content_calendar" ON content_calendar
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- LEADS: owner only (public INSERT kept for lead capture forms)
DROP POLICY IF EXISTS "Authenticated can view leads" ON leads;
DROP POLICY IF EXISTS "Authenticated can update leads" ON leads;
DROP POLICY IF EXISTS "Authenticated can delete leads" ON leads;
CREATE POLICY "owner_select_leads" ON leads
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "owner_update_leads" ON leads
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "owner_delete_leads" ON leads
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role));

-- UNPAID ALERTS: owner only
DROP POLICY IF EXISTS "Authenticated can view alerts" ON unpaid_alerts;
DROP POLICY IF EXISTS "Authenticated can update alerts" ON unpaid_alerts;
DROP POLICY IF EXISTS "Authenticated can insert alerts" ON unpaid_alerts;
CREATE POLICY "owner_all_unpaid_alerts" ON unpaid_alerts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- CAMPAIGNS: internal read, owner write
DROP POLICY IF EXISTS "Authenticated can view campaigns" ON campaigns;
DROP POLICY IF EXISTS "Authenticated can insert campaigns" ON campaigns;
DROP POLICY IF EXISTS "Authenticated can update campaigns" ON campaigns;
CREATE POLICY "internal_select_campaigns" ON campaigns
  FOR SELECT TO authenticated USING (is_internal_user());
CREATE POLICY "owner_insert_campaigns" ON campaigns
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "owner_update_campaigns" ON campaigns
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- CLIENTS: internal read, owner write
DROP POLICY IF EXISTS "Authenticated can view clients" ON clients;
DROP POLICY IF EXISTS "Authenticated can insert clients" ON clients;
DROP POLICY IF EXISTS "Authenticated can update clients" ON clients;
CREATE POLICY "internal_select_clients" ON clients
  FOR SELECT TO authenticated USING (is_internal_user());
CREATE POLICY "owner_insert_clients" ON clients
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "owner_update_clients" ON clients
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- TASKS: scoped by assignee role
DROP POLICY IF EXISTS "Authenticated can view tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated can update tasks" ON tasks;
CREATE POLICY "role_select_tasks" ON tasks
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'owner'::app_role) OR
    (has_role(auth.uid(), 'editor'::app_role) AND assignee::text = 'editor') OR
    (has_role(auth.uid(), 'videographer'::app_role) AND assignee::text = 'videographer')
  );
CREATE POLICY "owner_insert_tasks" ON tasks
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "role_update_tasks" ON tasks
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role) OR
    (has_role(auth.uid(), 'editor'::app_role) AND assignee::text = 'editor') OR
    (has_role(auth.uid(), 'videographer'::app_role) AND assignee::text = 'videographer')
  )
  WITH CHECK (
    has_role(auth.uid(), 'owner'::app_role) OR
    (has_role(auth.uid(), 'editor'::app_role) AND assignee::text = 'editor') OR
    (has_role(auth.uid(), 'videographer'::app_role) AND assignee::text = 'videographer')
  );

-- APPROVALS: internal read, owner write
DROP POLICY IF EXISTS "Authenticated can view approvals" ON approvals;
DROP POLICY IF EXISTS "Authenticated can insert approvals" ON approvals;
DROP POLICY IF EXISTS "Authenticated can update approvals" ON approvals;
CREATE POLICY "internal_select_approvals" ON approvals
  FOR SELECT TO authenticated USING (is_internal_user());
CREATE POLICY "owner_insert_approvals" ON approvals
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "owner_update_approvals" ON approvals
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- SCRIPTS: internal read, owner write
DROP POLICY IF EXISTS "auth_all_scripts" ON scripts;
CREATE POLICY "internal_select_scripts" ON scripts
  FOR SELECT TO authenticated USING (is_internal_user());
CREATE POLICY "owner_insert_scripts" ON scripts
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "owner_update_scripts" ON scripts
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "owner_delete_scripts" ON scripts
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role));

-- CALL SHEETS: internal read, owner write
DROP POLICY IF EXISTS "auth_all_call_sheets" ON call_sheets;
CREATE POLICY "internal_select_call_sheets" ON call_sheets
  FOR SELECT TO authenticated USING (is_internal_user());
CREATE POLICY "owner_insert_call_sheets" ON call_sheets
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "owner_update_call_sheets" ON call_sheets
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "owner_delete_call_sheets" ON call_sheets
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role));

-- SHOT LISTS: internal read, owner write
DROP POLICY IF EXISTS "Authenticated can view shot lists" ON shot_lists;
DROP POLICY IF EXISTS "Authenticated can insert shot lists" ON shot_lists;
DROP POLICY IF EXISTS "Authenticated can update shot lists" ON shot_lists;
CREATE POLICY "internal_select_shot_lists" ON shot_lists
  FOR SELECT TO authenticated USING (is_internal_user());
CREATE POLICY "owner_insert_shot_lists" ON shot_lists
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "owner_update_shot_lists" ON shot_lists
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- REVISION ROUNDS: internal read, owner write
DROP POLICY IF EXISTS "auth_all_revision_rounds" ON revision_rounds;
CREATE POLICY "internal_select_revision_rounds" ON revision_rounds
  FOR SELECT TO authenticated USING (is_internal_user());
CREATE POLICY "owner_insert_revision_rounds" ON revision_rounds
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "owner_update_revision_rounds" ON revision_rounds
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "owner_delete_revision_rounds" ON revision_rounds
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role));

-- ASSETS: internal read, editor+owner upload
DROP POLICY IF EXISTS "Authenticated can view assets" ON assets;
DROP POLICY IF EXISTS "Authenticated can insert assets" ON assets;
DROP POLICY IF EXISTS "Authenticated can update assets" ON assets;
CREATE POLICY "internal_select_assets" ON assets
  FOR SELECT TO authenticated USING (is_internal_user());
CREATE POLICY "owner_editor_insert_assets" ON assets
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'editor'::app_role)
  );
CREATE POLICY "uploader_owner_update_assets" ON assets
  FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (uploaded_by = auth.uid() OR has_role(auth.uid(), 'owner'::app_role));

-- DELIVERABLES: internal read, owner write
DROP POLICY IF EXISTS "Authenticated can view deliverables" ON deliverables;
DROP POLICY IF EXISTS "Authenticated can insert deliverables" ON deliverables;
DROP POLICY IF EXISTS "Authenticated can update deliverables" ON deliverables;
CREATE POLICY "internal_select_deliverables" ON deliverables
  FOR SELECT TO authenticated USING (is_internal_user());
CREATE POLICY "owner_insert_deliverables" ON deliverables
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "owner_update_deliverables" ON deliverables
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- CLIENT ONBOARDING: internal read, owner write
DROP POLICY IF EXISTS "Authenticated can view onboarding" ON client_onboarding;
DROP POLICY IF EXISTS "Authenticated can insert onboarding" ON client_onboarding;
DROP POLICY IF EXISTS "Authenticated can update onboarding" ON client_onboarding;
CREATE POLICY "internal_select_client_onboarding" ON client_onboarding
  FOR SELECT TO authenticated USING (is_internal_user());
CREATE POLICY "owner_insert_client_onboarding" ON client_onboarding
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "owner_update_client_onboarding" ON client_onboarding
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- COMMENTS: internal users only
DROP POLICY IF EXISTS "Authenticated can view comments" ON comments;
DROP POLICY IF EXISTS "Authenticated can insert comments" ON comments;
CREATE POLICY "internal_select_comments" ON comments
  FOR SELECT TO authenticated USING (is_internal_user());
CREATE POLICY "internal_insert_comments" ON comments
  FOR INSERT TO authenticated WITH CHECK (is_internal_user() AND author_id = auth.uid());

-- CAMPAIGN METRICS: internal read
DROP POLICY IF EXISTS "Authenticated can view metrics" ON campaign_metrics;
CREATE POLICY "internal_select_campaign_metrics" ON campaign_metrics
  FOR SELECT TO authenticated USING (is_internal_user());

-- UNPAID ALERTS: owner only (see above)

-- PROFILES: users update own, owner updates any
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'owner'::app_role));
