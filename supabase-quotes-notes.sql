-- Migration : ajouter la colonne "notes" à la table des devis (quotes).
-- Exécuter dans Supabase > SQL Editor si la table quotes existe déjà.
-- Si la table n'existe pas, voir le bloc "Création complète" en bas.

-- Option 1 : Table quotes déjà existante → ajouter la colonne notes
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.quotes.notes IS 'Notes ou observations affichées sur le devis / PDF';

-- Option 2 : Création complète de la table quotes (avec notes) si vous n'avez pas encore de table devis
-- Décommentez et exécutez si besoin.
/*
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  number text NOT NULL,
  notes text,
  items jsonb NOT NULL DEFAULT '[]',
  total_ht numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 20,
  status text NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'envoye', 'accepte', 'refuse')),
  valid_until date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON public.quotes(client_id);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes_select_own" ON public.quotes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "quotes_insert_own" ON public.quotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quotes_update_own" ON public.quotes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quotes_delete_own" ON public.quotes FOR DELETE USING (auth.uid() = user_id);
*/
