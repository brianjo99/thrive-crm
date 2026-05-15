-- Allow per-invoice company name override (defaults to org_settings.org_name in app)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS company_name TEXT;
