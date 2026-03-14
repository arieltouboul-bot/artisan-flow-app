-- Profil : langue et devise préférées (i18n + multi-devises)
-- Exécuter dans l'éditeur SQL Supabase pour ajouter les colonnes si elles n'existent pas.

-- Langue préférée de l'interface : 'fr' ou 'en'
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'fr';

-- Devise d'affichage : EUR, USD, GBP, ILS (conversion appliquée côté app)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'EUR';

-- Commentaire : Si vous aviez déjà une colonne "currency", vous pouvez migrer les données :
-- UPDATE public.profiles SET preferred_currency = currency WHERE currency IS NOT NULL AND (preferred_currency IS NULL OR preferred_currency = 'EUR');
