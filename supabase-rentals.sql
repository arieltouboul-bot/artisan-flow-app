-- Table locations (parc locatif)
CREATE TABLE IF NOT EXISTS rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  renter_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_per_day NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rentals_select_own" ON rentals;
DROP POLICY IF EXISTS "rentals_insert_own" ON rentals;
DROP POLICY IF EXISTS "rentals_update_own" ON rentals;
DROP POLICY IF EXISTS "rentals_delete_own" ON rentals;

CREATE POLICY "rentals_select_own" ON rentals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rentals_insert_own" ON rentals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rentals_update_own" ON rentals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rentals_delete_own" ON rentals
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_rentals_user_id ON rentals(user_id);
CREATE INDEX IF NOT EXISTS idx_rentals_project_id ON rentals(project_id);
CREATE INDEX IF NOT EXISTS idx_rentals_end_date ON rentals(end_date);
