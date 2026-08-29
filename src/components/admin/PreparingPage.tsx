"use client";

import Link from "next/link";
import { Construction } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * 未実装画面。
 *
 * ダミーの数字やそれらしい表を並べると「動いている」と誤解され、
 * 実データが入る段になって作り直しになる。ここでは何が未完成で
 * 次に何を作るのかだけを明示する。
 */
export function PreparingPage({
  title,
  summary,
  plannedFeatures,
  dependsOn,
}: {
  title: string;
  summary: string;
  plannedFeatures: string[];
  dependsOn?: string[];
}) {
  return (
    <AdminShell title={title}>
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <section className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--admin-warning-soft)] text-[var(--admin-warning)]">
              <Construction className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-lg font-bold">{title}はまだ作っていません</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--admin-text-muted)]">{summary}</p>

            <h3 className="mt-6 text-xs font-bold text-[var(--admin-text-muted)]">実装予定の内容</h3>
            <ul className="mt-2 space-y-2">
              {plannedFeatures.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm leading-6">
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--admin-primary)]"
                    aria-hidden
                  />
                  {feature}
                </li>
              ))}
            </ul>

            {dependsOn?.length ? (
              <>
                <h3 className="mt-6 text-xs font-bold text-[var(--admin-text-muted)]">先に必要なもの</h3>
                <ul className="mt-2 space-y-2">
                  {dependsOn.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-6 text-[var(--admin-text-muted)]">
                      <span
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--admin-warning)]"
                        aria-hidden
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          <p className="text-sm text-[var(--admin-text-muted)]">
            いま使えるのは{" "}
            <Link href="/operator/karte" className="font-bold text-[var(--admin-primary-strong)] underline">
              利用者カルテ
            </Link>
            ・
            <Link href="/operator/customers" className="font-bold text-[var(--admin-primary-strong)] underline">
              利用者一覧
            </Link>
            ・
            <Link href="/operator/base-blends" className="font-bold text-[var(--admin-primary-strong)] underline">
              ベースブレンド一覧
            </Link>
            ・
            <Link href="/operator/oils" className="font-bold text-[var(--admin-primary-strong)] underline">
              エッセンシャルオイル一覧
            </Link>
            です。
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
