import Link from "next/link";
import type { BaseBlend } from "@/types/aroma";
import { Icon } from "./Icon";

export function BaseBlendCard({ blend }: { blend: BaseBlend }) {
  return (
    <Link
      href={`/base-blends/${blend.id}`}
      className="block rounded-[26px] bg-white p-4 shadow-lg shadow-stone-300/20 transition hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-sm font-bold text-white shadow-inner" style={{ background: `linear-gradient(135deg, ${blend.color}, #d7c58e)` }}>
          {blend.code.replace("ブレンド", "")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-[#755aa8]">{blend.code}</p>
              <h2 className="mt-1 text-base font-bold text-stone-900">{blend.name}</h2>
            </div>
            <Icon name="ChevronRight" className="h-5 w-5 shrink-0 text-stone-400" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {blend.benefits.slice(0, 2).map((benefit) => (
              <span key={benefit} className="rounded-full bg-[#f4ead3] px-2.5 py-1 text-[11px] font-bold text-[#9f7a2f]">
                {benefit}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
