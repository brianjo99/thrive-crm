-- Migration: Add Websites Table for GoHighLevel Clone Website Builder
-- Applied: 2026-06-12

CREATE TABLE IF NOT EXISTS public.websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  template_type TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  published BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  leads_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;

-- Owners manage the builder. Published pages remain publicly readable.
DROP POLICY IF EXISTS "owner_all_websites" ON public.websites;
CREATE POLICY "owner_all_websites" ON public.websites
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role));

DROP POLICY IF EXISTS "public_read_published_websites" ON public.websites;
CREATE POLICY "public_read_published_websites" ON public.websites
  FOR SELECT TO anon, authenticated
  USING (published = true);

-- Trigger to automatically update updated_at column
DROP TRIGGER IF EXISTS update_websites_updated_at ON public.websites;
CREATE TRIGGER update_websites_updated_at 
  BEFORE UPDATE ON public.websites 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Public landing pages use narrow RPCs instead of broad anonymous UPDATE access.
CREATE OR REPLACE FUNCTION public.increment_website_views(website_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.websites
  SET views = COALESCE(views, 0) + 1
  WHERE id = website_id AND published = true;
$$;

CREATE OR REPLACE FUNCTION public.increment_website_leads(website_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.websites
  SET leads_count = COALESCE(leads_count, 0) + 1
  WHERE id = website_id AND published = true;
$$;

REVOKE ALL ON FUNCTION public.increment_website_views(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_website_leads(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_website_views(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_website_leads(uuid) TO anon, authenticated;
