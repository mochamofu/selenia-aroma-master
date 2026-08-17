"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { ErrorState } from "@/components/States";
import { essentialOils } from "@/data/essentialOils";
import { useAuth } from "@/hooks/useAuth";

export default function EssentialOilDetailPage() {
  useAuth("customer");
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const oil = essentialOils.find((item) => item.slug === params.slug);

  return (
    <AppShell>
      {!oil ? (
        <div className="p-5"><ErrorState message="精油データが見つかりません" /></div>
      ) : (
        <div className="space-y-5 px-5 py-6">
          <header className="flex items-center justify-between">
            <button onClick={() => router.back()} className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-md" aria-label="戻る">
              <Icon name="ArrowLeft" className="h-5 w-5" />
            </button>
            <Link href="/moods" className="text-sm font-bold text-[#755aa8]">気分から探す</Link>
          </header>

          <section className="overflow-hidden rounded-[34px] bg-white shadow-xl shadow-stone-300/25">
            <div className="h-48" style={{ background: `radial-gradient(circle at 30% 25%, #ffffff99, transparent 7rem), linear-gradient(135deg, ${oil.color}, #f8dfdc 52%, #dcebd8)` }} />
            <div className="p-5">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#efe8fb] px-3 py-1 text-xs font-bold text-[#755aa8]">{oil.scent_note}ノート</span>
                <span className="rounded-full bg-[#eef4e9] px-3 py-1 text-xs font-bold text-[#5e7d56]">{oil.family}</span>
              </div>
              <h1 className="mt-4 text-3xl font-bold text-stone-900">{oil.name}</h1>
              <p className="mt-1 text-sm italic text-stone-500">{oil.botanical_name}</p>
              <p className="mt-4 text-base leading-7 text-stone-700">{oil.overview}</p>
            </div>
          </section>

          <Info title="香りの印象" items={[oil.scent_profile]} />
          <Info title="よく使われるシーン" items={oil.common_uses} />
          <Info title="相性のいいアロマ" items={oil.blends_well_with} chip />
          <section className="rounded-[28px] bg-[#fff8ef] p-5 shadow-lg shadow-stone-300/20">
            <h2 className="text-lg font-bold text-stone-900">注意メモ</h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">{oil.safety_note}</p>
          </section>
          <p className="px-1 text-xs leading-5 text-stone-500">
            このページは香り選びの参考情報です。医療的な効能を保証するものではありません。
          </p>
        </div>
      )}
    </AppShell>
  );
}

function Info({ title, items, chip = false }: { title: string; items: string[]; chip?: boolean }) {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-lg shadow-stone-300/20">
      <h2 className="text-lg font-bold text-stone-900">{title}</h2>
      {chip ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => <span key={item} className="rounded-full bg-[#f4ead3] px-3 py-1.5 text-xs font-bold text-[#9f7a2f]">{item}</span>)}
        </div>
      ) : (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-600">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </section>
  );
}
