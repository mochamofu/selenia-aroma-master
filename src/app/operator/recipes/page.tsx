"use client";

import { useMemo, useState, type FormEvent } from "react";
import { BookOpen, Plus, Search, Trash2, TrendingUp, X } from "lucide-react";
import { AdminOnly } from "@/components/admin/AdminOnly";
import { AdminShell } from "@/components/admin/AdminShell";
import { essentialOils } from "@/data/essentialOils";
import { demoBaseBlends } from "@/data/mockData";
import {
  loadRecipes,
  recipeUseCount,
  saveRecipes,
  totalVolumeUl,
  type AromaRecipe,
  type RecipeOil,
} from "@/lib/aromaRecipes";

/**
 * アロマレシピ。よく使う組み合わせを型として登録しておく画面。
 *
 * いまは手で登録する。カルテの測定と制作記録が保存されるようになったら、
 * 実績（このレシピを使った回のリラックス度・集中度）を自動で集計して
 * 並べ替えられるようにする。並べ替えの基準は実際に採用した回数で、
 * 測定値を平均したり点数に均したりはしない。
 */

const PURPOSE_PRESETS = [
  "就寝前",
  "作業前",
  "帰宅後",
  "外出前",
  "緊張がほぐれない",
  "集中が続かない",
  "疲労感",
  "気分の切り替え",
];

function formatMl(ul: number) {
  return `${(ul / 1000).toFixed(2).replace(/\.?0+$/, "")}mL`;
}

type OilDraft = { name: string; amountUl: string };

