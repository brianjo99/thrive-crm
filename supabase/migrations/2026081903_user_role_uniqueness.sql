-- Thrive Hub assigns exactly one application role to each account.
-- This constraint also makes role upserts deterministic for account
-- administration and the invite-user Edge Function.

BEGIN;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

COMMIT;
