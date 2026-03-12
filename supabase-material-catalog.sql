-- Catalogue de prix matériaux (par utilisateur)
CREATE TABLE IF NOT EXISTS public.material_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'm2',
  price_per_unit numeric NOT NULL DEFAULT 0,
  category text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_catalog_user_id ON public.material_catalog(user_id);
CREATE INDEX IF NOT EXISTS idx_material_catalog_name ON public.material_catalog(lower(name));

ALTER TABLE public.material_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "material_catalog_select_own" ON public.material_catalog;
DROP POLICY IF EXISTS "material_catalog_insert_own" ON public.material_catalog;
DROP POLICY IF EXISTS "material_catalog_update_own" ON public.material_catalog;
DROP POLICY IF EXISTS "material_catalog_delete_own" ON public.material_catalog;

CREATE POLICY "material_catalog_select_own" ON public.material_catalog FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "material_catalog_insert_own" ON public.material_catalog FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "material_catalog_update_own" ON public.material_catalog FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "material_catalog_delete_own" ON public.material_catalog FOR DELETE USING (auth.uid() = user_id);

-- Exemples (à insérer après première connexion si besoin)
-- INSERT INTO material_catalog (user_id, name, unit, price_per_unit, category) VALUES
--   ('USER_UUID', 'marbre', 'm2', 120, 'revêtement'),
--   ('USER_UUID', 'carrelage', 'm2', 45, 'revêtement'),
--   ('USER_UUID', 'terrasse bois', 'm2', 80, 'terrasse');
