-- Payroll fields on employees
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS salary_type TEXT,
  ADD COLUMN IF NOT EXISTS salary_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS salary_currency TEXT;

-- Employee payments
CREATE TABLE IF NOT EXISTS employee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  project_id UUID NULL REFERENCES projects(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE employee_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_payments_select_own" ON employee_payments;
DROP POLICY IF EXISTS "employee_payments_insert_own" ON employee_payments;
DROP POLICY IF EXISTS "employee_payments_update_own" ON employee_payments;
DROP POLICY IF EXISTS "employee_payments_delete_own" ON employee_payments;

CREATE POLICY "employee_payments_select_own" ON employee_payments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "employee_payments_insert_own" ON employee_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "employee_payments_update_own" ON employee_payments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "employee_payments_delete_own" ON employee_payments
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_employee_payments_user_id ON employee_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_payments_employee_id ON employee_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_payments_project_id ON employee_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_employee_payments_date ON employee_payments(payment_date);
