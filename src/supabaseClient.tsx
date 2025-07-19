// src/supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";


const supabaseUrl: string  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey: string  = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Creamos y exportamos un solo cliente global
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
