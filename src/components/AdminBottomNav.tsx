import Link from "next/link";
import { adminTabs } from "@/lib/routes";
import { Icon } from "./Icon";

export function AdminBottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="nav-offset-bottom fixed inset-x-0 z-40 mx-auto w-[min(398px,calc(100%-24px))] rounded-[28px] border border-white/80 bg-[#2f2a25]/94 px-2 py-2 shadow-xl shadow-stone-500/25 backdrop-blur" aria-label="管理者ナビゲーション">
      <div className="grid grid-cols-4 gap-1">
        {adminTabs.map((item) => {
          const active = pathname === item.href || (item.href.includes("/aromas") && pathname.startsWith("/admin/aromas"));
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-label={item.label}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold transition active:scale-95 ${
                active ? "bg-[#d7c58e] text-[#2f2a25]" : "text-stone-100 hover:bg-white/10"
              }`}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
