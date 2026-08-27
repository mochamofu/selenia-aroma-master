"use client";

import { useMemo, useState } from "react";
import { Droplet, Search, X } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { essentialOils } from "@/data/essentialOils";
import { SCENT_FAMILIES, scentFamilyOf } from "@/data/scentFamilies";
import { useViewerRole } from "@/hooks/useViewerRole";
import { canDisclose, disclosureLevelForRole } from "@/lib/disclosure";
import type { EssentialOil } from "@/types/aroma";

const NOTE_FILTERS = [
  { value: "all", label: "すべて" },
  { value: "トップ", label: "トップノート" },
  { value: "ミドル", label: "ミドルノート" },
  { value: "ベース", label: "ベースノート" },
] as const;

const MOOD_FILTERS = [
  { slug: "all", label: "すべて" },
  { slug: "relax", label: "リラックス" },
  { slug: "sleep", label: "睡眠" },
  { slug: "focus", label: "集中" },
  { slug: "energy", label: "元気" },
  { slug: "happy", label: "気分" },
  { slug: "refresh", label: "リフレッシュ" },
] as const;

function OilDetail({ oil, onClose }: { oil: EssentialOil; onClose: () => void }) {
  return (
    <aside className="flex h-full flex-col overflow-y-auto border-l border-[var(--admin-border)] bg-[var(--admin-surface)]">
      <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--admin-text-muted)]">{oil.family}</p>
          <h2 className="mt-1 text-xl font-bold text-[var(--admin-text)]">{oil.name}</h2>
          <p className="mt-0.5 text-xs italic text-[var(--admin-text-muted)]">{oil.botanical_name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="詳細を閉じる"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--admin-border)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-5 px-5 py-5">
        <div
          className="h-20 rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${scentFamilyOf(oil.slug).color}, #ffffff)`,
          }}
        />

        <section>
          <h3 className="text-xs font-bold text-[var(--admin-text-muted)]">香りの印象</h3>
          <p className="mt-1.5 text-sm leading-6">{oil.scent_profile}</p>
        </section>

        <section>
          <h3 className="text-xs font-bold text-[var(--admin-text-muted)]">説明</h3>
          <p className="mt-1.5 text-sm leading-6">{oil.overview}</p>
        </section>

        <section>
          <h3 className="text-xs font-bold text-[var(--admin-text-muted)]">使いどころ</h3>
          <ul className="mt-1.5 space-y-1.5">
            {oil.common_uses.map((use) => (
              <li key={use} className="flex gap-2 text-sm leading-6">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--admin-primary)]" aria-hidden />
                {use}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-xs font-bold text-[var(--admin-text-muted)]">相性のよい精油</h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {oil.blends_well_with.map((name) => (
              <span
                key={name}
                className="rounded-full bg-[var(--admin-primary-soft)] px-2.5 py-1 text-xs font-bold text-[var(--admin-primary-strong)]"
              >
                {name}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-[var(--admin-danger-soft)] p-3.5">
          <h3 className="text-xs font-bold text-[var(--admin-danger)]">安全上の注意</h3>
          <p className="mt-1.5 text-sm leading-6 text-[var(--admin-text)]">{oil.safety_note}</p>
        </section>
      </div>
    </aside>
  );
}

