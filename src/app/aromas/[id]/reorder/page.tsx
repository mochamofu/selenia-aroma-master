"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AromaImage } from "@/components/AromaImage";
import { Icon } from "@/components/Icon";
import { ErrorState, LoadingState } from "@/components/States";
import { useAromaRecord } from "@/hooks/useAromaRecords";
import { useAuth } from "@/hooks/useAuth";

export default function ReorderPage() {
  const params = useParams<{ id: string }>();
  const { session } = useAuth("customer");
  const { record, loading, error } = useAromaRecord(params.id, session?.userId);

  return (
    <AppShell>
      <div className="grid min-h-screen place-items-center px-5 py-8">
        {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : record ? (
          <section className="w-full rounded-[34px] bg-white p-6 text-center shadow-2xl shadow-stone-300/40">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#eef4e9] text-[#5e7d56]"><Icon name="Check" className="h-8 w-8" /></div>
            <h1 className="mt-5 text-2xl font-bold text-stone-900">ご案内ページへ移動します</h1>
            <p className="mt-2 text-sm leading-6 text-stone-500">外部ECサイトで再購入できます</p>
            <div className="mt-6 flex items-center gap-4 rounded-[26px] bg-[#faf7f1] p-3 text-left">
              <AromaImage title={record.title} className="h-24 w-24 shrink-0 rounded-[22px]" />
              <div>
                <h2 className="font-bold text-stone-900">{record.title}</h2>
                <p className="mt-2 text-base font-bold text-[#9f7a2f]">{record.price ? `${record.price.toLocaleString()}円` : "価格未設定"}</p>
              </div>
            </div>
            {record.reorder_url ? (
              <a href={record.reorder_url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#755aa8] text-base font-bold text-white shadow-lg shadow-[#755aa8]/25 transition hover:brightness-105 active:scale-95">
                外部ショップで購入する
                <Icon name="ExternalLink" className="h-5 w-5" />
              </a>
            ) : <div className="mt-6 rounded-full bg-stone-200 px-5 py-4 text-sm font-bold text-stone-500">現在準備中です</div>}
            <p className="mt-4 text-xs text-stone-500">※外部サイトに移動します</p>
          </section>
        ) : <ErrorState message="記録が見つかりません" />}
      </div>
    </AppShell>
  );
}
