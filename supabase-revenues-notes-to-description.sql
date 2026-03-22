-- Migration pour bases existantes : notes → description, colonne currency.
-- Exécutez dans l’éditeur SQL Supabase si la table a encore l’ancienne structure.

ALTER TABLE public.revenues ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR';
ALTER TABLE public.revenues ADD COLUMN IF NOT EXISTS description text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'revenues' AND column_name = 'notes'
  ) THEN
    UPDATE public.revenues SET description = notes WHERE description IS NULL AND notes IS NOT NULL;
    ALTER TABLE public.revenues DROP COLUMN notes;
  END IF;
END $$;

-- Contrainte devise (optionnel, si pas déjà présente)
ALTER TABLE public.revenues DROP CONSTRAINT IF EXISTS revenues_currency_check;
ALTER TABLE public.revenues ADD CONSTRAINT revenues_currency_check
  CHECK (currency IN ('EUR', 'USD', 'ILS'));
