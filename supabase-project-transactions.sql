-- Table des paiements par projet. Chaque enregistrement = un virement/encaissement.
-- amount_collected sur projects = somme des amount de project_transactions (mise à jour côté app ou trigger).

CREATE TABLE IF NOT EXISTS public.project_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL,
  payment_method text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_transactions_project_id ON public.project_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_transactions_payment_date ON public.project_transactions(payment_date);

ALTER TABLE public.project_transactions ENABLE ROW LEVEL SECURITY;

-- Lecture/écriture : uniquement pour les projets dont l'utilisateur est propriétaire
CREATE POLICY "project_transactions_select_via_project"
  ON public.project_transactions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );

CREATE POLICY "project_transactions_insert_via_project"
  ON public.project_transactions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );

CREATE POLICY "project_transactions_update_via_project"
  ON public.project_transactions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );

CREATE POLICY "project_transactions_delete_via_project"
  ON public.project_transactions FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );

-- Synchronise automatiquement projects.amount_collected après chaque mutation
CREATE OR REPLACE FUNCTION public.sync_project_amount_collected()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_project_id uuid;
BEGIN
  target_project_id := COALESCE(NEW.project_id, OLD.project_id);

  UPDATE public.projects p
  SET
    amount_collected = COALESCE((
      SELECT SUM(t.amount)::numeric
      FROM public.project_transactions t
      WHERE t.project_id = target_project_id
    ), 0),
    updated_at = now()
  WHERE p.id = target_project_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_project_amount_collected ON public.project_transactions;
CREATE TRIGGER trg_sync_project_amount_collected
AFTER INSERT OR UPDATE OR DELETE ON public.project_transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_project_amount_collected();
