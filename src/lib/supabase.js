// src / lib / supabase.js;

import { createClient } from "@supabase/supabase-js";

// Récupération des variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
// Vérification de la présence des variables d'environnement requises
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase URL or Anon Key");
}

// Création et export du client Supabase (lecture seule, pas d'auth)
export const supabase = createClient(supabaseUrl, supabaseKey);
