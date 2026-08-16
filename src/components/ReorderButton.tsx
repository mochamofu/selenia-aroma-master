import Link from "next/link";
import { Icon } from "./Icon";

export function ReorderButton({ aromaId, available }: { aromaId: string; available: boolean }) {
  if (!available) {
    return (
      <div className="rounded-full bg-stone-200 px-5 py-4 text-center text-sm font-bold text-stone-500">
        再購入は現在準備中です
      </div>
    );
  }
  return (
    <Link href={`/aromas/${aromaId}/reorder`} className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#755aa8] px-6 text-base font-bold text-white shadow-lg shadow-[#755aa8]/25 transition hover:brightness-105 active:scale-95">
      再購入する
      <Icon name="ArrowRight" className="h-5 w-5" />
    </Link>
  );
}
