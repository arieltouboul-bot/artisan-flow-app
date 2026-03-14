-- Catalogue Matériaux (Gestion de Matériel) : articles avec prix HT, TVA par défaut, stock
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit_price_ht numeric NOT NULL DEFAULT 0,
  stock_quantity numeric NOT NULL DEFAULT 0,
  category text,
  default_tva_rate numeric NOT NULL DEFAULT 20,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON public.inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_name ON public.inventory(lower(name));

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_select_own" ON public.inventory;
DROP POLICY IF EXISTS "inventory_insert_own" ON public.inventory;
DROP POLICY IF EXISTS "inventory_update_own" ON public.inventory;
DROP POLICY IF EXISTS "inventory_delete_own" ON public.inventory;

CREATE POLICY "inventory_select_own" ON public.inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "inventory_insert_own" ON public.inventory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inventory_update_own" ON public.inventory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "inventory_delete_own" ON public.inventory FOR DELETE USING (auth.uid() = user_id);
