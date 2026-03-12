/**
 * Point d'entrée client uniquement (pour éviter de charger next/headers en client).
 * Pour les Server Components / Route Handlers, importer depuis "@/lib/supabase/server".
 */
export { createClient } from "./supabase/client";
