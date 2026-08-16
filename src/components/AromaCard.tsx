import Link from "next/link";
import type { AromaRecord } from "@/types/aroma";
import { AromaImage } from "./AromaImage";
import { FavoriteButton } from "./FavoriteButton";
import { Icon } from "./Icon";

export function AromaCard({ record, userId }: { record: AromaRecord; userId?: string }) {
  return (
    <Link href={`/aromas/${record.id}`} className="group block rounded-[26px] bg-white p-3 shadow-lg shadow-stone-300/25 transition hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]">
      <div className="relative">
        <AromaImage title={record.title} className="aspect-[4/3] rounded-[22px]" />
        <FavoriteButton userId={userId} aromaRecordId={record.id} initial={record.favorite} className="absolute right-2 top-2" />
        {record.is_new ? <span className="absolute left-2 top-2 rounded-full bg-[#d6bd73] px-2.5 py-1 text-[10px] font-bold text-white">NEW</span> : null}
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-bold leading-5 text-stone-900">{record.title}</h3>
          <Icon name="MoreHorizontal" className="h-5 w-5 shrink-0 text-stone-400" />
        </div>
        <span className="inline-flex rounded-full bg-[#eef4e9] px-2.5 py-1 text-[11px] font-semibold text-[#5e7d56]">
          {record.mood}
        </span>
        <p className="text-xs text-stone-500">{record.made_at}</p>
      </div>
    </Link>
  );
}
