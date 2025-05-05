// src/lib/supabase.ts
import { createClient, Session, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL or Anon Key is missing from environment variables.");
    throw new Error("Supabase configuration is missing.");
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
export type { Session };