-- Exécuter dans Supabase (SQL Editor) pour créer les tables projects et project_tasks.
-- Les statistiques du dashboard (CA, marges, impayés) sont calculées à partir des projets.

-- Table projects (chantiers)
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'en_preparation' CHECK (status IN ('en_preparation', 'en_cours', 'urgent_retard', 'termine', 'annule')),
  address text,
  start_date date,
  end_date date,
  notes text,
  contract_amount numeric DEFAULT 0,
  material_costs numeric DEFAULT 0,
  amount_collected numeric DEFAULT 0,
  vat_rate numeric DEFAULT 20 CHECK (vat_rate >= 0 AND vat_rate <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour filtrer par client et par date
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- Table project_tasks (tâches / to-do par projet)
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label text NOT NULL,
  completed boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON public.project_tasks(project_id);

-- Activer Realtime (Dashboard > Database > Replication) sur public.projects et public.project_tasks si besoin.

-- Politiques RLS strictes : propriétaire uniquement
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on projects" ON public.projects;
DROP POLICY IF EXISTS "Allow all on project_tasks" ON public.project_tasks;

CREATE POLICY "projects_select_own" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_update_own" ON public.projects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "project_tasks_select_own" ON public.project_tasks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.user_id = auth.uid()));
CREATE POLICY "project_tasks_insert_own" ON public.project_tasks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "project_tasks_update_own" ON public.project_tasks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.user_id = auth.uid()));
CREATE POLICY "project_tasks_delete_own" ON public.project_tasks FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.user_id = auth.uid()));