function RecipeForm({
  onAdd,
  onClose,
}: {
  onAdd: (recipe: AromaRecipe) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [baseBlendId, setBaseBlendId] = useState(demoBaseBlends[0]?.id ?? "");
  const [baseAmountUl, setBaseAmountUl] = useState("3000");
  const [oils, setOils] = useState<OilDraft[]>([{ name: essentialOils[0]?.name ?? "", amountUl: "1000" }]);
  const [purposeTags, setPurposeTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function togglePurpose(tag: string) {
    setPurposeTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("レシピ名を入力してください。");
      return;
    }
    const parsedOils: RecipeOil[] = oils
      .map((oil) => ({ name: oil.name, amountUl: Number(oil.amountUl) }))
      .filter((oil) => oil.name && Number.isFinite(oil.amountUl) && oil.amountUl > 0);
    const base = Number(baseAmountUl);
    if (!Number.isFinite(base) || base <= 0) {
      setError("ベースブレンドの量を数字で入力してください。");
      return;
    }

    onAdd({
      id: `recipe-${Date.now()}`,
      name: name.trim(),
      baseBlendId,
      baseAmountUl: base,
      oils: parsedOils,
      purposeTags,
      note: note.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
      outcome: { useCount: 0 },
    });
    onClose();
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-[var(--admin-primary)] bg-[var(--admin-surface)] p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-bold">レシピを追加</h2>
        <button type="button" onClick={onClose} aria-label="閉じる">
          <X className="h-4 w-4 text-[var(--admin-text-muted)]" />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="text-xs font-bold text-[var(--admin-text-muted)]">レシピ名</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例: 就寝前のいちばん最初に出す型"
            className="mt-1.5 h-11 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 text-base outline-none focus:border-[var(--admin-primary)]"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
          <label className="block">
            <span className="text-xs font-bold text-[var(--admin-text-muted)]">ベースブレンド</span>
            <select
              value={baseBlendId}
              onChange={(event) => setBaseBlendId(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 text-base outline-none focus:border-[var(--admin-primary)]"
            >
              {demoBaseBlends.map((blend) => (
                <option key={blend.id} value={blend.id}>
                  {blend.code} {blend.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-[var(--admin-text-muted)]">量（μL）</span>
            <input
              value={baseAmountUl}
              onChange={(event) => setBaseAmountUl(event.target.value)}
              inputMode="decimal"
              className="mt-1.5 h-11 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 text-base outline-none focus:border-[var(--admin-primary)]"
            />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--admin-text-muted)]">追加精油</span>
            <button
              type="button"
              onClick={() => setOils((current) => [...current, { name: essentialOils[0]?.name ?? "", amountUl: "500" }])}
              className="flex h-8 items-center gap-1 rounded-lg border border-[var(--admin-border)] px-2 text-xs font-bold text-[var(--admin-primary-strong)]"
            >
              <Plus className="h-3.5 w-3.5" />
              行を追加
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {oils.map((oil, index) => (
              <div key={index} className="grid grid-cols-[minmax(0,1fr)_120px_36px] gap-2">
                <select
                  value={oil.name}
                  aria-label="追加精油"
                  onChange={(event) =>
                    setOils((current) =>
                      current.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)),
                    )
                  }
                  className="h-11 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-base outline-none focus:border-[var(--admin-primary)]"
                >
                  {essentialOils.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <input
                  value={oil.amountUl}
                  aria-label="追加精油の量 μL"
                  inputMode="decimal"
                  onChange={(event) =>
                    setOils((current) =>
                      current.map((item, i) => (i === index ? { ...item, amountUl: event.target.value } : item)),
                    )
                  }
                  className="h-11 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-base outline-none focus:border-[var(--admin-primary)]"
                />
                <button
                  type="button"
                  onClick={() => setOils((current) => current.filter((_, i) => i !== index))}
                  aria-label="この行を削除"
                  className="grid h-11 place-items-center rounded-lg bg-[var(--admin-primary-softer)] text-[var(--admin-text-muted)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <span className="text-xs font-bold text-[var(--admin-text-muted)]">使う場面</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PURPOSE_PRESETS.map((tag) => {
              const active = purposeTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => togglePurpose(tag)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? "border-[var(--admin-primary)] bg-[var(--admin-primary-soft)] text-[var(--admin-primary-strong)]"
                      : "border-[var(--admin-border)] text-[var(--admin-text-muted)]"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-[var(--admin-text-muted)]">メモ</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="使い分けの判断、避けたほうがよい方の条件など"
            className="mt-1.5 min-h-20 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-base outline-none focus:border-[var(--admin-primary)]"
          />
        </label>

        {error ? (
          <p className="rounded-lg bg-[var(--admin-danger-soft)] p-3 text-xs font-bold text-[var(--admin-danger)]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="h-11 w-full rounded-lg bg-[var(--admin-primary)] text-sm font-bold text-white transition hover:bg-[var(--admin-primary-strong)]"
        >
          このレシピを登録する
        </button>
      </div>
    </form>
  );
}

function RecipesBody() {
  // localStorage はレンダー中に読めないので、初期化関数の中で読む。
  // サーバー側では既定の型が返り、ハイドレーション後にこの端末の内容へ入れ替わる。
  const [recipes, setRecipes] = useState<AromaRecipe[]>(() => loadRecipes());
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [sortByUseCount, setSortByUseCount] = useState(true);

  function update(next: AromaRecipe[]) {
    setRecipes(next);
    saveRecipes(next);
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = recipes.filter((recipe) => {
      if (!q) return true;
      const haystack = [
        recipe.name,
        recipe.note,
        ...recipe.purposeTags,
        ...recipe.oils.map((oil) => oil.name),
        demoBaseBlends.find((blend) => blend.id === recipe.baseBlendId)?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    return sortByUseCount
      ? [...filtered].sort((a, b) => recipeUseCount(b) - recipeUseCount(a))
      : [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [recipes, query, sortByUseCount]);

  return (
    <AdminShell
      title="アロマレシピ"
      subtitle="よく使う組み合わせを型として登録します"
      actions={
        <button
          type="button"
          onClick={() => setFormOpen((open) => !open)}
          className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[var(--admin-primary)] px-3 text-xs font-bold text-white transition hover:bg-[var(--admin-primary-strong)]"
        >
          <Plus className="h-4 w-4" />
          レシピを追加
        </button>
      }
    >
      <div className="space-y-4 p-4 lg:p-6">
        <section className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 min-w-56 flex-1 items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3">
              <Search className="h-4 w-4 shrink-0 text-[var(--admin-text-muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="レシピ名・精油名・場面で探す"
                className="min-w-0 flex-1 bg-transparent text-base outline-none"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")} aria-label="入力を消す">
                  <X className="h-4 w-4 text-[var(--admin-text-muted)]" />
                </button>
              ) : null}
            </div>
            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3 text-xs font-bold">
              <input
                type="checkbox"
                checked={sortByUseCount}
                onChange={(event) => setSortByUseCount(event.target.checked)}
                className="h-4 w-4 accent-[var(--admin-primary)]"
              />
              よく使う順に並べる
            </label>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--admin-text-muted)]">
            全 {recipes.length} 件のうち {visible.length} 件を表示中。
            登録内容はこの端末に保存されます。
          </p>
        </section>

        {formOpen ? (
          <RecipeForm
            onAdd={(recipe) => update([recipe, ...recipes])}
            onClose={() => setFormOpen(false)}
          />
        ) : null}

        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface)] p-10 text-center text-sm text-[var(--admin-text-muted)]">
            {recipes.length === 0
              ? "まだレシピがありません。右上の「レシピを追加」から登録してください。"
              : "条件に合うレシピがありません。"}
          </p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {visible.map((recipe) => {
              const blend = demoBaseBlends.find((item) => item.id === recipe.baseBlendId);
              const { useCount } = recipe.outcome;
              return (
                <article
                  key={recipe.id}
                  className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-bold">{recipe.name}</h2>
                      <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                        合計 {formatMl(totalVolumeUl(recipe))} / 登録 {recipe.createdAt}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => update(recipes.filter((item) => item.id !== recipe.id))}
                      aria-label={`${recipe.name} を削除`}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--admin-border)] text-[var(--admin-text-muted)] transition hover:border-[var(--admin-danger)] hover:text-[var(--admin-danger)]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 rounded-lg bg-[var(--admin-primary-softer)] p-3">
                    <p className="text-sm font-bold">
                      {blend ? `${blend.code} ${blend.name}` : "ベース未設定"}
                      <span className="ml-2 text-xs font-normal text-[var(--admin-text-muted)]">
                        {formatMl(recipe.baseAmountUl)}
                      </span>
                    </p>
                    {recipe.oils.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-sm">
                        {recipe.oils.map((oil) => (
                          <li key={oil.name} className="flex justify-between gap-3">
                            <span>＋ {oil.name}</span>
                            <span className="text-[var(--admin-text-muted)]">{formatMl(oil.amountUl)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  {recipe.purposeTags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {recipe.purposeTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[var(--admin-primary-soft)] px-2.5 py-1 text-xs font-bold text-[var(--admin-primary-strong)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {recipe.note ? (
                    <p className="mt-3 text-sm leading-6 text-[var(--admin-text-muted)]">{recipe.note}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--admin-border)] pt-3 text-xs">
                    <span className="flex items-center gap-1.5 font-bold text-[var(--admin-primary-strong)]">
                      <TrendingUp className="h-3.5 w-3.5" />
                      実績
                    </span>
                    {useCount === 0 ? (
                      <span className="text-[var(--admin-text-muted)]">まだ採用記録がありません</span>
                    ) : (
                      <span className="text-[var(--admin-text-muted)]">
                        採用 <b className="text-[var(--admin-text)]">{useCount}</b> 回
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <section className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <BookOpen className="h-4 w-4 text-[var(--admin-primary-strong)]" />
            これから作るところ
          </h2>
          <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[var(--admin-text-muted)]">
            <li>
              制作記録が保存されるようになったら、その型を実際に採用した回数を
              自動で数えて「実績」に入れます。
            </li>
            <li>
              よく採用している組み合わせを上に出し、カルテからそのまま呼び出せる
              ようにします。測定値を平均したり点数に均したりはしません。
            </li>
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}

export default function OperatorRecipesPage() {
  return (
    <AdminOnly title="アロマレシピ">
      <RecipesBody />
    </AdminOnly>
  );
}
