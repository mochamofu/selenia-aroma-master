"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FormSection } from "@/components/FormSection";
import { Icon } from "@/components/Icon";
import { ImageUploader } from "@/components/ImageUploader";
import { demoBaseBlends, demoCustomers } from "@/data/mockData";
import { createAromaRecord } from "@/services/aromaRecordsService";
import { useAromaRecord } from "@/hooks/useAromaRecords";
import { useAuth } from "@/hooks/useAuth";
import type { AromaIngredient } from "@/types/aroma";

const inputClass = "h-12 w-full rounded-2xl border border-[#e4d8c7] bg-[#faf7f1] px-4 text-sm outline-none transition focus:border-[#9b82c8]";
const textareaClass = "min-h-28 w-full rounded-2xl border border-[#e4d8c7] bg-[#faf7f1] px-4 py-3 text-sm outline-none transition focus:border-[#9b82c8]";

export function AromaForm({ mode, aromaId }: { mode: "new" | "edit"; aromaId?: string }) {
  const router = useRouter();
  const { session } = useAuth("admin");
  const { record } = useAromaRecord(aromaId ?? "", session?.userId, true);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [ingredients, setIngredients] = useState<AromaIngredient[]>([
    { id: "new-1", aroma_record_id: "", name: "", amount: "", unit: "滴", sort_order: 1 },
  ]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "");
    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    await createAromaRecord({
      user_id: String(form.get("user_id")),
      title,
      subtitle: String(form.get("subtitle") ?? ""),
      concept: String(form.get("concept") ?? ""),
      mood: String(form.get("mood") ?? ""),
      purpose: String(form.get("purpose") ?? ""),
      made_at: String(form.get("made_at") ?? ""),
      blend_notes: String(form.get("blend_notes") ?? ""),
      usage_notes: String(form.get("usage_notes") ?? ""),
      caution_notes: String(form.get("caution_notes") ?? ""),
      reorder_url: String(form.get("reorder_url") ?? ""),
      status: String(form.get("status") ?? "draft") as "draft" | "published",
      base_blend_id: String(form.get("base_blend_id") ?? ""),
      base_blend_name: demoBaseBlends.find((blend) => blend.id === String(form.get("base_blend_id")))?.name ?? "",
      base_blend_volume_ml: Number(form.get("base_blend_volume_ml") ?? 0),
      blend_lot_number: String(form.get("blend_lot_number") ?? ""),
      brainwave_profile_id: String(form.get("brainwave_profile_id") ?? ""),
      ingredients: ingredients.filter((item) => item.name.trim()),
    });
    setToast(mode === "new" ? "保存しました" : "更新しました");
    setTimeout(() => router.push("/admin"), 700);
  }

  return (
    <AppShell variant="admin">
      <form onSubmit={onSubmit} className="space-y-5 px-5 py-6">
        <header className="flex items-center gap-3">
          <Link href="/admin" className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-md" aria-label="戻る"><Icon name="ArrowLeft" className="h-5 w-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{mode === "new" ? "新規アロマ記録作成" : "アロマ記録編集"}</h1>
            <p className="text-sm text-stone-500">セクションごとに入力してください</p>
          </div>
        </header>
        {toast ? <div className="rounded-2xl bg-[#eef4e9] p-3 text-sm font-bold text-[#5e7d56]">{toast}</div> : null}
        {error ? <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}
        <FormSection title="基本情報">
          <select name="user_id" defaultValue={record?.user_id ?? "user-yuka"} className={inputClass} aria-label="顧客選択">
            {demoCustomers.filter((profile) => profile.role === "customer").map((profile) => <option key={profile.user_id} value={profile.user_id}>{profile.name}</option>)}
          </select>
          <input name="title" defaultValue={record?.title} className={inputClass} placeholder="タイトル" />
          <input name="subtitle" defaultValue={record?.subtitle} className={inputClass} placeholder="サブコピー" />
          <input name="concept" defaultValue={record?.concept} className={inputClass} placeholder="テーマ" />
          <input name="blend_lot_number" defaultValue={record?.blend_lot_number ?? ""} className={inputClass} placeholder="投資番号・ロット番号 例: AR-2026-0508-YK01" />
          <div className="grid grid-cols-2 gap-3">
            <input name="mood" defaultValue={record?.mood} className={inputClass} placeholder="気分" />
            <input name="purpose" defaultValue={record?.purpose} className={inputClass} placeholder="目的" />
          </div>
          <input name="made_at" type="date" defaultValue={record?.made_at ?? "2026-05-13"} className={inputClass} />
        </FormSection>
        <FormSection title="ベースブレンド">
          <select name="base_blend_id" defaultValue={record?.base_blend_id ?? "base-01"} className={inputClass} aria-label="ベースブレンド選択">
            {demoBaseBlends.map((blend) => (
              <option key={blend.id} value={blend.id}>{blend.code} / {blend.name}</option>
            ))}
          </select>
          <input name="base_blend_volume_ml" type="number" step="0.1" defaultValue={record?.base_blend_volume_ml ?? 9} className={inputClass} placeholder="ベースブレンド使用量 ml" />
          <p className="rounded-2xl bg-[#fff8ef] p-3 text-xs leading-5 text-stone-500">顧客画面では配合比率を表示せず、含まれる精油の種類だけを表示します。</p>
          <input name="brainwave_profile_id" defaultValue={record?.brainwave_profile_id ?? ""} className={inputClass} placeholder="脳波データ連携ID 例: EEG-RELAX-0508" />
        </FormSection>
        <FormSection title="商品画像">
          <ImageUploader />
        </FormSection>
        <FormSection title="追加するアロマオイル">
          {ingredients.map((ingredient, index) => (
            <div key={ingredient.id} className="grid grid-cols-[1fr_72px_70px_40px] gap-2">
              <input className={inputClass} placeholder="精油名" value={ingredient.name} onChange={(e) => setIngredients((items) => items.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} />
              <input className={inputClass} placeholder="数量" value={ingredient.amount} onChange={(e) => setIngredients((items) => items.map((item, i) => i === index ? { ...item, amount: e.target.value } : item))} />
              <select className={inputClass} value={ingredient.unit} onChange={(e) => setIngredients((items) => items.map((item, i) => i === index ? { ...item, unit: e.target.value as AromaIngredient["unit"] } : item))}>
                <option>滴</option><option>ml</option><option>%</option>
              </select>
              <button type="button" aria-label="行削除" className="rounded-2xl bg-stone-100 font-bold" onClick={() => setIngredients((items) => items.filter((_, i) => i !== index))}>-</button>
            </div>
          ))}
          <button type="button" className="h-12 w-full rounded-full border border-[#d7c58e] text-sm font-bold text-[#9f7a2f]" onClick={() => setIngredients((items) => [...items, { id: `new-${Date.now()}`, aroma_record_id: "", name: "", amount: "", unit: "滴", sort_order: items.length + 1 }])}>行追加</button>
        </FormSection>
        <FormSection title="メモと導線">
          <textarea name="blend_notes" defaultValue={record?.blend_notes} className={textareaClass} placeholder="ブレンドメモ" />
          <textarea name="usage_notes" defaultValue={record?.usage_notes} className={textareaClass} placeholder="使用方法" />
          <textarea name="caution_notes" defaultValue={record?.caution_notes} className={textareaClass} placeholder="注意事項" />
          <input name="reorder_url" defaultValue={record?.reorder_url ?? ""} className={inputClass} placeholder="再購入URL" />
          <select name="status" defaultValue={record?.status ?? "draft"} className={inputClass} aria-label="公開状態">
            <option value="draft">下書き</option>
            <option value="published">公開</option>
          </select>
        </FormSection>
        <div className="grid grid-cols-2 gap-3">
          <button type="submit" name="status" value="draft" className="h-14 rounded-full bg-[#f4ead3] text-sm font-bold text-[#9f7a2f]">下書き保存</button>
          <button type="submit" className="h-14 rounded-full bg-[#2f2a25] text-sm font-bold text-white shadow-lg">保存</button>
        </div>
      </form>
    </AppShell>
  );
}
