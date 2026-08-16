/**
 * 脳波（FocusCalm 等の測定機器）から取り込むデータの型定義。
 *
 * 表示方針:
 * - 利用者向け画面に出すのは relax / focus の2系統のみ（`isPublicChannel`）。
 * - alpha / beta / gamma / delta / theta の5帯域は内部データとして必ず保管し、
 *   事業者カルテ側でのみ参照する。
 */

export type BrainwaveChannel =
  | "relax"
  | "focus"
  | "alpha"
  | "beta"
  | "gamma"
  | "delta"
  | "theta";

export const BRAINWAVE_CHANNELS: BrainwaveChannel[] = [
  "relax",
  "focus",
  "alpha",
  "beta",
  "gamma",
  "delta",
  "theta",
];

/** 利用者向け画面に表示してよいチャンネル。 */
export const PUBLIC_BRAINWAVE_CHANNELS: BrainwaveChannel[] = ["relax", "focus"];

export function isPublicChannel(channel: BrainwaveChannel): boolean {
  return PUBLIC_BRAINWAVE_CHANNELS.includes(channel);
}

export type BrainwaveChannelMeta = {
  channel: BrainwaveChannel;
  label: string;
  shortLabel: string;
  unitHint: string;
  color: string;
  description: string;
};

export const BRAINWAVE_CHANNEL_META: Record<BrainwaveChannel, BrainwaveChannelMeta> = {
  relax: {
    channel: "relax",
    label: "リラックス",
    shortLabel: "リラックス",
    unitHint: "0-100",
    color: "#8d6fd1",
    description: "緊張がゆるんでいる度合い。高いほど落ち着いた状態。",
  },
  focus: {
    channel: "focus",
    label: "集中",
    shortLabel: "集中",
    unitHint: "0-100",
    color: "#d98aa8",
    description: "注意が一点に向いている度合い。高いほど集中している状態。",
  },
  alpha: {
    channel: "alpha",
    label: "α波（アルファ）",
    shortLabel: "α",
    unitHint: "8-13Hz",
    color: "#5e9c8a",
    description: "安静・目を閉じたリラックス時に出やすい帯域。",
  },
  beta: {
    channel: "beta",
    label: "β波（ベータ）",
    shortLabel: "β",
    unitHint: "13-30Hz",
    color: "#c9832f",
    description: "覚醒・思考・緊張時に出やすい帯域。",
  },
  gamma: {
    channel: "gamma",
    label: "γ波（ガンマ）",
    shortLabel: "γ",
    unitHint: "30Hz-",
    color: "#a4553f",
    description: "高度な情報処理時に出やすい高周波帯域。",
  },
  delta: {
    channel: "delta",
    label: "δ波（デルタ）",
    shortLabel: "δ",
    unitHint: "0.5-4Hz",
    color: "#4a6fa5",
    description: "深い睡眠時に優位になる低周波帯域。",
  },
  theta: {
    channel: "theta",
    label: "θ波（シータ）",
    shortLabel: "θ",
    unitHint: "4-8Hz",
    color: "#7a68a6",
    description: "まどろみ・入眠期や瞑想時に出やすい帯域。",
  },
};

/** 1チャンネル分の時系列。`values[i]` は `timestampsSec[i]` 秒時点の値。 */
export type BrainwaveSeries = {
  channel: BrainwaveChannel;
  values: number[];
};

export type BrainwaveChannelStats = {
  channel: BrainwaveChannel;
  min: number;
  max: number;
  mean: number;
  /** 前半平均から後半平均への変化量。測定中の推移を1値で見るための指標。 */
  trend: number;
  sampleCount: number;
};

/** CSV 1本 = 1測定セッション。 */
export type BrainwaveSession = {
  id: string;
  customerId: string;
  /** 元CSVのファイル名。 */
  sourceFileName: string;
  measuredAt: string;
  /** 秒単位の経過時間。0 起点。 */
  timestampsSec: number[];
  series: BrainwaveSeries[];
  /** CSVに存在せず取り込めなかったチャンネル。 */
  missingChannels: BrainwaveChannel[];
  stats: BrainwaveChannelStats[];
  durationSec: number;
  /** 取り込み時の元CSV本文。再解析・エクスポート用に保持する。 */
  rawCsv: string;
  note: string;
};

/**
 * iPad のスクリーンショット。
 * 1枚に2つのグラフが写り、4枚撮ると重複しながら7波形が揃う運用を前提とする。
 */
export type BrainwaveScreenshot = {
  id: string;
  customerId: string;
  title: string;
  src: string;
  /** この画像に写っている波形の種類。取り込み時に自動推定し、後から手動修正できる。 */
  channels: BrainwaveChannel[];
  /** 自動推定の根拠。UIで「なぜこう判定したか」を出すために保持する。 */
  detectionReason: string;
  /** 画素内容から算出した重複判定用ハッシュ。 */
  contentHash: string;
  measuredAt: string;
  uploadedAt: string;
  note: string;
  source: "sample" | "upload";
};
