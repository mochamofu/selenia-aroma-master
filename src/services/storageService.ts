import { supabase } from "@/lib/supabaseClient";

export async function uploadProductImage(file: File, path: string) {
  if (!supabase) return URL.createObjectURL(file);
  const { error } = await supabase.storage.from("aroma-images").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("aroma-images").getPublicUrl(path);
  return data.publicUrl;
}
