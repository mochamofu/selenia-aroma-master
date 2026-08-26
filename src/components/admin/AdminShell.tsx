"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  Bell,
  ChevronDown,
  ClipboardList,
  Droplet,
  FileText,
  FlaskConical,
  Layers,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  Settings,
  Users,
} from "lucide-react";
import { findActiveNavItem, visibleNavItems, type AdminNavItem } from "@/lib/adminNav";
import { DISCLOSURE_LABELS, disclosureLevelForRole } from "@/lib/disclosure";
import { useViewerRole } from "@/hooks/useViewerRole";

const NAV_ICONS: Record<string, typeof Activity> = {
  Activity,
  BookOpen,
  ClipboardList,
  Droplet,
  FileText,
  FlaskConical,
  Layers,
  LayoutDashboard,
  Settings,
  Users,
};

function NavIcon({ name, className }: { name: string; className?: string }) {
  const Component = NAV_ICONS[name] ?? ClipboardList;
  return <Component aria-hidden className={className ?? "h-4 w-4"} />;
}

function NavLink({ item, active, onNavigate }: { item: AdminNavItem; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
        active
          ? "bg-[var(--admin-primary)] font-bold text-white shadow-sm"
          : "font-semibold text-[var(--admin-text)] hover:bg-white"
      }`}
    >
      <NavIcon name={item.icon} className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.status === "preparing" ? (
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            active ? "bg-white/25 text-white" : "bg-[var(--admin-warning-soft)] text-[var(--admin-warning)]"
          }`}
        >
          準備中
        </span>
      ) : null}
    </Link>
  );
}

/**
 * 管理者・施術者向けアプリの外枠。
 *
 * 利用者向けアプリ (`AppShell`) はスマートフォン幅に固定しているが、
 * こちらは業務用なので画面幅いっぱいを使う。ナビは PC で常時表示、
 * iPad 縦・スマートフォンでは引き出し式にする。
 */
export function AdminShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { role } = useViewerRole();

  const navItems = visibleNavItems(role === "admin");
  const activeItem = findActiveNavItem(pathname);
  const heading = title ?? activeItem?.label ?? "利用者カルテ";
  const description = subtitle ?? activeItem?.description ?? "";
  const disclosureLabel = DISCLOSURE_LABELS[disclosureLevelForRole(role)];

  return (
    <div className="safe-x flex min-h-screen bg-[var(--admin-canvas)] text-[var(--admin-text)]">
      {/* PC 常時表示のサイドバー */}
      <aside
        className={`hidden shrink-0 border-r border-[var(--admin-border)] bg-[var(--admin-sidebar)] transition-[width] lg:flex lg:flex-col ${
          sidebarCollapsed ? "w-[76px]" : "w-[268px]"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-[var(--admin-border)] px-4 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--admin-primary)] text-white">
            <Droplet className="h-5 w-5" />
          </span>
          {!sidebarCollapsed ? (
            <span className="min-w-0">
              <span className="block text-sm font-bold tracking-[0.1em] text-[var(--admin-text)]">SELENIA</span>
              <span className="block text-xs text-[var(--admin-text-muted)]">Aroma Karte</span>
            </span>
          ) : null}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="管理メニュー">
          {navItems.map((item) => {
            const active = activeItem?.href === item.href;
            if (sidebarCollapsed) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={`grid h-11 place-items-center rounded-lg transition ${
                    active
                      ? "bg-[var(--admin-primary)] text-white"
                      : "text-[var(--admin-text)] hover:bg-white"
                  }`}
                >
                  <NavIcon name={item.icon} className="h-5 w-5" />
                </Link>
              );
            }
            return <NavLink key={item.href} item={item} active={active} />;
          })}
        </nav>

        <button
          type="button"
          onClick={() => setSidebarCollapsed((open) => !open)}
          className="flex items-center gap-2 border-t border-[var(--admin-border)] px-4 py-3 text-xs font-bold text-[var(--admin-text-muted)] transition hover:text-[var(--admin-text)]"
        >
          <PanelLeftClose className={`h-4 w-4 transition ${sidebarCollapsed ? "rotate-180" : ""}`} />
          {!sidebarCollapsed ? "メニューを閉じる" : null}
        </button>
      </aside>

      {/* iPad 縦・スマートフォン用の引き出しナビ */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="メニューを閉じる"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-[#2b2340]/45"
          />
          <div className="safe-top relative flex h-full w-[272px] flex-col bg-[var(--admin-sidebar)] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[var(--admin-border)] px-4 py-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--admin-primary)] text-white">
                <Droplet className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-bold tracking-[0.1em]">SELENIA</span>
                <span className="block text-xs text-[var(--admin-text-muted)]">Aroma Karte</span>
              </span>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="管理メニュー">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={activeItem?.href === item.href}
                  onNavigate={() => setDrawerOpen(false)}
                />
              ))}
            </nav>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top sticky top-0 z-30 border-b border-[var(--admin-border)] bg-[var(--admin-surface)]/95 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="メニューを開く"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--admin-border)] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-[var(--admin-text)]">{heading}</h1>
              {description ? (
                <p className="truncate text-xs text-[var(--admin-text-muted)]">{description}</p>
              ) : null}
            </div>

            {actions}

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label="通知"
                className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--admin-border)] text-[var(--admin-text-muted)]"
              >
                <Bell className="h-4 w-4" />
              </button>
              <div className="hidden items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3 py-2 sm:flex">
                <span className="text-right">
                  <span className="block text-xs font-bold leading-tight text-[var(--admin-text)]">
                    サロン ド セレニア
                  </span>
                  <span className="block text-[11px] leading-tight text-[var(--admin-text-muted)]">
                    {disclosureLabel}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 text-[var(--admin-text-muted)]" />
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
