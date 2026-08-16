import { demoCustomers } from "@/data/mockData";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/types/profile";

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return demoCustomers.find((profile) => profile.user_id === userId) ?? null;
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
  if (error) throw error;
  return data;
}

export async function getProfiles(): Promise<Profile[]> {
  if (!supabase) return demoCustomers;
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
