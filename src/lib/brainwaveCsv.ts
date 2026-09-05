import {
  BRAINWAVE_CHANNELS,
  type BrainwaveChannel,
  type BrainwaveChannelStats,
  type BrainwaveSeries,
} from "@/types/brainwave";

/**
 * FocusCalm など測定機器から書き出した CSV を取り込むためのパーサ。
 *
 * 機器やアプリのバージョンで列名が変わるため、列名は完全一致ではなく
 * 正規化した別名テーブルで照合する。列の順序にも依存しない。
 */

export type ParsedBrainwaveCsv = {
  timestampsSec: number[];
  series: BrainwaveSeries[];
  missingChannels: BrainwaveChannel[];
  stats: BrainwaveChannelStats[];
  durationSec: number;
  /** 解析中に気付いた注意点。UIにそのまま出して取り込み判断に使う。 */
  warnings: string[];
  /** 実際に採用した「チャンネル → CSV列名」の対応。 */
  columnMap: Partial<Record<BrainwaveChannel, string>>;
  timeColumn: string | null;
  rowCount: number;
};

export class BrainwaveCsvError extends Error {}

/** 列名照合用の正規化。大小文字・空白・記号・全角括弧の揺れを吸収する。 */
function normalizeHeader(header: string): string {
  return header
    .replace(/^﻿/, "")
    .trim()
    .toLowerCase()
    .replace(/[（）()[\]{}"'`]/g, "")
    .replace(/[\s_\-./%]/g, "");
}

const CHANNEL_ALIASES: Record<BrainwaveChannel, string[]> = {
  relax: [
    "relax",
    "relaxation",
    "relaxscore",
    "calm",
    "calmscore",
    "calmness",
    "focuscalmscore",
    "リラックス",
    "リラックス値",
    "リラックス度",
    "沈静",
    "鎮静",
  ],
  focus: [
    "focus",
    "focusscore",
    "attention",
    "attentionscore",
    "concentration",
    "集中",
    "集中値",
    "集中度",
    "注意",
  ],
  alpha: ["alpha", "alphawave", "alphapower", "α", "α波", "アルファ", "アルファ波"],
  beta: ["beta", "betawave", "betapower", "β", "β波", "ベータ", "ベータ波"],
  gamma: ["gamma", "gammawave", "gammapower", "γ", "γ波", "ガンマ", "ガンマ波"],
  delta: ["delta", "deltawave", "deltapower", "δ", "δ波", "デルタ", "デルタ波"],
  theta: ["theta", "thetawave", "thetapower", "θ", "θ波", "シータ", "セータ", "シータ波"],
};

const TIME_ALIASES = [
  "time",
  "timestamp",
  "elapsed",
  "elapsedtime",
  "elapsedsec",
  "elapsedseconds",
  "seconds",
  "sec",
  "datetime",
  "時間",
  "経過時間",
  "経過秒",
  "計測時間",
  "秒",
  "日時",
];

const NORMALIZED_CHANNEL_ALIASES: Array<{ channel: BrainwaveChannel; aliases: Set<string> }> =
  BRAINWAVE_CHANNELS.map((channel) => ({
    channel,
    aliases: new Set(CHANNEL_ALIASES[channel].map(normalizeHeader)),
  }));

const NORMALIZED_TIME_ALIASES = new Set(TIME_ALIASES.map(normalizeHeader));

/**
 * RFC4180 準拠の最小限のCSV分割。引用符内のカンマ・改行・二重引用符を扱う。
 * 機器の書き出しにメモ列が含まれても壊れないようにするため、split(",") は使わない。
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      // CRLF を1つの改行として扱う。
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  rows.push(row);

  // 末尾の空行を落とす。
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

function toNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(/[%％]/g, "");
  if (trimmed === "") return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/**
 * 時刻列を「先頭を0とした経過秒」に変換する。
 * 秒数値・ミリ秒エポック・ISO日時・`mm:ss` / `hh:mm:ss` 表記に対応する。
 */
function parseTimeCell(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  if (/^\d{1,2}:\d{2}(:\d{2})?([.,]\d+)?$/.test(trimmed)) {
    const parts = trimmed.replace(",", ".").split(":").map(Number);
    if (parts.some((part) => !Number.isFinite(part))) return null;
    return parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : parts[0] * 60 + parts[1];
  }

  const numeric = toNumber(trimmed);
  if (numeric !== null) return numeric;

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed / 1000 : null;
}

/**
 * 経過秒の絶対値が大きい場合はミリ秒エポック等とみなし、単位を推定して秒に揃える。
 * 先頭を 0 起点に正規化する。
 */
function normalizeTimeline(rawTimes: number[]): { timestampsSec: number[]; warning: string | null } {
  if (rawTimes.length < 2) {
    return { timestampsSec: rawTimes.map((_, index) => index), warning: null };
  }

  const first = rawTimes[0];
  const last = rawTimes[rawTimes.length - 1];
  const span = last - first;

  if (span <= 0) {
    return {
      timestampsSec: rawTimes.map((_, index) => index),
      warning: "時刻列が単調増加していないため、行番号を1秒間隔の経過時間として扱いました。",
    };
  }

  // 1分測定で span がミリ秒スケール（数万）なら ms 表記とみなす。
  const divisor = span > 20000 ? 1000 : 1;
  const timestampsSec = rawTimes.map((value) => (value - first) / divisor);

  return {
    timestampsSec,
    warning:
      divisor === 1000
        ? "時刻列をミリ秒として解釈し、秒へ換算しました。"
        : null,
  };
}

function computeStats(channel: BrainwaveChannel, values: number[]): BrainwaveChannelStats {
  return {
    channel,
    min: Math.min(...values),
    max: Math.max(...values),
    sampleCount: values.length,
  };
}

export function parseBrainwaveCsv(text: string): ParsedBrainwaveCsv {
  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    throw new BrainwaveCsvError("CSVにヘッダー行とデータ行が見つかりません。");
  }

  const headers = rows[0].map((cell) => cell.trim());
  const normalizedHeaders = headers.map(normalizeHeader);
  const warnings: string[] = [];

  const columnMap: Partial<Record<BrainwaveChannel, string>> = {};
  const channelIndexes: Array<{ channel: BrainwaveChannel; index: number }> = [];

  for (const { channel, aliases } of NORMALIZED_CHANNEL_ALIASES) {
    // 完全一致を優先し、無ければ部分一致で拾う（"alpha_power_avg" のような列名対策）。
    let index = normalizedHeaders.findIndex((header) => aliases.has(header));
    if (index === -1) {
      index = normalizedHeaders.findIndex((header) =>
        [...aliases].some((alias) => alias.length >= 4 && header.includes(alias)),
      );
    }
    if (index !== -1) {
      columnMap[channel] = headers[index];
      channelIndexes.push({ channel, index });
    }
  }

  if (channelIndexes.length === 0) {
    throw new BrainwaveCsvError(
      `脳波の列が1つも見つかりませんでした。検出した列: ${headers.join(", ") || "(なし)"}`,
    );
  }

  const timeIndex = normalizedHeaders.findIndex((header) => NORMALIZED_TIME_ALIASES.has(header));
  const timeColumn = timeIndex === -1 ? null : headers[timeIndex];
  if (timeIndex === -1) {
    warnings.push("時刻列が見つからないため、行番号を1秒間隔の経過時間として扱いました。");
  }

  const dataRows = rows.slice(1);
  const rawTimes: number[] = [];
  const collected = new Map<BrainwaveChannel, number[]>(
    channelIndexes.map(({ channel }) => [channel, []]),
  );

  let skippedRows = 0;

  dataRows.forEach((cells, rowIndex) => {
    const rowValues = new Map<BrainwaveChannel, number>();
    for (const { channel, index } of channelIndexes) {
      const value = toNumber(cells[index] ?? "");
      if (value !== null) rowValues.set(channel, value);
    }

    // 全チャンネル欠損の行は集計対象から外す（機器が出す区切り行・空行対策）。
    if (rowValues.size === 0) {
      skippedRows += 1;
      return;
    }

    const time = timeIndex === -1 ? rowIndex : parseTimeCell(cells[timeIndex] ?? "");
    rawTimes.push(time ?? rowIndex);

    for (const { channel } of channelIndexes) {
      const list = collected.get(channel)!;
      const value = rowValues.get(channel);
      // 一部チャンネルだけ欠損している行は直前値を引き継ぎ、時系列の長さを揃える。
      list.push(value ?? (list.length ? list[list.length - 1] : 0));
    }
  });

  if (rawTimes.length === 0) {
    throw new BrainwaveCsvError("数値として読み取れるデータ行がありませんでした。");
  }

  if (skippedRows > 0) {
    warnings.push(`数値が入っていない ${skippedRows} 行を読み飛ばしました。`);
  }

  const { timestampsSec, warning: timeWarning } = normalizeTimeline(rawTimes);
  if (timeWarning) warnings.push(timeWarning);

  const series: BrainwaveSeries[] = channelIndexes.map(({ channel }) => ({
    channel,
    values: collected.get(channel)!,
  }));

  const missingChannels = BRAINWAVE_CHANNELS.filter((channel) => !(channel in columnMap));
  if (missingChannels.length > 0) {
    warnings.push(
      `このCSVに含まれていないチャンネル: ${missingChannels.join(", ")}。カルテには取り込めません。`,
    );
  }

  return {
    timestampsSec,
    series,
    missingChannels,
    stats: series.map((item) => computeStats(item.channel, item.values)),
    durationSec: timestampsSec[timestampsSec.length - 1] - timestampsSec[0],
    warnings,
    columnMap,
    timeColumn,
    rowCount: timestampsSec.length,
  };
}

/**
 * 描画用の間引き。1分測定でもサンプリングレート次第で数千点になるため、
 * 形状を保ったまま点数を落とす（各バケットの最小・最大を残す）。
 */
export function downsampleSeries(
  timestampsSec: number[],
  values: number[],
  maxPoints = 240,
): Array<{ t: number; v: number }> {
  const points = timestampsSec.map((t, index) => ({ t, v: values[index] ?? 0 }));
  if (points.length <= maxPoints) return points;

  // 各バケットから最大2点（最小・最大）を残すため、バケット数は maxPoints の半分にする。
  const bucketSize = Math.ceil(points.length / Math.max(1, Math.floor(maxPoints / 2)));
  const result: Array<{ t: number; v: number }> = [];

  for (let start = 0; start < points.length; start += bucketSize) {
    const bucket = points.slice(start, start + bucketSize);
    let min = bucket[0];
    let max = bucket[0];
    for (const point of bucket) {
      if (point.v < min.v) min = point;
      if (point.v > max.v) max = point;
    }
    // 時間順を崩さないように並べ直す。
    const [earlier, later] = min.t <= max.t ? [min, max] : [max, min];
    result.push(earlier);
    if (later !== earlier) result.push(later);
  }

  return result;
}
