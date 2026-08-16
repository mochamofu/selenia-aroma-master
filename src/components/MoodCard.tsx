import Link from "next/link";
import type { MoodCategory } from "@/types/aroma";
import { Icon } from "./Icon";

export function MoodCard({ mood }: { mood: MoodCategory }) {
  return (
    <Link href={`/moods/${mood.slug}`} className={`flex min-h-28 items-center justify-between rounded-[28px] bg-gradient-to-br ${mood.color} p-5 text-stone-900 shadow-lg shadow-stone-300/20 transition hover:-translate-y-0.5 active:scale-[0.98]`}>
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/70 text-[#6d5b84] shadow-sm">
          <Icon name={mood.icon} className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-base font-bold">{mood.name}</h2>
          <p className="mt-1 text-xs font-semibold text-stone-600">{mood.description}</p>
        </div>
      </div>
      <Icon name="ChevronRight" className="h-6 w-6" />
    </Link>
  );
}
