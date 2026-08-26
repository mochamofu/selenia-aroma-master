"use client";

import { Sparkles } from "lucide-react";
import type { TrialRow } from "@/components/BrainwaveTrialGrid";

/**
 * 1セッション分の推移を1枚にまとめる図。
 *
 * リラックス度も集中度も 0〜100 で、高いほどその状態が強い。
 * ふつうは一方が上がると他方が下がるが、香りが合っているときは両方が
 * 高く出ることがある。その回を見つけやすくするのがこの図の目的。
 *
 * 数値は測定結果そのものであって、良し悪しを決めるものではない。
 * 読み取りは施術者が行う前提で、断定的な表示はしない。
 */

/** 両方がこの値以上なら、両立している回として印を付ける。 */
const BOTH_HIGH_THRESHOLD = 70;

const RELAX_COLOR = "#5ab4e8";
const FOCUS_COLOR = "#e08a3c";

export type TrendPoint = {
  trialNo: number;
  label: string;
  relax: number | null;
  focus: number | null;
};

export function toTrendPoints(rows: TrialRow[]): TrendPoint[] {
  return rows.map((row) => ({
    trialNo: row.trialNo,
    label: row.label,
    relax: row.relax?.score ?? null,
    focus: row.focus?.score ?? null,
  }));
}

export function findBothHigh(points: TrendPoint[]): TrendPoint[] {
  return points.filter(
    (point) =>
      point.relax !== null &&
      point.focus !== null &&
      point.relax >= BOTH_HIGH_THRESHOLD &&
      point.focus >= BOTH_HIGH_THRESHOLD,
  );
}

const WIDTH = 720;
const HEIGHT = 260;
const PADDING = { top: 16, right: 16, bottom: 40, left: 34 };

function buildPath(points: TrendPoint[], key: "relax" | "focus", stepX: number, scaleY: (v: number) => number) {
  const segments: string[] = [];
  let started = false;
  points.forEach((point, index) => {
    const value = point[key];
    if (value === null) {
      started = false;
      return;
    }
    const x = PADDING.left + index * stepX;
    const y = scaleY(value);
    segments.push(`${started ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`);
    started = true;
  });
  return segments.join(" ");
}

export function BrainwaveTrendChart({ points }: { points: TrendPoint[] }) {
  const measured = points.filter((point) => point.relax !== null || point.focus !== null);
  if (measured.length < 2) {
    return (
      <p className="rounded-lg border border-dashed border-[#ddd6ea] bg-[#faf8fe] p-6 text-center text-xs leading-5 text-[#827690]">
        推移を描くには、2回以上の測定値が必要です。各回の「リラックス度」「集中度」に
        測定画面の数値を入れると、ここに折れ線が出ます。
      </p>
    );
  }

  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const stepX = points.length > 1 ? innerWidth / (points.length - 1) : 0;
  const scaleY = (value: number) => PADDING.top + innerHeight * (1 - value / 100);
  const bothHigh = findBothHigh(points);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full min-w-[560px]"
          role="img"
          aria-label="リラックス度と集中度の推移"
        >
          {[0, 25, 50, 75, 100].map((tick) => (
            <g key={tick}>
              <line
                x1={PADDING.left}
                y1={scaleY(tick)}
                x2={WIDTH - PADDING.right}
                y2={scaleY(tick)}
                stroke="#e8e2f2"
              />
              <text x={PADDING.left - 6} y={scaleY(tick) + 4} textAnchor="end" fontSize="10" fill="#9a90aa">
                {tick}
              </text>
            </g>
          ))}

          {/* 両方が高く出た回を縦帯で示す */}
          {points.map((point, index) =>
            bothHigh.includes(point) ? (
              <rect
                key={`zone-${point.trialNo}`}
                x={PADDING.left + index * stepX - Math.min(stepX, 40) / 2}
                y={PADDING.top}
                width={Math.min(stepX, 40)}
                height={innerHeight}
                fill="#8d6fd1"
                opacity="0.1"
              />
            ) : null,
          )}

          <path d={buildPath(points, "relax", stepX, scaleY)} fill="none" stroke={RELAX_COLOR} strokeWidth="2.5" />
          <path d={buildPath(points, "focus", stepX, scaleY)} fill="none" stroke={FOCUS_COLOR} strokeWidth="2.5" />

          {points.map((point, index) => (
            <g key={point.trialNo}>
              {point.relax !== null ? (
                <circle cx={PADDING.left + index * stepX} cy={scaleY(point.relax)} r="4" fill={RELAX_COLOR} />
              ) : null}
              {point.focus !== null ? (
                <circle cx={PADDING.left + index * stepX} cy={scaleY(point.focus)} r="4" fill={FOCUS_COLOR} />
              ) : null}
              <text
                x={PADDING.left + index * stepX}
                y={HEIGHT - PADDING.bottom + 18}
                textAnchor="middle"
                fontSize="11"
                fill="#665a78"
                fontWeight="bold"
              >
                {point.trialNo}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: RELAX_COLOR }} />
          リラックス度
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: FOCUS_COLOR }} />
          集中度
        </span>
        <span className="text-[#827690]">横軸は測定の回。数値が高いほどその状態が強く出ています。</span>
      </div>

      {bothHigh.length > 0 ? (
        <p className="flex items-start gap-2 rounded-lg bg-[#f3effb] p-3 text-xs leading-5 text-[#584d6b]">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8d6fd1]" />
          <span>
            第{bothHigh.map((point) => point.trialNo).join("・")}回は、リラックス度と集中度が
            どちらも {BOTH_HIGH_THRESHOLD} 以上で出ています。ふつうは一方が上がると他方が下がるため、
            両立している回として目を向ける価値があります（読み取りは施術者が行ってください）。
          </span>
        </p>
      ) : null}
    </div>
  );
}
