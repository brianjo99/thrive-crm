-- Secure client portal access and centralize account administration.

BEGIN;

CREATE TABLE IF NOT EXISTS public.client_portal_access (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_portal_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners can read client_portal_access" ON public.client_portal_access;
CREATE POLICY "owners can read client_portal_access"
  ON public.client_portal_access FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role));

REVOKE INSERT, UPDATE, DELETE ON public.client_portal_access FROM anon, authenticated;
GRANT SELECT ON public.client_portal_access TO authenticated;

DROP TRIGGER IF EXISTS update_client_portal_access_updated_at ON public.client_portal_access;
CREATE TRIGGER update_client_portal_access_updated_at
  BEFORE UPDATE ON public.client_portal_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Role and status mutations go through validated RPCs so an owner cannot
-- accidentally remove the final active owner or strand a client account.
DROP POLICY IF EXISTS "Owners can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "owners can read all roles" ON public.user_roles;
CREATE POLICY "owners can read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role));

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;

DROP POLICY IF EXISTS "owners can update profiles" ON public.profiles;
REVOKE UPDATE ON public.profiles FROM authenticated;

CREATE OR REPLACE FUNCTION public.set_account_role(
  p_user_id uuid,
  p_role public.app_role,
  p_client_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_role public.app_role;
  target_status text;
  active_owner_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner'::public.app_role) THEN
    RAISE EXCEPTION 'Owner access required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  SELECT role INTO previous_role
  FROM public.user_roles
  WHERE user_id = p_user_id;

  SELECT status INTO target_status
  FROM public.profiles
  WHERE user_id = p_user_id;

  IF previous_role = 'owner'::public.app_role
     AND target_status = 'active'
     AND p_role <> 'owner'::public.app_role THEN
    SELECT count(*) INTO active_owner_count
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.role = 'owner'::public.app_role
      AND p.status = 'active';

    IF active_owner_count <= 1 THEN
      RAISE EXCEPTION 'The final active owner cannot be demoted';
    END IF;
  END IF;

  IF p_role = 'client'::public.app_role THEN
    IF p_client_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN
      RAISE EXCEPTION 'A valid client is required for portal access';
    END IF;

    INSERT INTO public.client_portal_access (user_id, client_id, granted_by, updated_at)
    VALUES (p_user_id, p_client_id, auth.uid(), now())
    ON CONFLICT (user_id) DO UPDATE
      SET client_id = EXCLUDED.client_id,
          granted_by = EXCLUDED.granted_by,
          updated_at = now();
  ELSE
    DELETE FROM public.client_portal_access WHERE user_id = p_user_id;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, p_role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
END;
$$;

REVOKE ALL ON FUNCTION public.set_account_role(uuid, public.app_role, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_account_role(uuid, public.app_role, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_account_status(
  p_user_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_role public.app_role;
  target_status text;
  active_owner_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner'::public.app_role) THEN
    RAISE EXCEPTION 'Owner access required';
  END IF;

  IF p_status NOT IN ('active', 'invited', 'suspended', 'disabled') THEN
    RAISE EXCEPTION 'Invalid account status';
  END IF;

  IF p_user_id = auth.uid() AND p_status IN ('suspended', 'disabled') THEN
    RAISE EXCEPTION 'You cannot suspend or disable your own account';
  END IF;

  SELECT ur.role, p.status INTO target_role, target_status
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE p.user_id = p_user_id;

  IF target_role = 'owner'::public.app_role
     AND target_status = 'active'
     AND p_status <> 'active' THEN
    SELECT count(*) INTO active_owner_count
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.role = 'owner'::public.app_role
      AND p.status = 'active';

    IF active_owner_count <= 1 THEN
      RAISE EXCEPTION 'The final active owner cannot be suspended or disabled';
    END IF;
  END IF;

  UPDATE public.profiles
  SET status = p_status,
      updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_account_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_account_status(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_client_portal_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  portal_client_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'client'::public.app_role) THEN
    RAISE EXCEPTION 'Active client access required';
  END IF;

  SELECT client_id INTO portal_client_id
  FROM public.client_portal_access
  WHERE user_id = auth.uid();

  IF portal_client_id IS NULL THEN
    RETURN jsonb_build_object(
      'client', NULL,
      'campaigns', '[]'::jsonb,
      'approvals', '[]'::jsonb,
      'deliverables', '[]'::jsonb,
      'calendar', '[]'::jsonb,
      'invoices', '[]'::jsonb,
      'alerts', '[]'::jsonb
    );
  END IF;

  RETURN jsonb_build_object(
    'client', (
      SELECT jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'avatar_url', c.avatar_url,
        'email', c.email
      )
      FROM public.clients c
      WHERE c.id = portal_client_id
    ),
    'campaigns', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'current_stage', c.current_stage,
          'stages', c.stages,
          'due_date', c.due_date
        ) ORDER BY c.created_at DESC
      ), '[]'::jsonb)
      FROM public.campaigns c
      WHERE c.client_id = portal_client_id
    ),
    'approvals', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'status', a.status,
          'feedback', a.feedback,
          'created_at', a.created_at,
          'updated_at', a.updated_at,
          'tasks', CASE WHEN t.id IS NULL THEN NULL ELSE jsonb_build_object('title', t.title, 'description', t.description) END,
          'campaigns', CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object('name', c.name) END,
          'assets', CASE WHEN ast.id IS NULL THEN NULL ELSE jsonb_build_object('name', ast.name, 'file_type', ast.file_type) END
        ) ORDER BY a.created_at DESC
      ), '[]'::jsonb)
      FROM public.approvals a
      LEFT JOIN public.tasks t ON t.id = a.task_id
      LEFT JOIN public.campaigns c ON c.id = a.campaign_id
      LEFT JOIN public.assets ast ON ast.id = a.asset_id
      WHERE a.client_id = portal_client_id
        AND a.reviewer_type = 'client'
    ),
    'deliverables', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'name', d.name,
          'status', d.status,
          'type', d.type,
          'due_date', d.due_date,
          'campaigns', jsonb_build_object('name', c.name)
        )
        ORDER BY d.due_date ASC NULLS LAST, d.created_at DESC
      ), '[]'::jsonb)
      FROM public.deliverables d
      JOIN public.campaigns c ON c.id = d.campaign_id
      WHERE c.client_id = portal_client_id
    ),
    'calendar', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', cc.id,
          'platform', cc.platform,
          'content_type', cc.content_type,
          'caption', cc.caption,
          'scheduled_date', cc.scheduled_date
        ) ORDER BY cc.scheduled_date ASC
      ), '[]'::jsonb)
      FROM (
        SELECT *
        FROM public.content_calendar
        WHERE client_id = portal_client_id
          AND scheduled_date >= CURRENT_DATE
          AND status IN ('scheduled', 'draft')
        ORDER BY scheduled_date ASC
        LIMIT 6
      ) cc
    ),
    'invoices', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'invoice_number', i.invoice_number,
          'status', i.status,
          'due_date', i.due_date,
          'created_at', i.created_at,
          'total', i.total
        ) ORDER BY i.created_at DESC
      ), '[]'::jsonb)
      FROM (
        SELECT *
        FROM public.invoices
        WHERE client_id = portal_client_id
          AND status IN ('sent', 'overdue', 'paid')
        ORDER BY created_at DESC
        LIMIT 8
      ) i
    ),
    'alerts', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', ua.id,
          'message', ua.message,
          'created_at', ua.created_at
        ) ORDER BY ua.created_at DESC
      ), '[]'::jsonb)
      FROM public.unpaid_alerts ua
      WHERE ua.client_id = portal_client_id
        AND ua.dismissed = false
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_portal_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_portal_snapshot() TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_client_approval_decision(
  p_approval_id uuid,
  p_status text,
  p_feedback text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  portal_client_id uuid;
  approval_name text;
  actor_name text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'client'::public.app_role) THEN
    RAISE EXCEPTION 'Active client access required';
  END IF;

  IF p_status NOT IN ('approved', 'revision-requested') THEN
    RAISE EXCEPTION 'Invalid approval status';
  END IF;

  IF length(COALESCE(p_feedback, '')) > 3000 THEN
    RAISE EXCEPTION 'Feedback is too long';
  END IF;

  IF p_status = 'revision-requested' AND length(trim(COALESCE(p_feedback, ''))) < 3 THEN
    RAISE EXCEPTION 'Feedback is required when requesting changes';
  END IF;

  SELECT client_id INTO portal_client_id
  FROM public.client_portal_access
  WHERE user_id = auth.uid();

  UPDATE public.approvals a
  SET status = p_status,
      feedback = NULLIF(trim(p_feedback), ''),
      reviewer_id = auth.uid(),
      updated_at = now()
  FROM public.tasks t
  WHERE a.id = p_approval_id
    AND a.task_id = t.id
    AND a.client_id = portal_client_id
    AND a.reviewer_type = 'client'
    AND a.status = 'pending'
  RETURNING t.title INTO approval_name;

  IF approval_name IS NULL THEN
    RAISE EXCEPTION 'Pending approval not found';
  END IF;

  SELECT display_name INTO actor_name
  FROM public.profiles
  WHERE user_id = auth.uid();

  INSERT INTO public.audit_logs (
    actor_id, actor_name, action, resource_type, resource_id,
    resource_name, new_value
  ) VALUES (
    auth.uid(), COALESCE(actor_name, 'Cliente'), 'client_approval',
    'approval', p_approval_id::text, approval_name,
    jsonb_build_object('status', p_status, 'feedback', NULLIF(trim(p_feedback), ''))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_client_approval_decision(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_client_approval_decision(uuid, text, text) TO authenticated;

COMMIT;
