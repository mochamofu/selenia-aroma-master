"use client";

import { useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getBaseBlendGuide } from "@/data/baseBlendGuides";
import { demoBaseBlends } from "@/data/mockData";
import { usePrivateBaseRecipes } from "@/hooks/usePrivateBaseRecipes";
import { useViewerRole } from "@/hooks/useViewerRole";
import { canDisclose, DISCLOSURE_DESCRIPTIONS, disclosureLevelForRole } from "@/lib/disclosure";
import { BRAINWAVE_CHANNEL_META } from "@/types/brainwave";

export default function OperatorBaseBlendsPage() {
  const { role } = useViewerRole();
  const level = disclosureLevelForRole(role);
  const canSeeInstructor = canDisclose(level, "instructor");
  const canSeeInternal = canDisclose(level, "internal");

  const [showInternal, setShowInternal] = useState(false);
  const {
    recipes,
    loading: recipesLoading,
    error: recipesError,
  } = usePrivateBaseRecipes(canSeeInternal && showInternal);
  const ratiosVisible = canSeeInternal && showInternal && !recipesError;

  return (
    <AdminShell
      actions={
        canSeeInternal ? (
          <button
            type="button"
            onClick={() => setShowInternal((open) => !open)}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition ${
              showInternal
                ? "border-[var(--admin-primary)] bg-[var(--admin-primary-soft)] text-[var(--admin-primary-strong)]"
                : "border-[var(--admin-border)] text-[var(--admin-text-muted)]"
            }`}
          >
            {showInternal ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {showInternal ? "内部比率を隠す" : "内部比率を表示"}
          </button>
        ) : (
          <span className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3 text-xs font-bold text-[var(--admin-text-muted)]">
            <Lock className="h-3.5 w-3.5" />
            内部比率は管理者のみ
          </span>
        )
      }
    >
      <div className="space-y-4 p-4 lg:p-6">
        <p className="rounded-xl bg-[var(--admin-primary-softer)] p-3.5 text-xs leading-5 text-[var(--admin-text-muted)]">
          現在の表示範囲: {DISCLOSURE_DESCRIPTIONS[level]}
        </p>

        {recipesError ? (
          <p className="rounded-xl bg-[var(--admin-danger-soft)] p-3.5 text-xs font-bold text-[var(--admin-danger)]">
            {recipesError}
          </p>
        ) : null}
        {recipesLoading ? (
          <p className="rounded-xl bg-[var(--admin-primary-softer)] p-3.5 text-xs">内部比率を取得しています…</p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {demoBaseBlends.map((blend) => {
            const guide = getBaseBlendGuide(blend.id);
            const recipe = recipes[blend.id];
            return (
              <article
                key={blend.id}
                className="flex flex-col overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]"
              >
                <div
                  className="flex items-end justify-between gap-3 p-4 text-white"
                  style={{ background: `linear-gradient(135deg, ${blend.color}, #a08bc9)` }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold">{blend.code}</p>
                    <h2 className="mt-1 truncate text-lg font-bold">{blend.name}</h2>
                  </div>
                </div>

                <div className="flex-1 space-y-3.5 p-4">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--admin-text-muted)]">構成精油</h3>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {blend.public_ingredients.map((name) => (
                        <span
                          key={name}
                          className="rounded-full bg-[var(--admin-primary-soft)] px-2.5 py-1 text-xs font-bold text-[var(--admin-primary-strong)]"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-[var(--admin-text-muted)]">目的</h3>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {blend.benefits.map((benefit) => (
                        <span
                          key={benefit}
                          className="rounded-full bg-[var(--admin-success-soft)] px-2.5 py-1 text-xs font-bold text-[var(--admin-success)]"
                        >
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>

                  {guide ? (
                    <p className="text-sm leading-6 text-[var(--admin-text-muted)]">
                      {guide.public.scentImpression}
                    </p>
                  ) : null}

                  {guide && canSeeInstructor ? (
                    <div className="space-y-2.5 rounded-lg bg-[var(--admin-primary-softer)] p-3">
                      <p className="text-xs leading-5">
                        <span className="font-bold">使い分け:</span> {guide.instructor.selectionGuide}
                      </p>
                      <p className="text-xs leading-5">
                        <span className="font-bold">相性:</span>{" "}
                        {guide.instructor.pairingOils.map((oil) => oil.name).join(" / ")}
                      </p>
                      <p className="text-xs leading-5">
                        <span className="font-bold">測定目安:</span>{" "}
                        {guide.instructor.brainwaveIndication.channels
                          .map((channel) => BRAINWAVE_CHANNEL_META[channel].shortLabel)
                          .join(" / ")}
                        {" — "}
                        {guide.instructor.brainwaveIndication.note}
                      </p>
                      <p className="text-xs leading-5 text-[var(--admin-danger)]">
                        <span className="font-bold">事前確認:</span>{" "}
                        {guide.instructor.contraindications[0]}
                      </p>
                    </div>
                  ) : null}

                  {ratiosVisible ? (
                    <div className="rounded-lg bg-[var(--admin-danger-soft)] p-3">
                      <p className="text-xs leading-5">
                        <span className="font-bold">内部比率:</span> {recipe?.ratio ?? "未設定"}
                      </p>
                      {recipe?.note ? (
                        <p className="mt-1 text-xs leading-5 text-[var(--admin-text-muted)]">{recipe.note}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
