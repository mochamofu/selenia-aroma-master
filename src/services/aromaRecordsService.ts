import { demoAromas } from "@/data/mockData";
import { supabase } from "@/lib/supabaseClient";
import type { AromaIngredient, AromaRecord } from "@/types/aroma";

export async function getAromaRecords(userId: string, isAdmin = false): Promise<AromaRecord[]> {
  if (!supabase) {
    return demoAromas.filter((record) => isAdmin || (record.user_id === userId && record.status === "published"));
  }

  let query = supabase.from("aroma_records").select("*, aroma_ingredients(*)").order("made_at", { ascending: false });
  if (!isAdmin) query = query.eq("user_id", userId).eq("status", "published");
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
    const { aroma_ingredients, ...record } = row;
    return {
      ...record,
      ingredients: (aroma_ingredients ?? []) as AromaIngredient[],
    } as AromaRecord;
  });
}

export async function getAromaRecordById(id: string, userId: string, isAdmin = false): Promise<AromaRecord | null> {
  const records = await getAromaRecords(userId, isAdmin);
  return records.find((record) => record.id === id) ?? null;
}

export async function createAromaRecord(record: Partial<AromaRecord>) {
  if (!supabase) {
    return { ...record, id: `demo-${Date.now()}` };
  }
  const { ingredients = [], ...payload } = record;
  const { data, error } = await supabase.from("aroma_records").insert(payload).select().single();
  if (error) throw error;
  if (ingredients.length) {
    const ingredientRows = ingredients.map((ingredient) => ({
      aroma_record_id: data.id,
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      sort_order: ingredient.sort_order,
    }));
    const { error: ingredientError } = await supabase.from("aroma_ingredients").insert(ingredientRows);
    if (ingredientError) throw ingredientError;
  }
  return data;
}
