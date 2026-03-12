-- Table rendez-vous (liés à un projet optionnel, avec créneaux horaires en timestamptz)
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  type text NOT NULL DEFAULT 'chantier' CHECK (type IN ('devis', 'chantier', 'reunion')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_at ON public.appointments(start_at);
CREATE INDEX IF NOT EXISTS idx_appointments_project_id ON public.appointments(project_id);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_select_own" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_own" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_own" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_own" ON public.appointments;

CREATE POLICY "appointments_select_own" ON public.appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "appointments_insert_own" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "appointments_update_own" ON public.appointments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "appointments_delete_own" ON public.appointments FOR DELETE USING (auth.uid() = user_id);
