-- 1) Ajouter la colonne acompte_percentage à la table quotes
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS acompte_percentage numeric DEFAULT 30;

COMMENT ON COLUMN public.quotes.acompte_percentage IS 'Pourcentage d''acompte à la signature (ex: 30)';

-- 2) Créer la table expenses (dépenses / matériel par projet)
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  amount_ht numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 20,
  category text NOT NULL CHECK (category IN ('achat_materiel', 'location', 'main_oeuvre', 'sous_traitance')),
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON public.expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);

COMMENT ON TABLE public.expenses IS 'Dépenses par projet : matériel, location, main d''œuvre, sous-traitance';

-- RLS : chaque artisan ne voit que les dépenses de ses projets
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select_own" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_own" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_own" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_own" ON public.expenses;

CREATE POLICY "expenses_select_own" ON public.expenses
  FOR SELECT USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = expenses.project_id AND p.user_id = auth.uid())
  );

CREATE POLICY "expenses_insert_own" ON public.expenses
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );

CREATE POLICY "expenses_update_own" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_delete_own" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);
