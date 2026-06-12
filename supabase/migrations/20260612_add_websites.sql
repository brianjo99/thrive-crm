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

-- Drop policy if exists and create
DROP POLICY IF EXISTS "owner_all_websites" ON public.websites;
CREATE POLICY "owner_all_websites" ON public.websites
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger to automatically update updated_at column
DROP TRIGGER IF EXISTS update_websites_updated_at ON public.websites;
CREATE TRIGGER update_websites_updated_at 
  BEFORE UPDATE ON public.websites 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();
