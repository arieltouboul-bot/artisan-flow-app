-- Notes, galerie projet, et membres projet
-- Pour mettre à jour automatiquement updated_at sur project_notes (et project_tasks si colonne présente),
-- exécuter aussi : supabase-updated-at-triggers.sql

CREATE TABLE IF NOT EXISTS public.project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_project_notes_project_id ON public.project_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_images_project_id ON public.project_images(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_employee_id ON public.project_members(employee_id);

ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_notes_select_own" ON public.project_notes;
DROP POLICY IF EXISTS "project_notes_insert_own" ON public.project_notes;
DROP POLICY IF EXISTS "project_notes_update_own" ON public.project_notes;
DROP POLICY IF EXISTS "project_notes_delete_own" ON public.project_notes;
CREATE POLICY "project_notes_select_own" ON public.project_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "project_notes_insert_own" ON public.project_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "project_notes_update_own" ON public.project_notes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "project_notes_delete_own" ON public.project_notes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "project_images_select_own" ON public.project_images;
DROP POLICY IF EXISTS "project_images_insert_own" ON public.project_images;
DROP POLICY IF EXISTS "project_images_delete_own" ON public.project_images;
CREATE POLICY "project_images_select_own" ON public.project_images FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "project_images_insert_own" ON public.project_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "project_images_delete_own" ON public.project_images FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "project_members_select_own" ON public.project_members;
DROP POLICY IF EXISTS "project_members_insert_own" ON public.project_members;
DROP POLICY IF EXISTS "project_members_delete_own" ON public.project_members;
CREATE POLICY "project_members_select_own" ON public.project_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "project_members_insert_own" ON public.project_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "project_members_delete_own" ON public.project_members FOR DELETE USING (auth.uid() = user_id);