export default function OperatorOilsPage() {
  const { role } = useViewerRole();
  const level = disclosureLevelForRole(role);
  const showSafetyColumn = canDisclose(level, "instructor");

  const [query, setQuery] = useState("");
  const [note, setNote] = useState<string>("all");
  const [mood, setMood] = useState<string>("all");
  const [family, setFamily] = useState<string>("all");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return essentialOils.filter((oil) => {
      const matchesQuery =
        q === "" ||
        `${oil.name} ${oil.botanical_name} ${oil.family} ${oil.scent_profile}`.toLowerCase().includes(q);
      const matchesNote = note === "all" || oil.scent_note === note;
      const matchesMood = mood === "all" || oil.mood_slugs.includes(mood);
      const matchesFamily = family === "all" || scentFamilyOf(oil.slug).slug === family;
      return matchesQuery && matchesNote && matchesMood && matchesFamily;
    });
  }, [query, note, mood, family]);

  const selected = essentialOils.find((oil) => oil.slug === selectedSlug) ?? null;

  return (
    <AdminShell>
      <div className={`grid min-h-full ${selected ? "xl:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
        <div className="min-w-0 space-y-4 p-4 lg:p-6">
          <section className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-10 min-w-56 flex-1 items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3">
                <Search className="h-4 w-4 shrink-0 text-[var(--admin-text-muted)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="精油名・学名・科名・香りで検索"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
                {query ? (
                  <button type="button" onClick={() => setQuery("")} aria-label="検索条件を消す">
                    <X className="h-4 w-4 text-[var(--admin-text-muted)]" />
                  </button>
                ) : null}
              </div>

              <select
                value={note}
                onChange={(event) => setNote(event.target.value)}
                aria-label="ノートで絞り込む"
                className="h-10 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 text-sm outline-none"
              >
                {NOTE_FILTERS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={family}
                onChange={(event) => setFamily(event.target.value)}
                aria-label="香りの系統で絞り込む"
                className="h-10 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 text-sm outline-none"
              >
                <option value="all">系統: すべて</option>
                {SCENT_FAMILIES.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={mood}
                onChange={(event) => setMood(event.target.value)}
                aria-label="目的で絞り込む"
                className="h-10 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 text-sm outline-none"
              >
                {MOOD_FILTERS.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {SCENT_FAMILIES.map((item) => {
                const count = essentialOils.filter(
                  (oil) => scentFamilyOf(oil.slug).slug === item.slug,
                ).length;
                const active = family === item.slug;
                return (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => setFamily(active ? "all" : item.slug)}
                    title={item.description}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition ${
                      active
                        ? "border-transparent text-white"
                        : "border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:border-[var(--admin-primary)]"
                    }`}
                    style={active ? { background: item.color } : undefined}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: active ? "#ffffff" : item.color }}
                      aria-hidden
                    />
                    {item.label}
                    <span className="opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-[var(--admin-text-muted)]">
              全 {essentialOils.length} 種のうち {filtered.length} 種を表示中。
              行を選ぶと右側に詳細が出ます。系統のボタンで絞り込めます。
            </p>
          </section>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--admin-border)] p-10 text-center text-sm text-[var(--admin-text-muted)]">
              条件に合う精油がありません。
            </p>
          ) : (
            <section className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-primary-softer)] text-left">
                      <th scope="col" className="px-4 py-3 font-bold">精油名</th>
                      <th scope="col" className="px-4 py-3 font-bold">系統</th>
                      <th scope="col" className="px-4 py-3 font-bold">学名 / 科</th>
                      <th scope="col" className="px-4 py-3 font-bold">ノート</th>
                      <th scope="col" className="px-4 py-3 font-bold">香りの印象</th>
                      {showSafetyColumn ? (
                        <th scope="col" className="px-4 py-3 font-bold">安全上の注意</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((oil) => (
                      <tr
                        key={oil.slug}
                        onClick={() => setSelectedSlug(oil.slug)}
                        className={`cursor-pointer border-b border-[var(--admin-border)] transition last:border-b-0 hover:bg-[var(--admin-primary-softer)] ${
                          selectedSlug === oil.slug ? "bg-[var(--admin-primary-soft)]" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2.5">
                            {/* 左端の帯で香りの系統が分かるようにする */}
                            <span
                              className="h-7 w-1.5 shrink-0 rounded-full"
                              style={{ background: scentFamilyOf(oil.slug).color }}
                              aria-hidden
                            />
                            <span
                              className="h-7 w-7 shrink-0 rounded-lg"
                              style={{
                                background: `linear-gradient(135deg, ${scentFamilyOf(oil.slug).color}, #ffffff)`,
                              }}
                              aria-hidden
                            />
                            <span className="font-bold">{oil.name}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
                            style={{ background: scentFamilyOf(oil.slug).color }}
                          >
                            {scentFamilyOf(oil.slug).label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                          <span className="block italic">{oil.botanical_name}</span>
                          <span className="block text-xs">{oil.family}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[var(--admin-primary-soft)] px-2.5 py-1 text-xs font-bold text-[var(--admin-primary-strong)]">
                            {oil.scent_note}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-text-muted)]">{oil.scent_profile}</td>
                        {showSafetyColumn ? (
                          <td className="max-w-72 px-4 py-3 text-xs leading-5 text-[var(--admin-text-muted)]">
                            {oil.safety_note}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {!showSafetyColumn ? (
            <p className="flex items-start gap-2 rounded-xl bg-[var(--admin-warning-soft)] p-3.5 text-xs leading-5 text-[var(--admin-warning)]">
              <Droplet className="mt-0.5 h-4 w-4 shrink-0" />
              安全上の注意は認定インストラクター以上に表示されます。現在の表示範囲では一覧に出ません。
            </p>
          ) : null}
        </div>

        {selected ? (
          <div className="hidden xl:block">
            <OilDetail oil={selected} onClose={() => setSelectedSlug(null)} />
          </div>
        ) : null}
      </div>

      {/* xl 未満では詳細をモーダルで出す */}
      {selected ? (
        <div className="fixed inset-0 z-50 flex xl:hidden">
          <button
            type="button"
            aria-label="詳細を閉じる"
            onClick={() => setSelectedSlug(null)}
            className="absolute inset-0 bg-[#2b2340]/45"
          />
          <div className="relative ml-auto h-full w-full max-w-md">
            <OilDetail oil={selected} onClose={() => setSelectedSlug(null)} />
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
