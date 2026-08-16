import Link from "next/link";
import { Icon } from "./Icon";

export function QuickActionCard({ label, href, icon }: { label: string; href: string; icon: string }) {
  return (
    <Link href={href} className="flex min-h-24 flex-col justify-between rounded-[24px] bg-white p-4 text-stone-800 shadow-md shadow-stone-300/20 transition hover:-translate-y-0.5 active:scale-95">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#f2ecfb] text-[#755aa8]">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="text-sm font-bold">{label}</span>
    </Link>
  );
}
