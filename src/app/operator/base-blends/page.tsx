"use client";

import { useEffect, useState } from "react";
import { Lock, Unlock, X } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getBaseBlendGuide } from "@/data/baseBlendGuides";
import { demoBaseBlends } from "@/data/mockData";
import { usePrivateBaseRecipes } from "@/hooks/usePrivateBaseRecipes";
import { useViewerRole } from "@/hooks/useViewerRole";
import { canDisclose, DISCLOSURE_DESCRIPTIONS, disclosureLevelForRole } from "@/lib/disclosure";
import { BRAINWAVE_CHANNEL_META } from "@/types/brainwave";
import type { BaseBlend } from "@/types/aroma";

function TagRow({ label, items, tone }: { label: string; items: string[]; tone: "primary" | "success" }) {
  if (items.length === 0) return null;
  const className =
    tone === "primary"
      ? "bg-[var(--admin-primary-soft)] text-[var(--admin-primary-strong)]"
      : "bg-[var(--admin-success-soft)] text-[var(--admin-success)]";
  return (
    <div>
      <h3 className="text-xs font-bold text-[var(--admin-text-muted)]">{label}</h3>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className={`rounded-full px-2.5 py-1 text-xs font-bold ${className}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-bold text-[var(--admin-primary-strong)]">{title}</h3>
      <div className="mt-1.5 text-sm leading-6 text-[var(--admin-text)]">{children}</div>
    </section>
  );
}

/**
 * ベースブレンドの詳細。カードを押したときだけ開く。
 * 開示範囲は一覧と同じ判定を使い、内部比率はサーバーから取れているときのみ出す。
 */
function BaseBlendDetail({
  blend,
  canSeeInstructor,
  ratio,
  ratioNote,
  ratiosVisible,
  onClose,
}: {
  blend: BaseBlend;
  canSeeInstructor: boolean;
  ratio?: string;
  ratioNote?: string;
  ratiosVisible: boolean;
  onClose: () => void;
}) {
  const guide = getBaseBlendGuide(blend.id);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true">
      <button type="button" className="flex-1 cursor-default" aria-label="閉じる" onClick={onClose} />
      <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-[var(--admin-surface)] shadow-xl">
        <div
          className="flex items-start justify-between gap-3 p-5 text-white"
          style={{ background: `linear-gradient(135deg, ${blend.color}, #a08bc9)` }}
        >
          <div className="min-w-0">
            <p className="text-xs font-bold">{blend.code}</p>
            <h2 className="mt-1 text-xl font-bold">{blend.name}</h2>
            <p className="mt-1.5 text-xs leading-5 opacity-90">{blend.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="詳細を閉じる"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/20 transition hover:bg-white/30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <TagRow label="構成精油" items={blend.public_ingredients} tone="primary" />
          <TagRow label="目的" items={blend.benefits} tone="success" />

          {guide ? (
            <>
              <DetailBlock title="香りの印象">{guide.public.scentImpression}</DetailBlock>
              <DetailBlock title="香りの広がり方">{guide.public.scentJourney}</DetailBlock>
              <DetailBlock title="こんな方に選ばれています">
                <ul className="list-disc space-y-1 pl-5">
                  {guide.public.recommendedFor.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </DetailBlock>
              <DetailBlock title="使うシーン">
                {guide.public.scenes.join(" / ")}
                <span className="mt-1 block text-xs text-[var(--admin-text-muted)]">
                  使う時間帯: {guide.public.timeOfDay}
                </span>
              </DetailBlock>
              <DetailBlock title="測定結果とのつながり">{guide.public.brainwaveContext}</DetailBlock>

              {canSeeInstructor ? (
                <div className="space-y-5 rounded-xl bg-[var(--admin-primary-softer)] p-4">
                  <p className="text-xs font-bold text-[var(--admin-primary-strong)]">
                    ここから下は認定インストラクター以上の表示範囲です。
                  </p>
                  <DetailBlock title="他のブレンドとの使い分け">
                    {guide.instructor.selectionGuide}
                  </DetailBlock>
                  <DetailBlock title="追加精油の相性">
                    <ul className="space-y-2">
                      {guide.instructor.pairingOils.map((oil) => (
                        <li key={oil.name}>
                          <span className="font-bold">{oil.name}</span>
                          <span className="block text-xs leading-5 text-[var(--admin-text-muted)]">
                            {oil.reason}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </DetailBlock>
                  <DetailBlock title="測定値の目安">
                    {guide.instructor.brainwaveIndication.channels
                      .map((channel) => BRAINWAVE_CHANNEL_META[channel].shortLabel)
                      .join(" / ")}
                    <span className="mt-1 block text-xs leading-5 text-[var(--admin-text-muted)]">
                      {guide.instructor.brainwaveIndication.note}
                    </span>
                  </DetailBlock>
                  <DetailBlock title="ブレンド時の注意">
                    <ul className="list-disc space-y-1 pl-5 text-xs leading-5">
                      {guide.instructor.cautions.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </DetailBlock>
                  <section>
                    <h3 className="text-xs font-bold text-[var(--admin-danger)]">事前確認が必要な方</h3>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-5 text-[var(--admin-danger)]">
                      {guide.instructor.contraindications.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-[var(--admin-text-muted)]">
              このブレンドの解説はまだ登録されていません。
            </p>
          )}

          {ratiosVisible ? (
            <div className="rounded-xl bg-[var(--admin-danger-soft)] p-4">
              <p className="text-xs font-bold text-[var(--admin-danger)]">管理者限定</p>
              <p className="mt-1.5 text-sm leading-6">内部比率: {ratio ?? "未設定"}</p>
              {ratioNote ? (
                <p className="mt-1 text-xs leading-5 text-[var(--admin-text-muted)]">{ratioNote}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function OperatorBaseBlendsPage() {
  const { role } = useViewerRole();
  const level = disclosureLevelForRole(role);
  const canSeeInstructor = canDisclose(level, "instructor");
  const canSeeInternal = canDisclose(level, "internal");

  const [showInternal, setShowInternal] = useState(false);
  const [openBlendId, setOpenBlendId] = useState<string | null>(null);
  const {
    recipes,
    loading: recipesLoading,
    error: recipesError,
  } = usePrivateBaseRecipes(canSeeInternal && showInternal);
  const ratiosVisible = canSeeInternal && showInternal && !recipesError;
  const openBlend = demoBaseBlends.find((blend) => blend.id === openBlendId) ?? null;

  return (
    <AdminShell
      actions={
        canSeeInternal ? (
          <button
            type="button"
            onClick={() => setShowInternal((open) => !open)}
            aria-label={showInternal ? "内部比率を隠す" : "内部比率を表示"}
            title={showInternal ? "内部比率を隠す" : "内部比率を表示"}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border transition ${
              showInternal
                ? "border-[var(--admin-primary)] bg-[var(--admin-primary-soft)] text-[var(--admin-primary-strong)]"
                : "border-[var(--admin-border)] text-[var(--admin-text-muted)]"
            }`}
          >
            {showInternal ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </button>
        ) : (
          // 文言は出さない。鍵マークだけで「ここから先は開かない」ことを示す。
          <span
            aria-label="管理者限定"
            title="管理者限定"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--admin-border)] text-[var(--admin-text-muted)]"
          >
            <Lock className="h-4 w-4" />
          </span>
        )
      }
    >
      <div className="space-y-4 p-4 lg:p-6">
        <p className="rounded-xl bg-[var(--admin-primary-softer)] p-3.5 text-xs leading-5 text-[var(--admin-text-muted)]">
          現在の表示範囲: {DISCLOSURE_DESCRIPTIONS[level]}
          <span className="mt-1 block">カードを押すと、そのブレンドの詳しい解説が開きます。</span>
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
              <button
                key={blend.id}
                type="button"
                onClick={() => setOpenBlendId(blend.id)}
                className="flex flex-col overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] text-left transition hover:border-[var(--admin-primary)] hover:shadow-md"
              >
                <div
                  className="flex w-full items-end justify-between gap-3 p-4 text-white"
                  style={{ background: `linear-gradient(135deg, ${blend.color}, #a08bc9)` }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold">{blend.code}</p>
                    <h2 className="mt-1 truncate text-lg font-bold">{blend.name}</h2>
                  </div>
                </div>

                <div className="flex-1 space-y-3.5 p-4">
                  <TagRow label="構成精油" items={blend.public_ingredients} tone="primary" />
                  <TagRow label="目的" items={blend.benefits} tone="success" />

                  {guide ? (
                    <p className="text-sm leading-6 text-[var(--admin-text-muted)]">
                      {guide.public.scentImpression}
                    </p>
                  ) : null}

                  {ratiosVisible ? (
                    <div className="rounded-lg bg-[var(--admin-danger-soft)] p-3">
                      <p className="text-xs leading-5">
                        <span className="font-bold">内部比率:</span> {recipe?.ratio ?? "未設定"}
                      </p>
                    </div>
                  ) : null}

                  <p className="text-xs font-bold text-[var(--admin-primary-strong)]">詳しく見る</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {openBlend ? (
        <BaseBlendDetail
          blend={openBlend}
          canSeeInstructor={canSeeInstructor}
          ratio={recipes[openBlend.id]?.ratio}
          ratioNote={recipes[openBlend.id]?.note}
          ratiosVisible={ratiosVisible}
          onClose={() => setOpenBlendId(null)}
        />
      ) : null}
    </AdminShell>
  );
}
