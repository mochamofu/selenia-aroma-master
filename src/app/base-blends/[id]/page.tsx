"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AromaCard } from "@/components/AromaCard";
import { Icon } from "@/components/Icon";
import { ErrorState, EmptyState } from "@/components/States";
import { demoBaseBlends } from "@/data/mockData";
import { useAromaRecords } from "@/hooks/useAromaRecords";
import { useAuth } from "@/hooks/useAuth";

export default function BaseBlendDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth("customer");
  const { records } = useAromaRecords(session?.userId);
  const blend = demoBaseBlends.find((item) => item.id === params.id);
  const relatedRecords = records.filter((record) => record.base_blend_id === params.id);

  return (
    <AppShell>
      {!blend ? (
        <div className="p-5"><ErrorState message="ベースブレンドが見つかりません" /></div>
      ) : (
        <div className="space-y-5 px-5 py-6">
          <header className="flex items-center justify-between">
            <button onClick={() => router.back()} className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-md" aria-label="戻る">
              <Icon name="ArrowLeft" className="h-5 w-5" />
            </button>
            <Link href="/base-blends" className="text-sm font-bold text-[#755aa8]">一覧</Link>
          </header>

          <section className="overflow-hidden rounded-[34px] bg-white shadow-xl shadow-stone-300/25">
            <div className="grid h-44 place-items-center text-white" style={{ background: `radial-gradient(circle at 28% 22%, #ffffff66, transparent 7rem), linear-gradient(135deg, ${blend.color}, #d7c58e)` }}>
              <div className="text-center">
                <p className="text-sm font-bold">{blend.code}</p>
                <h1 className="mt-2 text-3xl font-bold">{blend.name}</h1>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm leading-7 text-stone-600">{blend.description}</p>
              <p className="mt-3 rounded-2xl bg-[#fff8ef] p-3 text-xs leading-5 text-stone-500">配合比率は非公開です。公開画面では含まれる精油の種類のみ確認できます。</p>
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-lg shadow-stone-300/20">
            <h2 className="text-lg font-bold text-stone-900">含まれる精油</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {blend.public_ingredients.map((name) => (
                <span key={name} className="rounded-full bg-[#efe8fb] px-3 py-1.5 text-xs font-bold text-[#755aa8]">{name}</span>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-lg shadow-stone-300/20">
            <h2 className="text-lg font-bold text-stone-900">目的</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {blend.benefits.map((benefit) => (
                <span key={benefit} className="rounded-full bg-[#eef4e9] px-3 py-1.5 text-xs font-bold text-[#5e7d56]">{benefit}</span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-stone-900">このブレンドを使った記録</h2>
            {relatedRecords.length ? (
              <div className="grid grid-cols-2 gap-3">
                {relatedRecords.map((record) => <AromaCard key={record.id} record={record} userId={session?.userId} />)}
              </div>
            ) : (
              <EmptyState title="まだ関連記録がありません" description="このベースブレンドの制作記録が追加されるとここに表示されます" />
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
