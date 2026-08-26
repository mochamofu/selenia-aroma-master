"use client";

import { Lock } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useViewerRole } from "@/hooks/useViewerRole";

/**
 * 管理者だけに見せる画面の入口。
 *
 * これは表示の出し分けにすぎない。実データの取得可否は必ずサーバー側
 * （Supabase の RLS、`/api/...` の判定）で決めること。
 */
export function AdminOnly({ title, children }: { title: string; children: React.ReactNode }) {
  const { role, loading } = useViewerRole();

  if (loading) {
    return (
      <AdminShell title={title}>
        <p className="p-10 text-center text-sm text-[var(--admin-text-muted)]">確認しています…</p>
      </AdminShell>
    );
  }

  if (role !== "admin") {
    return (
      <AdminShell title={title}>
        <div className="p-4 lg:p-6">
          <div className="mx-auto max-w-md rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-10 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[var(--admin-primary-soft)] text-[var(--admin-primary-strong)]">
              <Lock className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-lg font-bold">管理者のみ</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--admin-text-muted)]">
              この画面は管理者のアカウントでのみ開けます。
            </p>
          </div>
        </div>
      </AdminShell>
    );
  }

  return <>{children}</>;
}
