-- Exécuter dans Supabase (SQL Editor) pour créer les tables projects et project_tasks.
-- Les statistiques du dashboard (CA, marges, impayés) sont calculées à partir des projets.

-- Table projects (chantiers)
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'en_preparation' CHECK (status IN ('en_preparation', 'en_cours', 'urgent_retard', 'termine')),
  address text,
  start_date date,
  end_date date,
  notes text,
  contract_amount numeric DEFAULT 0,
  material_costs numeric DEFAULT 0,
  amount_collected numeric DEFAULT 0,
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

-- Politique RLS basique : lecture/écriture pour tous (à adapter selon votre auth)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on project_tasks" ON public.project_tasks FOR ALL USING (true) WITH CHECK (true);
