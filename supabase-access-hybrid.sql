-- Gatekeeper profile fields
-- Master code is configured in app code: MASTER_CODE = 'PRO-BUILD-2026'

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz DEFAULT null;
