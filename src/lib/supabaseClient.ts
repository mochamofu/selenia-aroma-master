"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isDemoModeEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true";

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseEnv
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : null;
