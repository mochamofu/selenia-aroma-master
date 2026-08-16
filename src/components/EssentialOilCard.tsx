import Link from "next/link";
import type { EssentialOil } from "@/types/aroma";
import { Icon } from "./Icon";

export function EssentialOilCard({ oil }: { oil: EssentialOil }) {
  return (
    <Link
      href={`/oils/${oil.slug}`}
      className="block rounded-[24px] bg-white p-4 shadow-md shadow-stone-300/20 transition hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 shrink-0 rounded-2xl shadow-inner" style={{ background: `linear-gradient(135deg, ${oil.color}, #fff7e8)` }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-bold text-stone-900">{oil.name}</h2>
            <Icon name="ChevronRight" className="h-5 w-5 shrink-0 text-stone-400" />
          </div>
          <p className="mt-1 text-xs italic text-stone-500">{oil.botanical_name}</p>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-600">{oil.scent_profile}</p>
        </div>
      </div>
    </Link>
  );
}
