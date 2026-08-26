"use client";

import { ArrowLeftRight, ImageOff } from "lucide-react";
import type { BrainwaveScreenshot } from "@/types/brainwave";

/**
 * 測定回ごとにリラックス度と集中度を横並びで見せるグリッド。
 *
 * 1回の測定で2枚のグラフが出る。1セッションで7回前後まわるため、
 * 回を縦に積み、左にリラックス度、右に集中度を固定で置く。
 * 縦の位置が回、横の位置が種類、と決まっていれば見比べやすい。
 */

export type TrialRow = {
  trialNo: number;
  label: string;
  measuredAt: string;
  relax: BrainwaveScreenshot | null;
  focus: BrainwaveScreenshot | null;
};

/** 画像の配列を測定回ごとにまとめる。種類が未設定のものは並び順で埋める。 */
export function groupIntoTrials(images: BrainwaveScreenshot[]): TrialRow[] {
  const byTrial = new Map<number, BrainwaveScreenshot[]>();
  for (const image of images) {
    const list = byTrial.get(image.trialNo) ?? [];
    list.push(image);
    byTrial.set(image.trialNo, list);
  }

  return [...byTrial.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([trialNo, list]) => {
      let relax = list.find((image) => image.channels.includes("relax")) ?? null;
      let focus = list.find((image) => image.channels.includes("focus")) ?? null;
      // 種類がまだ決まっていないものは、余っている側へ順に入れる。
      const unassigned = list.filter((image) => image.channels.length === 0);
      for (const image of unassigned) {
        if (!relax) relax = image;
        else if (!focus) focus = image;
      }
      const first = list[0];
      return {
        trialNo,
        label: first?.trialLabel || `第${trialNo}回`,
        measuredAt: first?.measuredAt ?? "",
        relax,
        focus,
      };
    });
}

function Cell({
  image,
  kind,
  active,
  onSelect,
  onExpand,
}: {
  image: BrainwaveScreenshot | null;
  kind: "relax" | "focus";
  active: boolean;
  onSelect: (id: string) => void;
  onExpand: (id: string) => void;
}) {
  const tone = kind === "relax" ? "#5ab4e8" : "#e08a3c";
  const label = kind === "relax" ? "リラックス度" : "集中度";

  if (!image) {
    return (
      <div className="flex min-h-32 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#ddd6ea] bg-[#faf8fe] p-4 text-xs text-[#9a90aa]">
        <ImageOff className="h-4 w-4" />
        {label}の画像がありません
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(image.id)}
      onDoubleClick={() => onExpand(image.id)}
      title="ダブルクリックで拡大"
      className={`overflow-hidden rounded-lg border text-left transition ${
        active ? "border-[#8d6fd1] shadow-md shadow-[#8d6fd1]/12" : "border-[#e4dff0] hover:border-[#b7a5dd]"
      }`}
    >
      <img src={image.src} alt={`${image.trialLabel} の${label}`} className="w-full object-cover" />
      <span className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#3b3152]">
        <span className="h-2 w-2 rounded-full" style={{ background: tone }} />
        {label}
      </span>
    </button>
  );
}

export function BrainwaveTrialGrid({
  rows,
  activeImageId,
  onSelect,
  onExpand,
  onRelabel,
  onSwap,
  emptyMessage,
}: {
  rows: TrialRow[];
  activeImageId: string;
  onSelect: (id: string) => void;
  onExpand: (id: string) => void;
  onRelabel?: (trialNo: number, label: string) => void;
  onSwap?: (trialNo: number) => void;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[#ddd6ea] bg-[#faf8fe] p-6 text-center text-xs leading-5 text-[#827690]">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <section key={row.trialNo} className="rounded-lg border border-[#e4dff0] bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-7 min-w-7 place-items-center rounded-md bg-[#f3effb] px-2 text-xs font-bold text-[#8d6fd1]">
              {row.trialNo}
            </span>
            {onRelabel ? (
              <input
                value={row.label}
                onChange={(event) => onRelabel(row.trialNo, event.target.value)}
                aria-label={`第${row.trialNo}回の内容`}
                className="h-9 min-w-0 flex-1 rounded-lg border border-[#e4dff0] px-3 text-sm outline-none focus:border-[#8d6fd1]"
                placeholder="試した内容（例: ②＋ベルガモット1滴）"
              />
            ) : (
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#3b3152]">{row.label}</span>
            )}
            <span className="text-xs text-[#827690]">{row.measuredAt}</span>
            {onSwap ? (
              <button
                type="button"
                onClick={() => onSwap(row.trialNo)}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-[#e4dff0] px-2.5 text-xs font-bold text-[#665a78] transition hover:border-[#8d6fd1]"
                title="リラックス度と集中度が逆のときに入れ替えます"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                左右を入れ替える
              </button>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Cell
              image={row.relax}
              kind="relax"
              active={row.relax?.id === activeImageId}
              onSelect={onSelect}
              onExpand={onExpand}
            />
            <Cell
              image={row.focus}
              kind="focus"
              active={row.focus?.id === activeImageId}
              onSelect={onSelect}
              onExpand={onExpand}
            />
          </div>
        </section>
      ))}
    </div>
  );
}
