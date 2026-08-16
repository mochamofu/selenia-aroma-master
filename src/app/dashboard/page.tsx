"use client";

import { AppShell } from "@/components/AppShell";
import { AromaCard } from "@/components/AromaCard";
import { AromaHeroCard } from "@/components/AromaHeroCard";
import { Icon } from "@/components/Icon";
import { QuickActionCard } from "@/components/QuickActionCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useAromaRecords } from "@/hooks/useAromaRecords";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { session, profile, loading: authLoading } = useAuth("customer");
  const { records, loading, error } = useAromaRecords(session?.userId);
  const hero = records[0];

  return (
    <AppShell>
      <div className="space-y-7 px-5 py-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">こんにちは、{profile?.name ?? "お客様"}</h1>
            <p className="mt-1 text-sm text-stone-500">今日も心地よい香りに包まれましょう</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-md" aria-label="通知">
              <Icon name="Bell" className="h-5 w-5 text-stone-600" />
            </button>
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[#d7c58e] text-sm font-bold text-white">{profile?.name?.slice(0, 1) ?? "花"}</div>
          </div>
        </header>
        {authLoading || loading ? <LoadingState /> : error ? <ErrorState message={error} /> : hero ? <AromaHeroCard record={hero} /> : <EmptyState title="まだアロマ記録がありません" description="最初の香りを登録しましょう" />}
        <section>
          <h2 className="mb-3 text-lg font-bold text-stone-900">次にやること</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionCard label="最近の香りを見る" href="/aromas" icon="Layers" />
            <QuickActionCard label="再購入する" href={hero ? `/aromas/${hero.id}/reorder` : "/aromas"} icon="ExternalLink" />
            <QuickActionCard label="気分から探す" href="/moods" icon="Sparkles" />
            <QuickActionCard label="お気に入り" href="/aromas?tab=favorites" icon="Heart" />
            <QuickActionCard label="ベースブレンド" href="/base-blends" icon="FlaskConical" />
            <QuickActionCard label="精油図鑑を見る" href="/moods/focus" icon="Search" />
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold text-stone-900">最近のアロマ記録</h2>
          <div className="grid grid-cols-2 gap-3">
            {records.slice(0, 3).map((record) => <AromaCard key={record.id} record={record} userId={session?.userId} />)}
          </div>
        </section>
        <section className="rounded-[28px] bg-[#eef4e9] p-5">
          <h2 className="text-lg font-bold text-stone-900">今日のおすすめ</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">夜は Relax Night Blend、朝は Morning Refresh がよく選ばれています。</p>
        </section>
      </div>
    </AppShell>
  );
}
