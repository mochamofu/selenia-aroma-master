"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Plus, Search, X } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { calculateAge, operatorClients } from "@/data/operatorClients";

export default function OperatorCustomersPage() {
  const [query, setQuery] = useState("");
  const [onlyFlagged, setOnlyFlagged] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return operatorClients.filter((client) => {
      const matchesQuery =
        q === "" ||
        `${client.name} ${client.nameKana} ${client.clientNumber} ${client.occupation}`
          .toLowerCase()
          .includes(q);
      const matchesFlag = !onlyFlagged || client.safetyNotes.length > 0;
      return matchesQuery && matchesFlag;
    });
  }, [query, onlyFlagged]);

  return (
    <AdminShell
      actions={
        <button
          type="button"
          className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[var(--admin-primary)] px-3 text-xs font-bold text-white transition hover:bg-[var(--admin-primary-strong)]"
        >
          <Plus className="h-4 w-4" />
          新規登録
        </button>
      }
    >
      <div className="space-y-4 p-4 lg:p-6">
        <section className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 min-w-56 flex-1 items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3">
              <Search className="h-4 w-4 shrink-0 text-[var(--admin-text-muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="名前・カナ・利用者番号・職業で検索"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")} aria-label="検索条件を消す">
                  <X className="h-4 w-4 text-[var(--admin-text-muted)]" />
                </button>
              ) : null}
            </div>

            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3 text-xs font-bold">
              <input
                type="checkbox"
                checked={onlyFlagged}
                onChange={(event) => setOnlyFlagged(event.target.checked)}
                className="h-4 w-4 accent-[var(--admin-primary)]"
              />
              事前確認が必要な方のみ
            </label>
          </div>

          <p className="mt-3 text-xs text-[var(--admin-text-muted)]">
            全 {operatorClients.length} 名のうち {filtered.length} 名を表示中
          </p>
        </section>

        <section className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-primary-softer)] text-left">
                  <th scope="col" className="px-4 py-3 font-bold">利用者</th>
                  <th scope="col" className="px-4 py-3 font-bold">利用者番号</th>
                  <th scope="col" className="px-4 py-3 font-bold">属性</th>
                  <th scope="col" className="px-4 py-3 font-bold">好みの傾向</th>
                  <th scope="col" className="px-4 py-3 text-right font-bold">測定</th>
                  <th scope="col" className="px-4 py-3 text-right font-bold">制作</th>
                  <th scope="col" className="px-4 py-3 font-bold">最終来店</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => {
                  const age = calculateAge(client.birthday);
                  return (
                    <tr
                      key={client.id}
                      className="border-b border-[var(--admin-border)] transition last:border-b-0 hover:bg-[var(--admin-primary-softer)]"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/operator/karte?client=${client.id}`} className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--admin-primary-soft)] text-sm font-bold text-[var(--admin-primary-strong)]">
                            {client.name.slice(0, 1)}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 font-bold">
                              {client.name}
                              {client.safetyNotes.length > 0 ? (
                                <AlertTriangle
                                  className="h-3.5 w-3.5 text-[var(--admin-warning)]"
                                  aria-label="事前確認が必要"
                                />
                              ) : null}
                            </span>
                            <span className="block text-xs text-[var(--admin-text-muted)]">
                              {client.nameKana}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--admin-text-muted)]">{client.clientNumber}</td>
                      <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                        {client.gender} / {age !== null ? `${age}歳` : "-"} / {client.occupation}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex flex-wrap gap-1.5">
                          {client.preferenceTags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-[var(--admin-primary-soft)] px-2 py-0.5 text-xs font-bold text-[var(--admin-primary-strong)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold">{client.measurementCount}</td>
                      <td className="px-4 py-3 text-right font-bold">{client.blendCount}</td>
                      <td className="px-4 py-3 text-[var(--admin-text-muted)]">{client.lastVisitAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 ? (
            <p className="p-10 text-center text-sm text-[var(--admin-text-muted)]">
              条件に合う利用者がいません。
            </p>
          ) : null}
        </section>
      </div>
    </AdminShell>
  );
}
