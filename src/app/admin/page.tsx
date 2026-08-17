"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AromaImage } from "@/components/AromaImage";
import { Icon } from "@/components/Icon";
import { QuickActionCard } from "@/components/QuickActionCard";
import { LoadingState } from "@/components/States";
import { demoCustomers } from "@/data/mockData";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useAromaRecords } from "@/hooks/useAromaRecords";
import { useAuth } from "@/hooks/useAuth";

export default function AdminPage() {
  const { session } = useAuth("admin");
  const { records, loading } = useAromaRecords(session?.userId, true);
  const stats = useAdminStats(records);

  return (
    <AppShell variant="admin">
      <div className="space-y-6 px-5 py-6">
        <header className="flex items-center justify-between">
          <button className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-md" aria-label="メニュー"><Icon name="Menu" className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold text-stone-900">管理者ダッシュボード</h1>
          <button className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-md" aria-label="通知"><Icon name="Bell" className="h-5 w-5" /></button>
        </header>
        <div className="grid grid-cols-3 gap-3">
          <Kpi label="顧客数" value={stats.customers} />
          <Kpi label="記録数" value={stats.records} />
          <Kpi label="今月" value={stats.newThisMonth} />
        </div>
        <Link href="/admin/aromas/new" className="flex h-14 items-center justify-center gap-2 rounded-full bg-[#2f2a25] text-base font-bold text-white shadow-lg transition hover:brightness-110 active:scale-95">
          <Icon name="FlaskConical" className="h-5 w-5" />
          アロマ記録を新規作成
        </Link>
        <section>
          <h2 className="mb-3 text-lg font-bold text-stone-900">最近のアロマ記録</h2>
          {loading ? <LoadingState /> : (
            <div className="space-y-3">
              {records.slice(0, 4).map((record) => {
                const customer = demoCustomers.find((item) => item.user_id === record.user_id);
                return (
                  <Link href={`/admin/aromas/${record.id}/edit`} key={record.id} className="flex items-center gap-3 rounded-[24px] bg-white p-3 shadow-md shadow-stone-300/20">
                    <AromaImage title={record.title} className="h-16 w-16 rounded-2xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-stone-900">{record.title}</p>
                      <p className="mt-1 text-xs text-stone-500">{customer?.name ?? "顧客未設定"} / {record.made_at}</p>
                    </div>
                    <Icon name="ChevronRight" className="h-5 w-5 text-stone-400" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold text-stone-900">クイックメニュー</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionCard label="顧客一覧" href="/admin/customers" icon="Users" />
            <QuickActionCard label="アロマ記録一覧" href="/admin/aromas" icon="Layers" />
            <QuickActionCard label="新規作成" href="/admin/aromas/new" icon="FlaskConical" />
            <QuickActionCard label="脳波カルテ" href="/operator" icon="BarChart3" />
            <QuickActionCard label="設定" href="/admin#settings" icon="Settings" />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[24px] bg-white p-4 text-center shadow-md shadow-stone-300/20">
      <p className="text-2xl font-bold text-[#755aa8]">{value}</p>
      <p className="mt-1 text-xs font-bold text-stone-500">{label}</p>
    </div>
  );
}
