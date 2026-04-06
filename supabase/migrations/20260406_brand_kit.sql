-- ============================================================
-- Phase 7: Brand Kit
-- Stores the living brand brief for each client:
-- tone of voice, content pillars, CTAs, colors, no-gos,
-- social handles, visual references, strategic notes.
-- One row per client (UNIQUE constraint on client_id).
-- ============================================================

CREATE TABLE public.brand_kit (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          UUID        NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Voice & tone
  tone_of_voice      TEXT,

  -- Content strategy
  content_pillars    TEXT[]      NOT NULL DEFAULT '{}',

  -- CTAs
  preferred_ctas     TEXT[]      NOT NULL DEFAULT '{}',

  -- Visual identity
  brand_colors       TEXT[]      NOT NULL DEFAULT '{}',   -- hex strings e.g. '#FF0000'
  visual_references  TEXT,

  -- Guardrails
  no_gos             TEXT,

  -- Distribution
  social_handles     JSONB       NOT NULL DEFAULT '{}',  -- { instagram, tiktok, youtube, ... }

  -- Strategy
  strategic_notes    TEXT,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row-level security
ALTER TABLE public.brand_kit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view brand_kit"
  ON public.brand_kit FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert brand_kit"
  ON public.brand_kit FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update brand_kit"
  ON public.brand_kit FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Owners can delete brand_kit"
  ON public.brand_kit FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- Auto-update updated_at
CREATE TRIGGER update_brand_kit_updated_at
  BEFORE UPDATE ON public.brand_kit
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast client lookup
CREATE INDEX idx_brand_kit_client ON public.brand_kit(client_id);
