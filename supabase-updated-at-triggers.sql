-- Maintient updated_at à chaque UPDATE (évite les erreurs client / colonnes manquantes)
-- À exécuter dans le SQL Editor Supabase après les tables project_notes et project_tasks.

CREATE OR REPLACE FUNCTION public.touch_row_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_notes_touch_updated_at ON public.project_notes;
CREATE TRIGGER trg_project_notes_touch_updated_at
  BEFORE UPDATE ON public.project_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_row_updated_at();

DROP TRIGGER IF EXISTS trg_project_tasks_touch_updated_at ON public.project_tasks;
CREATE TRIGGER trg_project_tasks_touch_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_row_updated_at();
