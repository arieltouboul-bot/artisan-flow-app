-- Migration stricte: couche `materials` unifiee pour l'Architecte IA.
-- Objectif:
-- 1) Stabiliser l'API qui lit `public.materials`
-- 2) Conserver `architectural_library` comme source "big data"
-- 3) Synchroniser automatiquement architectural_library -> materials
-- 4) Garder des policies RLS de lecture pour utilisateurs authentifies

BEGIN;

-- ---------------------------------------------------------
-- 0) Fonction utilitaire updated_at
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_row_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------
-- 1) Table `materials`
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code text UNIQUE,
  name text NOT NULL,
  category text,
  material_family text NOT NULL DEFAULT 'other'
    CHECK (material_family IN ('wood', 'concrete', 'metal', 'glass', 'ceramic', 'other')),
  unit text NOT NULL DEFAULT 'u',
  unit_price_ht numeric DEFAULT 0,
  norm_reference text,
  supplier_hint text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_family ON public.materials(material_family);
CREATE INDEX IF NOT EXISTS idx_materials_name ON public.materials(name);
CREATE INDEX IF NOT EXISTS idx_materials_ref_code ON public.materials(ref_code);

DROP TRIGGER IF EXISTS trg_materials_touch_updated_at ON public.materials;
CREATE TRIGGER trg_materials_touch_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_row_updated_at();

-- ---------------------------------------------------------
-- 2) RLS `materials` (lecture catalogue authentifiee)
-- ---------------------------------------------------------
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read materials" ON public.materials;
CREATE POLICY "Authenticated read materials"
  ON public.materials FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------
-- 3) Backfill initial depuis architectural_library
-- ---------------------------------------------------------
INSERT INTO public.materials (
  id,
  ref_code,
  name,
  category,
  material_family,
  unit,
  unit_price_ht,
  norm_reference,
  supplier_hint,
  description,
  created_at,
  updated_at
)
SELECT
  al.id,
  al.ref_code,
  al.name,
  al.category,
  al.material_family,
  al.unit,
  al.unit_price_ht,
  al.norm_reference,
  al.supplier_hint,
  al.description,
  COALESCE(al.created_at, now()),
  COALESCE(al.updated_at, now())
FROM public.architectural_library al
ON CONFLICT (id) DO UPDATE
SET
  ref_code = EXCLUDED.ref_code,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  material_family = EXCLUDED.material_family,
  unit = EXCLUDED.unit,
  unit_price_ht = EXCLUDED.unit_price_ht,
  norm_reference = EXCLUDED.norm_reference,
  supplier_hint = EXCLUDED.supplier_hint,
  description = EXCLUDED.description,
  updated_at = now();

-- ---------------------------------------------------------
-- 4) Sync temps reel architectural_library -> materials
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_architectural_library_to_materials()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.materials WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.materials (
    id,
    ref_code,
    name,
    category,
    material_family,
    unit,
    unit_price_ht,
    norm_reference,
    supplier_hint,
    description,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.ref_code,
    NEW.name,
    NEW.category,
    NEW.material_family,
    NEW.unit,
    NEW.unit_price_ht,
    NEW.norm_reference,
    NEW.supplier_hint,
    NEW.description,
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.updated_at, now())
  )
  ON CONFLICT (id) DO UPDATE
  SET
    ref_code = EXCLUDED.ref_code,
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    material_family = EXCLUDED.material_family,
    unit = EXCLUDED.unit,
    unit_price_ht = EXCLUDED.unit_price_ht,
    norm_reference = EXCLUDED.norm_reference,
    supplier_hint = EXCLUDED.supplier_hint,
    description = EXCLUDED.description,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_architectural_library_to_materials ON public.architectural_library;
CREATE TRIGGER trg_sync_architectural_library_to_materials
  AFTER INSERT OR UPDATE OR DELETE ON public.architectural_library
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_architectural_library_to_materials();

-- ---------------------------------------------------------
-- 5) Seed securite (Safe Room)
-- ---------------------------------------------------------
INSERT INTO public.materials (ref_code, name, category, material_family, unit, unit_price_ht, norm_reference, supplier_hint, description)
VALUES
  ('SEC-BET-001', 'Beton arme haute resistance C35/45', 'Securite', 'concrete', 'm3', 220, 'NF EN 206', 'Lafarge', 'Voiles renforces pour Safe Room'),
  ('SEC-DOR-001', 'Porte blindee anti-effraction RC4', 'Securite', 'metal', 'u', 1850, 'EN 1627 RC4', 'Fichet', 'Bloc-porte blinde 5 points'),
  ('SEC-STE-001', 'Treillis soude renforce ST25C', 'Securite', 'metal', 'm2', 14.5, 'NF A 35-080-2', 'Point P', 'Renfort armatures murs'),
  ('SEC-ISO-001', 'Panneau anti-feu haute densite', 'Securite', 'other', 'm2', 48, 'EN 13501-1', 'Rockwool', 'Isolation thermique et resistance feu')
ON CONFLICT (ref_code) DO NOTHING;

COMMIT;

-- Verification rapide:
-- SELECT count(*) AS total_materials FROM public.materials;
-- SELECT category, count(*) FROM public.materials GROUP BY category ORDER BY count(*) DESC;
