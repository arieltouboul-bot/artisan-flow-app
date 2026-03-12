-- ============================================================
-- 1. Ajouter user_id aux tables clients et projects
-- ============================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Index pour les requêtes filtrées par user_id
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);

-- Remplir user_id pour les lignes existantes (optionnel : mettre un user_id par défaut ou laisser NULL et ne pas appliquer RLS sur les anciennes lignes)
-- UPDATE public.clients SET user_id = 'VOTRE_USER_ID' WHERE user_id IS NULL;
-- UPDATE public.projects SET user_id = 'VOTRE_USER_ID' WHERE user_id IS NULL;

-- ============================================================
-- 2. RLS (Row Level Security) - chaque artisan ne voit que ses données
-- ============================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques trop permissives si elles existent
DROP POLICY IF EXISTS "Allow all on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow all on projects" ON public.projects;
DROP POLICY IF EXISTS "Allow all on project_tasks" ON public.project_tasks;

-- CLIENTS : lecture/écriture uniquement pour son user_id
CREATE POLICY "Users can read own clients"
  ON public.clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
  ON public.clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON public.clients FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON public.clients FOR DELETE
  USING (auth.uid() = user_id);

-- PROJECTS : lecture/écriture uniquement pour son user_id
CREATE POLICY "Users can read own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- PROJECT_TASKS : accès via le projet (le projet appartient au user)
CREATE POLICY "Users can read own project tasks"
  ON public.project_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_tasks.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own project tasks"
  ON public.project_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_tasks.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own project tasks"
  ON public.project_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_tasks.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project tasks"
  ON public.project_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_tasks.project_id
      AND projects.user_id = auth.uid()
    )
  );
