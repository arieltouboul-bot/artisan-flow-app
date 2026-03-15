-- ============================================================
-- RLS "Zero Défaillance" : ouverture des droits pour toutes les
-- tables utilisées par l'app (Factures, CRUD Projets/Clients/
-- Matériel/Fournisseurs/Équipe). À exécuter dans le SQL Editor
-- Supabase si la base bloque les opérations.
-- ============================================================

-- 1. PROFILES (paramètres utilisateur, logo, devise)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. CLIENTS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on clients" ON public.clients;
DROP POLICY IF EXISTS "Users can read own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;
CREATE POLICY "clients_select_own" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "clients_insert_own" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_update_own" ON public.clients FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "clients_delete_own" ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- 3. PROJECTS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on projects" ON public.projects;
DROP POLICY IF EXISTS "Users can read own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "projects_select_own" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_update_own" ON public.projects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- 4. PROJECT_TASKS
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on project_tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Users can read own project tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Users can insert own project tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Users can update own project tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Users can delete own project tasks" ON public.project_tasks;
CREATE POLICY "project_tasks_select" ON public.project_tasks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.user_id = auth.uid()));
CREATE POLICY "project_tasks_insert" ON public.project_tasks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "project_tasks_update" ON public.project_tasks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.user_id = auth.uid()));
CREATE POLICY "project_tasks_delete" ON public.project_tasks FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_tasks.project_id AND p.user_id = auth.uid()));

-- 5. EXPENSES (factures / dépenses)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expenses_select_own" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_own" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_own" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_own" ON public.expenses;
CREATE POLICY "expenses_select_own" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expenses_insert_own" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_update_own" ON public.expenses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_delete_own" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

-- 6. INVENTORY (catalogue matériel) – nécessite table avec user_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory') THEN
    ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "inventory_select_own" ON public.inventory;
    DROP POLICY IF EXISTS "inventory_insert_own" ON public.inventory;
    DROP POLICY IF EXISTS "inventory_update_own" ON public.inventory;
    DROP POLICY IF EXISTS "inventory_delete_own" ON public.inventory;
    CREATE POLICY "inventory_select_own" ON public.inventory FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "inventory_insert_own" ON public.inventory FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "inventory_update_own" ON public.inventory FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "inventory_delete_own" ON public.inventory FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 7. SUPPLIERS (fournisseurs)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suppliers') THEN
    ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "suppliers_select_own" ON public.suppliers;
    DROP POLICY IF EXISTS "suppliers_insert_own" ON public.suppliers;
    DROP POLICY IF EXISTS "suppliers_update_own" ON public.suppliers;
    DROP POLICY IF EXISTS "suppliers_delete_own" ON public.suppliers;
    CREATE POLICY "suppliers_select_own" ON public.suppliers FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "suppliers_insert_own" ON public.suppliers FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "suppliers_update_own" ON public.suppliers FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "suppliers_delete_own" ON public.suppliers FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 8. EMPLOYEES (équipe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "employees_select_own" ON public.employees;
    DROP POLICY IF EXISTS "employees_insert_own" ON public.employees;
    DROP POLICY IF EXISTS "employees_update_own" ON public.employees;
    DROP POLICY IF EXISTS "employees_delete_own" ON public.employees;
    CREATE POLICY "employees_select_own" ON public.employees FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "employees_insert_own" ON public.employees FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "employees_update_own" ON public.employees FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "employees_delete_own" ON public.employees FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
