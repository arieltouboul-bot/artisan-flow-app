-- Exécuter dans Supabase (SQL Editor) : bibliothèque matériaux + plans 2D (JSON) + notices DTU / pose.
-- Les plans sont stockés en JSON pour réédition ; les éléments référencent materials_library (material_id).

CREATE TABLE IF NOT EXISTS public.materials_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  unit text NOT NULL DEFAULT 'm',
  avg_price_ht numeric DEFAULT 0,
  dtu_reference text,
  installation_notice text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materials_library_user_id ON public.materials_library(user_id);

CREATE TABLE IF NOT EXISTS public.floor_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT 'Plan sans titre',
  plan_json jsonb NOT NULL DEFAULT '{"version":1,"elements":[],"meta":{"cmPerPixel":1}}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_floor_plans_user_id ON public.floor_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_floor_plans_project_id ON public.floor_plans(project_id);

ALTER TABLE public.materials_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own materials" ON public.materials_library;
DROP POLICY IF EXISTS "Users insert own materials" ON public.materials_library;
DROP POLICY IF EXISTS "Users update own materials" ON public.materials_library;
DROP POLICY IF EXISTS "Users delete own materials" ON public.materials_library;

CREATE POLICY "Users read own materials"
  ON public.materials_library FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users insert own materials"
  ON public.materials_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own materials"
  ON public.materials_library FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own materials"
  ON public.materials_library FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own floor_plans" ON public.floor_plans;
DROP POLICY IF EXISTS "Users insert own floor_plans" ON public.floor_plans;
DROP POLICY IF EXISTS "Users update own floor_plans" ON public.floor_plans;
DROP POLICY IF EXISTS "Users delete own floor_plans" ON public.floor_plans;

CREATE POLICY "Users read own floor_plans"
  ON public.floor_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own floor_plans"
  ON public.floor_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own floor_plans"
  ON public.floor_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own floor_plans"
  ON public.floor_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Exemples de matériaux « catalogue » (user_id NULL = lecture pour tous les utilisateurs connectés)
INSERT INTO public.materials_library (user_id, name, category, unit, avg_price_ht, dtu_reference, installation_notice)
SELECT NULL, 'Placo BA13', 'cloison', 'm2', 12.5, 'DTU 25.1', 'Stocker les plaques à plat ; viser sur ossature métallique selon DTU 25.1. Joints traités avant revêtement.'
WHERE NOT EXISTS (SELECT 1 FROM public.materials_library m WHERE m.user_id IS NULL AND m.name = 'Placo BA13');
INSERT INTO public.materials_library (user_id, name, category, unit, avg_price_ht, dtu_reference, installation_notice)
SELECT NULL, 'Parpaing creux', 'murs', 'u', 2.8, 'DTU 20.1', 'Appareillage et chaînage selon DTU 20.1 ; vérifier portances et linteaux.'
WHERE NOT EXISTS (SELECT 1 FROM public.materials_library m WHERE m.user_id IS NULL AND m.name = 'Parpaing creux');
INSERT INTO public.materials_library (user_id, name, category, unit, avg_price_ht, dtu_reference, installation_notice)
SELECT NULL, 'Parquet contrecollé', 'revêtement', 'm2', 45, 'DTU 53.2', 'Laisser acclimater 48h minimum ; pose flottante ou collée selon fabricant et DTU 53.2.'
WHERE NOT EXISTS (SELECT 1 FROM public.materials_library m WHERE m.user_id IS NULL AND m.name = 'Parquet contrecollé');
