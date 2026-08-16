import Link from "next/link";
import type { AromaRecord } from "@/types/aroma";
import { AromaImage } from "./AromaImage";
import { Icon } from "./Icon";

export function AromaHeroCard({ record }: { record: AromaRecord }) {
  return (
    <section className="rounded-[34px] bg-[#332d28] p-4 text-white shadow-xl shadow-stone-400/20">
      <AromaImage title={record.title} className="h-44 rounded-[28px]" />
      <div className="mt-4">
        <div className="flex gap-2">
          <span className="rounded-full bg-white/16 px-3 py-1 text-xs font-semibold">{record.mood}</span>
          <span className="rounded-full bg-white/16 px-3 py-1 text-xs font-semibold">{record.purpose}</span>
        </div>
        <h2 className="mt-3 text-2xl font-bold">{record.title}</h2>
        <p className="mt-1 text-sm leading-6 text-white/76">{record.subtitle}</p>
        <Link href={`/aromas/${record.id}`} className="mt-4 inline-flex h-12 items-center gap-2 rounded-full bg-[#d7c58e] px-5 text-sm font-bold text-[#2f2a25] transition hover:brightness-105 active:scale-95">
          詳細を見る
          <Icon name="ArrowRight" className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
