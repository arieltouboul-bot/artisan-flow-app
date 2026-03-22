-- Alignement revenues : colonne date (pas received_at), texte libre en notes.
-- Si vous aviez encore description au lieu de notes :
-- ALTER TABLE public.revenues RENAME COLUMN description TO notes;

ALTER TABLE public.revenues ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR';
ALTER TABLE public.revenues ADD COLUMN IF NOT EXISTS notes text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'revenues' AND column_name = 'description'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'revenues' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.revenues RENAME COLUMN description TO notes;
  END IF;
END $$;

ALTER TABLE public.revenues DROP CONSTRAINT IF EXISTS revenues_currency_check;
ALTER TABLE public.revenues ADD CONSTRAINT revenues_currency_check
  CHECK (currency IN ('EUR', 'USD', 'ILS'));
