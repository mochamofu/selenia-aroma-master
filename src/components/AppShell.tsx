"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdminBottomNav } from "./AdminBottomNav";
import { BottomNav } from "./BottomNav";

export function AppShell({
  children,
  variant = "customer",
  withNav = true,
}: {
  children: ReactNode;
  variant?: "customer" | "admin";
  withNav?: boolean;
}) {
  const pathname = usePathname();
  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-hidden bg-[#FAF7F1] shadow-2xl shadow-stone-300/60">
      <main className={withNav ? "nav-safe-padding min-h-screen" : "min-h-screen"}>{children}</main>
      {withNav ? variant === "admin" ? <AdminBottomNav pathname={pathname} /> : <BottomNav pathname={pathname} /> : null}
    </div>
  );
}
