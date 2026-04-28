-- Bibliothèque architecturale « big data » : matériaux, composants, références normatives.
-- Import CSV massif (10k+ lignes) : Dashboard > Table Editor > Import, ou COPY depuis un bucket.
-- Index pour recherche / filtrage par l’API et futures embeddings.

CREATE TABLE IF NOT EXISTS public.architectural_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text,
  material_family text NOT NULL DEFAULT 'other'
    CHECK (material_family IN ('wood', 'concrete', 'metal', 'glass', 'ceramic', 'other')),
  unit text NOT NULL DEFAULT 'u',
  unit_price_ht numeric DEFAULT 0,
  norm_reference text,
  supplier_hint text,
  description text,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('french', coalesce(name, '') || ' ' || coalesce(ref_code, '') || ' ' || coalesce(category, '') || ' ' || coalesce(description, ''))
  ) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_architectural_library_category ON public.architectural_library(category);
CREATE INDEX IF NOT EXISTS idx_architectural_library_family ON public.architectural_library(material_family);
CREATE INDEX IF NOT EXISTS idx_architectural_library_search ON public.architectural_library USING gin(search_vector);

ALTER TABLE public.architectural_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read architectural_library" ON public.architectural_library;
CREATE POLICY "Authenticated read architectural_library"
  ON public.architectural_library FOR SELECT
  TO authenticated
  USING (true);

-- Extrait représentatif (remplacer / compléter par import massif)
INSERT INTO public.architectural_library (ref_code, name, category, material_family, unit, unit_price_ht, norm_reference, supplier_hint, description)
VALUES
  ('STR-BA-001', 'Béton C25/30 projeté', 'structure', 'concrete', 'm3', 185, 'NF EN 206', 'Point P', 'Ouvrage béton armé courant'),
  ('STR-BA-002', 'Béton prêt à l''emploi C30/37', 'structure', 'concrete', 'm3', 142, 'NF EN 206', 'Lafarge', 'Dalle / longrine'),
  ('STR-PAR-01', 'Parpaing creux 20 cm', 'structure', 'concrete', 'u', 2.15, 'DTU 20.1', 'Gedimat', 'Maçonnerie'),
  ('STR-ACI-01', 'IPN 160 acier S235', 'structure', 'metal', 'ml', 38, 'Eurocode 3', 'Métal service', 'Porteur métallique'),
  ('STR-ACI-02', 'Cornière L 70x70x7', 'structure', 'metal', 'ml', 12.5, 'EN 10025', 'Métal service', 'Raidisseur'),
  ('FIN-BOI-01', 'Parquet chêne massif 21 mm', 'revêtement', 'wood', 'm2', 118, 'DTU 53.2', 'Parquet Sol', 'Pièce à vivre'),
  ('FIN-BOI-02', 'OSB3 18 mm', 'structure', 'wood', 'm2', 22, 'NF EN 300', 'Leroy Merlin', 'Plancher / contreventement'),
  ('FIN-PLA-01', 'Plaque Placo BA13', 'cloison', 'other', 'm2', 6.8, 'DTU 25.1', 'Point P', 'Doublage'),
  ('FIN-PLA-02', 'Plaque Fermacell 12.5', 'cloison', 'other', 'm2', 9.2, 'DTU 25.1', 'Fermacell', 'Humidité modérée'),
  ('OUV-POR-01', 'Bloc-porte isolant 73', 'ouverture', 'wood', 'u', 189, 'DTU 36.1', 'Lapeyre', 'Espace privatif'),
  ('OUV-FEN-01', 'Fenêtre PVC 2 vantaux 120x140', 'ouverture', 'glass', 'u', 420, 'DTU 36.5', 'Tryba', 'Menuiserie extérieure'),
  ('OUV-BAI-01', 'Baie coulissante alu 3 rails', 'ouverture', 'metal', 'u', 890, 'DTU 36.5', 'K-Line', 'Salon'),
  ('ISO-LAI-01', 'Laine de roche 100 mm', 'isolation', 'other', 'm2', 14.5, 'DTU 45.1', 'Rockwool', 'Cloison / combles'),
  ('ISO-PU-01', 'Panneau PIR 80 mm', 'isolation', 'other', 'm2', 32, 'DTU 45.1', 'Unilin', 'Toiture plate'),
  ('CHA-CAR-01', 'Carrelage grès cérame 60x60', 'revêtement', 'ceramic', 'm2', 42, 'DTU 52.1', 'Saint-Gobain', 'Salle de bain'),
  ('CHA-JOI-01', 'Joint époxy', 'finition', 'other', 'u', 28, 'DTU 52.1', 'Mapei', 'Sanitaire'),
  ('ELE-CAB-01', 'Câble U-1000 R2V 3G2.5', 'cfe', 'metal', 'ml', 2.1, 'NF C 32-321', 'Rexel', 'Distribution'),
  ('ELE-INT-01', 'Interrupteur va-et-vient', 'cfe', 'other', 'u', 8.5, 'NF C 15-100', 'Legrand', 'Second œuvre'),
  ('CHA-PEI-01', 'Peinture acrylique mat blanc', 'finition', 'other', 'l', 12, 'DTU 59.1', 'Seigneurie', 'Murs'),
  ('CHA-PEI-02', 'Enduit façade organique', 'finition', 'other', 'm2', 28, 'DTU 59.1', 'Parex', 'Ravalement'),
  ('STR-ETA-01', 'Étai télescopique acier', 'chantier', 'metal', 'u', 3.5, 'ERP', 'Kiloutou', 'Soutènement provisoire'),
  ('STR-ETA-02', 'Bois d''étais 3 ml', 'chantier', 'wood', 'ml', 4.2, '—', 'Gedimat', 'Ouvrage temporaire'),
  ('ENV-GEO-01', 'Géotextile 300 g/m²', 'enveloppe', 'other', 'm2', 3.8, 'DTU 13.1', 'Axter', 'Protection'),
  ('ENV-EPD-01', 'Membrane EPDM 1.14 mm', 'enveloppe', 'other', 'm2', 22, 'DTU 43.1', 'Firestone', 'Toiture'),
  ('STR-BET-03', 'Béton architectonique apparent', 'structure', 'concrete', 'm2', 95, 'NF EN 206', 'Béton décor', 'Façade'),
  ('FIN-MET-01', 'Tôle perforée acier thermolaqué', 'revêtement', 'metal', 'm2', 78, '—', 'Métal déployé', 'Brise-soleil')
ON CONFLICT (ref_code) DO NOTHING;
