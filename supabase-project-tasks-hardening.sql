-- Hardening for existing project_tasks table

ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS title text;

ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false;

ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.project_tasks
SET
  title = COALESCE(title, label),
  is_completed = COALESCE(is_completed, completed)
WHERE TRUE;

-- Backfill user_id from owning project when possible
UPDATE public.project_tasks t
SET user_id = p.user_id
FROM public.projects p
WHERE t.project_id = p.id
  AND t.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_tasks_user_id ON public.project_tasks(user_id);
