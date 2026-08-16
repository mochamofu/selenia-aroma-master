"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AromaImage } from "@/components/AromaImage";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Icon } from "@/components/Icon";
import { IngredientList } from "@/components/IngredientList";
import { ReorderButton } from "@/components/ReorderButton";
import { ErrorState, LoadingState } from "@/components/States";
import { demoBaseBlends } from "@/data/mockData";
import { useAromaRecord } from "@/hooks/useAromaRecords";
import { useAuth } from "@/hooks/useAuth";

export default function AromaDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth("customer");
  const { record, loading, error } = useAromaRecord(params.id, session?.userId);
  const baseBlend = demoBaseBlends.find((blend) => blend.id === record?.base_blend_id);

  return (
    <AppShell>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : record ? (
        <div className="space-y-5">
          <section className="relative">
            <AromaImage title={record.title} className="h-80 rounded-b-[36px]" />
            <button onClick={() => router.back()} className="absolute left-5 top-6 grid h-11 w-11 place-items-center rounded-full bg-white/86 shadow-md" aria-label="戻る"><Icon name="ArrowLeft" className="h-5 w-5" /></button>
            <FavoriteButton userId={session?.userId} aromaRecordId={record.id} initial={record.favorite} className="absolute right-5 top-6" />
          </section>
          <div className="space-y-5 px-5 pb-6">
            <section>
              <h1 className="text-3xl font-bold text-stone-900">{record.title}</h1>
              <p className="mt-2 text-base leading-7 text-stone-600">{record.subtitle}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-[#efe8fb] px-3 py-1.5 text-[#755aa8]">{record.made_at}</span>
                <span className="rounded-full bg-[#eef4e9] px-3 py-1.5 text-[#5e7d56]">{record.mood}</span>
                <span className="rounded-full bg-[#f4ead3] px-3 py-1.5 text-[#9f7a2f]">{record.purpose}</span>
              </div>
            </section>
            <Info title="テーマ" body={record.concept} />
            <section className="rounded-[28px] bg-white p-5 shadow-lg shadow-stone-300/20">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">ベースブレンド</h2>
                  <p className="mt-1 text-sm font-bold text-[#755aa8]">{record.base_blend_name}</p>
                </div>
                {record.blend_lot_number ? <span className="rounded-full bg-[#f4ead3] px-3 py-1 text-[11px] font-bold text-[#9f7a2f]">{record.blend_lot_number}</span> : null}
              </div>
              <div className="mt-4 rounded-2xl bg-[#faf7f1] p-4">
                <p className="text-xs leading-5 text-stone-500">配合比率や分量は非公開です。含まれる精油の種類のみ表示しています。</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {baseBlend?.public_ingredients.map((name) => (
                    <span key={name} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-stone-700 shadow-sm">{name}</span>
                  ))}
                </div>
              </div>
              {record.brainwave_profile_id ? (
                <div className="mt-3 rounded-2xl border border-[#e8dcc7] px-4 py-3">
                  <p className="text-xs font-bold text-stone-500">脳波データ連携ID</p>
                  <p className="mt-1 text-sm font-bold text-stone-800">{record.brainwave_profile_id}</p>
                </div>
              ) : null}
            </section>
            <section className="rounded-[28px] bg-white p-5 shadow-lg shadow-stone-300/20">
              <h2 className="mb-4 text-lg font-bold text-stone-900">追加したオイル</h2>
              <IngredientList ingredients={record.ingredients} />
            </section>
            <Info title="ブレンドメモ" body={record.blend_notes} />
            <Info title="使用方法" body={record.usage_notes} />
            <Info title="注意事項" body={record.caution_notes} />
            <ReorderButton aromaId={record.id} available={Boolean(record.reorder_url)} />
          </div>
        </div>
      ) : (
        <div className="p-5"><ErrorState message="記録が見つかりません" /><Link className="mt-4 inline-block font-bold text-[#755aa8]" href="/aromas">一覧に戻る</Link></div>
      )}
    </AppShell>
  );
}

function Info({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-lg shadow-stone-300/20">
      <h2 className="text-lg font-bold text-stone-900">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-stone-600">{hideCustomerAmounts(body)}</p>
    </section>
  );
}

function hideCustomerAmounts(value: string) {
  return value
    .replace(/\s*\d+(?:\.\d+)?\s*ml/gi, "")
    .replace(/\s*\d+(?:\.\d+)?\s*滴/g, "")
    .replace(/\s*\d+(?:\.\d+)?\s*%/g, "");
}
