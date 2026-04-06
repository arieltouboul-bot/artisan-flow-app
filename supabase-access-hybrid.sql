-- Hybrid access model: activation code OR 7-day trial

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;

CREATE TABLE IF NOT EXISTS public.activation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  is_used boolean NOT NULL DEFAULT false,
  used_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON public.activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_is_used ON public.activation_codes(is_used);

ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read available activation codes" ON public.activation_codes;
CREATE POLICY "Authenticated can read available activation codes"
  ON public.activation_codes FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND is_used = false
    AND (expires_at IS NULL OR expires_at > now())
  );

DROP POLICY IF EXISTS "Authenticated can consume one activation code" ON public.activation_codes;
CREATE POLICY "Authenticated can consume one activation code"
  ON public.activation_codes FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND is_used = false
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND is_used = true
    AND used_by_user_id = auth.uid()
  );
