"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AromaCard } from "@/components/AromaCard";
import { EssentialOilCard } from "@/components/EssentialOilCard";
import { EmptyState, LoadingState } from "@/components/States";
import { essentialOils } from "@/data/essentialOils";
import { demoMoods } from "@/data/mockData";
import { useAromaRecords } from "@/hooks/useAromaRecords";
import { useAuth } from "@/hooks/useAuth";

export default function MoodResultPage() {
  const params = useParams<{ mood: string }>();
  const { session } = useAuth("customer");
  const { records, loading } = useAromaRecords(session?.userId);
  const mood = demoMoods.find((item) => item.slug === params.mood);
  const results = records.filter((record) => `${record.mood}${record.purpose}${record.subtitle}`.includes(mood?.name.replace("したい", "") ?? ""));
  const oils = essentialOils.filter((oil) => oil.mood_slugs.includes(params.mood));

  return (
    <AppShell>
      <div className="space-y-5 px-5 py-6">
        <header>
          <h1 className="text-2xl font-bold text-stone-900">{mood?.name ?? "気分から探す"}</h1>
          <p className="mt-1 text-sm text-stone-500">{mood?.description ?? "該当する香りを表示します"}</p>
        </header>
        <section>
          <h2 className="mb-3 text-lg font-bold text-stone-900">おすすめの一般精油</h2>
          <div className="space-y-3">
            {oils.map((oil) => <EssentialOilCard key={oil.id} oil={oil} />)}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold text-stone-900">あなたの記録から</h2>
          {loading ? <LoadingState /> : results.length ? (
            <div className="grid grid-cols-2 gap-3">{results.map((record) => <AromaCard key={record.id} record={record} userId={session?.userId} />)}</div>
          ) : <EmptyState title="該当する記録がありません" description="別の気分・目的から探してみてください" />}
        </section>
      </div>
    </AppShell>
  );
}
