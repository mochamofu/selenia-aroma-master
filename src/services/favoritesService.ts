import { demoAromas } from "@/data/mockData";
import { supabase } from "@/lib/supabaseClient";

export async function isFavorite(userId: string, aromaRecordId: string) {
  if (!supabase) return Boolean(demoAromas.find((record) => record.id === aromaRecordId)?.favorite);
  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("aroma_record_id", aromaRecordId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function toggleFavorite(userId: string, aromaRecordId: string, next: boolean) {
  if (!supabase) return next;
  if (next) {
    const { error } = await supabase.from("favorites").insert({ user_id: userId, aroma_record_id: aromaRecordId });
    if (error) throw error;
    return true;
  }
  const { error } = await supabase.from("favorites").delete().eq("user_id", userId).eq("aroma_record_id", aromaRecordId);
  if (error) throw error;
  return false;
}
