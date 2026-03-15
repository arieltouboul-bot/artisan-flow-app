-- ============================================================
-- Désactivation temporaire du RLS (Row Level Security) pour tester
-- si Supabase bloque les actions. À exécuter dans le SQL Editor Supabase.
-- ATTENTION : à utiliser uniquement en dev/test. Réactiver RLS ensuite.
-- ============================================================

ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Optionnel : réactiver plus tard avec :
-- ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
-- (et idem pour chaque table)
