"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AromaCard } from "@/components/AromaCard";
import { Icon } from "@/components/Icon";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useAromaRecords } from "@/hooks/useAromaRecords";
import { useAuth } from "@/hooks/useAuth";

const tabs = ["すべて", "お気に入り", "使用頻度順"];

export default function AromasPage() {
  const [tab, setTab] = useState("すべて");
  const { session } = useAuth("customer");
  const { records, loading, error } = useAromaRecords(session?.userId);
  const filtered = useMemo(() => {
    if (tab === "お気に入り") return records.filter((record) => record.favorite);
    if (tab === "使用頻度順") return records.slice().sort((a, b) => (b.usage_count ?? 0) - (a.usage_count ?? 0));
    return records;
  }, [records, tab]);

  return (
    <AppShell>
      <div className="space-y-5 px-5 py-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">私のアロマ記録</h1>
            <p className="mt-1 text-sm text-stone-500">あなたの香りの記録一覧です</p>
          </div>
          <div className="flex gap-2">
            <button className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-md" aria-label="検索"><Icon name="Search" className="h-5 w-5" /></button>
            <button className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-md" aria-label="フィルター"><Icon name="Filter" className="h-5 w-5" /></button>
          </div>
        </header>
        <div className="flex rounded-full bg-white p-1 shadow-sm">
          {tabs.map((item) => (
            <button key={item} onClick={() => setTab(item)} className={`h-10 flex-1 rounded-full text-xs font-bold transition ${tab === item ? "bg-[#755aa8] text-white" : "text-stone-500"}`}>
              {item}
            </button>
          ))}
        </div>
        {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : filtered.length ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((record) => <AromaCard key={record.id} record={record} userId={session?.userId} />)}
          </div>
        ) : <EmptyState title="まだアロマ記録がありません" description="最初の香りを登録しましょう" />}
      </div>
    </AppShell>
  );
}
