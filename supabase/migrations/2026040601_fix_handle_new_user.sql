-- ============================================================
-- Fix: handle_new_user() and sync_profile_email() bug
-- Root cause: 20260405_settings_module.sql overwrote handle_new_user()
-- to insert into (id, display_name, email) but profiles.user_id is
-- NOT NULL — so every new auth signup errored with:
--   "null value in column user_id violates not-null constraint"
--
-- sync_profile_email() had the same bug: matched on profiles.id
-- instead of profiles.user_id.
--
-- The existing-data email backfill in the settings migration also used
-- the wrong join key (p.id = u.id instead of p.user_id = u.id).
-- ============================================================

-- ── 1. Fix handle_new_user() ─────────────────────────────────────────────────
--
-- Correct behaviour:
--   • Always insert profile with user_id = NEW.id (the auth user UUID)
--   • ON CONFLICT (user_id) → update email / display_name, never error
--   • First user ever → owner role
--   • Subsequent users → no auto-role (owner assigns via Settings → Team)
--     Using ON CONFLICT DO NOTHING to be safe if row already exists somehow
--   • status defaults to 'active' (column default handles it)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile row keyed on user_id, not on the random profiles.id
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''),
      split_part(NEW.email, '@', 1)
    ),
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email        = EXCLUDED.email,
        display_name = COALESCE(
                         NULLIF(trim(profiles.display_name), ''),
                         EXCLUDED.display_name
                       ),
        updated_at   = now();

  -- Role bootstrap:
  --   • No roles exist yet → this is the first user → grant owner
  --   • Roles exist → owner assigns roles manually; no auto-grant
  IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Make sure the trigger still exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 2. Fix sync_profile_email() ──────────────────────────────────────────────
--
-- Old version matched on profiles.id (a random UUID) instead of
-- profiles.user_id (the FK to auth.users.id). The WHERE clause never
-- matched any row, so email updates were silently ignored.

CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET    email      = NEW.email,
         updated_at = now()
  WHERE  user_id = NEW.id;  -- profiles.user_id = auth.users.id
  RETURN NEW;
END;
$$;

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email();


-- ── 3. Backfill existing profiles with correct email ─────────────────────────
--
-- The settings migration tried to backfill with:
--   UPDATE profiles p SET email = u.email FROM auth.users u WHERE p.id = u.id
-- That matched on profiles.id (random UUID) ≠ auth.users.id, so it was a no-op.
-- Correct join is on profiles.user_id = auth.users.id.

UPDATE public.profiles p
SET    email      = u.email,
       updated_at = now()
FROM   auth.users u
WHERE  p.user_id = u.id
  AND  (p.email IS NULL OR p.email <> u.email);


-- ── 4. Done ──────────────────────────────────────────────────────────────────
-- No data destruction. All changes are safe for existing rows:
--   • handle_new_user: ON CONFLICT (user_id) DO UPDATE → upsert, never error
--   • sync_profile_email: UPDATE with correct WHERE → now actually works
--   • Backfill: updates only rows where email is wrong or missing
--   • user_roles: ON CONFLICT DO NOTHING → no duplicates
