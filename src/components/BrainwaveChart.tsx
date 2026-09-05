"use client";

import { useId, useMemo } from "react";
import { downsampleSeries } from "@/lib/brainwaveCsv";
import { BRAINWAVE_CHANNEL_META, type BrainwaveChannel } from "@/types/brainwave";

type BrainwaveChartProps = {
  channel: BrainwaveChannel;
  timestampsSec: number[];
  values: number[];
  height?: number;
};

const VIEW_WIDTH = 640;
const PADDING = { top: 14, right: 14, bottom: 26, left: 40 };

function formatSeconds(seconds: number): string {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

function formatValue(value: number): string {
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export function BrainwaveChart({
  channel,
  timestampsSec,
  values,
  height = 180,
}: BrainwaveChartProps) {
  const gradientId = useId();
  const meta = BRAINWAVE_CHANNEL_META[channel];

  const chart = useMemo(() => {
    const points = downsampleSeries(timestampsSec, values);
    if (points.length === 0) return null;

    const minValue = Math.min(...points.map((point) => point.v));
    const maxValue = Math.max(...points.map((point) => point.v));
    // 値が一定でも線が潰れないよう、範囲がゼロのときは上下に余白を作る。
    const span = maxValue - minValue || Math.max(Math.abs(maxValue), 1) * 0.2;
    const low = minValue - span * 0.1;
    const high = maxValue + span * 0.1;

    const minTime = points[0].t;
    const maxTime = points[points.length - 1].t;
    const timeSpan = maxTime - minTime || 1;

    const plotWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
    const plotHeight = height - PADDING.top - PADDING.bottom;

    const toX = (t: number) => PADDING.left + ((t - minTime) / timeSpan) * plotWidth;
    const toY = (v: number) => PADDING.top + (1 - (v - low) / (high - low)) * plotHeight;

    const line = points
      .map((point, index) => `${index === 0 ? "M" : "L"}${toX(point.t).toFixed(2)},${toY(point.v).toFixed(2)}`)
      .join(" ");

    const area = `${line} L${toX(maxTime).toFixed(2)},${(PADDING.top + plotHeight).toFixed(2)} L${toX(minTime).toFixed(2)},${(PADDING.top + plotHeight).toFixed(2)} Z`;

    return {
      line,
      area,
      low,
      high,
      minTime,
      maxTime,
      plotWidth,
      plotHeight,
      pointCount: points.length,
    };
  }, [timestampsSec, values, height]);

  if (!chart) {
    return (
      <div className="grid h-32 place-items-center rounded-lg border border-dashed border-[#ddd6ea] text-xs text-[#827690]">
        {meta.label}のデータがありません
      </div>
    );
  }

  return (
    <figure className="rounded-lg border border-[#e4dff0] bg-white p-3">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-bold text-[#342a49]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
          {meta.label}
        </span>
        <span className="text-xs text-[#827690]">
          {formatValue(chart.low)}–{formatValue(chart.high)} / {meta.unitHint}
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`${meta.label}の推移グラフ。${formatValue(chart.low)} から ${formatValue(chart.high)} の範囲。`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={meta.color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={meta.color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((ratio) => {
          const y = PADDING.top + ratio * chart.plotHeight;
          const value = chart.high - ratio * (chart.high - chart.low);
          return (
            <g key={ratio}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={VIEW_WIDTH - PADDING.right}
                y2={y}
                stroke="#ece7f5"
                strokeWidth="1"
              />
              <text x={PADDING.left - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#9a90aa">
                {formatValue(value)}
              </text>
            </g>
          );
        })}

        <path d={chart.area} fill={`url(#${gradientId})`} />
        <path
          d={chart.line}
          fill="none"
          stroke={meta.color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        <text x={PADDING.left} y={height - 8} fontSize="11" fill="#9a90aa">
          {formatSeconds(chart.minTime)}
        </text>
        <text x={VIEW_WIDTH - PADDING.right} y={height - 8} textAnchor="end" fontSize="11" fill="#9a90aa">
          {formatSeconds(chart.maxTime)}
        </text>
      </svg>
    </figure>
  );
}
