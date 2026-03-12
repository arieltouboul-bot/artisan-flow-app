-- Exécuter dans Supabase (SQL Editor) pour ajouter les colonnes financières à la table clients
-- si elles n'existent pas encore.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS contract_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS material_costs numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_collected numeric DEFAULT 0;
