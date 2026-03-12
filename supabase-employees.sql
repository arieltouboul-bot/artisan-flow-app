-- Table employés (liée à l'utilisateur connecté)
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table liaison projet <-> employé
CREATE TABLE IF NOT EXISTS project_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, employee_id)
);

-- RLS employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_select_own" ON employees;
DROP POLICY IF EXISTS "employees_insert_own" ON employees;
DROP POLICY IF EXISTS "employees_update_own" ON employees;
DROP POLICY IF EXISTS "employees_delete_own" ON employees;
CREATE POLICY "employees_select_own" ON employees FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "employees_insert_own" ON employees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "employees_update_own" ON employees FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "employees_delete_own" ON employees FOR DELETE USING (auth.uid() = user_id);

-- RLS project_employees (lecture/écriture si on a accès au projet et à l'employé)
ALTER TABLE project_employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_employees_select" ON project_employees;
DROP POLICY IF EXISTS "project_employees_insert" ON project_employees;
DROP POLICY IF EXISTS "project_employees_delete" ON project_employees;
CREATE POLICY "project_employees_select" ON project_employees FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_employees.project_id AND p.user_id = auth.uid())
  );
CREATE POLICY "project_employees_insert" ON project_employees FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
  );
CREATE POLICY "project_employees_delete" ON project_employees FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_employees.project_id AND p.user_id = auth.uid())
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_project_employees_project_id ON project_employees(project_id);
CREATE INDEX IF NOT EXISTS idx_project_employees_employee_id ON project_employees(employee_id);
