import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan variables de entorno: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son obligatorias. Revisa tu .env (ver .env.example)."
  );
}

/**
 * Cliente único de Supabase para el frontend. Usa exclusivamente la
 * clave pública anon — nunca service_role, que es exclusiva del backend
 * (ver README, contrato de seguridad PR-018/ADR-014).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
