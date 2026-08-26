"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AromaImage } from "@/components/AromaImage";
import { useAromaRecords } from "@/hooks/useAromaRecords";
import { useViewerRole } from "@/hooks/useViewerRole";

export default function OperatorBlendRecordsPage() {
  useViewerRole();
  const { records, loading } = useAromaRecords(undefined, true);

  return (
    <AdminShell
      actions={
        <Link
          href="/operator/blend-records/new"
          className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[var(--admin-primary)] px-3 text-xs font-bold text-white transition hover:bg-[var(--admin-primary-strong)]"
        >
          <Plus className="h-4 w-4" />
          新規作成
        </Link>
      }
    >
      <div className="space-y-4 p-4 lg:p-6">
        <p className="text-xs text-[var(--admin-text-muted)]">
          作成した香りの記録です。ロット番号・ベースブレンド・制作日で確認できます。
        </p>

        {loading ? (
          <p className="rounded-xl border border-dashed border-[var(--admin-border)] p-10 text-center text-sm text-[var(--admin-text-muted)]">
            読み込んでいます…
          </p>
        ) : records.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--admin-border)] p-10 text-center text-sm text-[var(--admin-text-muted)]">
            まだ制作記録がありません。
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {records.map((record) => (
              <Link
                key={record.id}
                href={`/operator/blend-records/${record.id}/edit`}
                className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] transition hover:border-[var(--admin-primary)]"
              >
                <AromaImage title={record.title} className="aspect-[16/9]" />
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-bold leading-5">{record.title}</h2>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        record.status === "published"
                          ? "bg-[var(--admin-success-soft)] text-[var(--admin-success)]"
                          : "bg-[var(--admin-warning-soft)] text-[var(--admin-warning)]"
                      }`}
                    >
                      {record.status === "published" ? "公開" : "下書き"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    {record.made_at} / {record.base_blend_name ?? "ベース未設定"}
                  </p>
                  {record.blend_lot_number ? (
                    <p className="text-xs text-[var(--admin-text-muted)]">
                      ロット: {record.blend_lot_number}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
