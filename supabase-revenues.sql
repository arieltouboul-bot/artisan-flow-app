-- Table des encaissements (revenus) liés à un projet — alignée sur le code (public.revenues au pluriel).
-- Si la table existe déjà dans Supabase, vérifiez que les noms de colonnes correspondent.

CREATE TABLE IF NOT EXISTS public.revenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  date date NOT NULL DEFAULT (CURRENT_DATE),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'ILS')),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revenues_user_id ON public.revenues(user_id);
CREATE INDEX IF NOT EXISTS idx_revenues_project_id ON public.revenues(project_id);
CREATE INDEX IF NOT EXISTS idx_revenues_date ON public.revenues(date DESC);

ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "revenues_select_own" ON public.revenues;
DROP POLICY IF EXISTS "revenues_insert_own" ON public.revenues;
DROP POLICY IF EXISTS "revenues_update_own" ON public.revenues;
DROP POLICY IF EXISTS "revenues_delete_own" ON public.revenues;

CREATE POLICY "revenues_select_own" ON public.revenues FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "revenues_insert_own" ON public.revenues FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "revenues_update_own" ON public.revenues FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "revenues_delete_own" ON public.revenues FOR DELETE USING (auth.uid() = user_id);
