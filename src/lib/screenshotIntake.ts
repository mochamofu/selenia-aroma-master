import { BRAINWAVE_CHANNELS, type BrainwaveChannel } from "@/types/brainwave";

/**
 * iPad から取り込んだ測定スクリーンショットの重複除去と波形種別の推定。
 *
 * 運用前提: 1画面に2グラフが写り、4枚撮ると重複を含みながら7波形が揃う。
 * そのため「同じグラフが2回入ってくる」ことを前提に重複判定を行う。
 *
 * 種別の判定は、画像内の文字を読む OCR ではなく
 * (1) ファイル名 (2) 操作者の手動指定 で決まる。
 * 画素からの自動ラベル付けは行わないので、推定結果は必ず UI 上で確認・修正できるようにすること。
 */

/** 知覚ハッシュのグリッド幅。16x16 = 256bit 相当を16進文字列で持つ。 */
const HASH_GRID = 16;

/** 同一グラフとみなすハミング距離のしきい値（256bit中）。 */
const DUPLICATE_DISTANCE_THRESHOLD = 12;

export type ScreenshotAnalysis = {
  /** 知覚ハッシュ（16進文字列）。近い画像同士は距離が小さくなる。 */
  contentHash: string;
  /** ファイル名から推定した波形種別。確定値ではない。 */
  guessedChannels: BrainwaveChannel[];
  detectionReason: string;
};

const FILENAME_HINTS: Record<BrainwaveChannel, string[]> = {
  relax: ["relax", "calm", "リラックス", "沈静", "鎮静"],
  focus: ["focus", "attention", "concentrat", "集中"],
  alpha: ["alpha", "アルファ", "α"],
  beta: ["beta", "ベータ", "β"],
  gamma: ["gamma", "ガンマ", "γ"],
  delta: ["delta", "デルタ", "δ"],
  theta: ["theta", "シータ", "セータ", "θ"],
};

/**
 * 画像を 16x16 グレースケールへ縮小し、平均輝度との大小で 1bit ずつに落とす（average hash）。
 * 同じグラフを別タイミングで撮ったスクショでも近い値になるため、重複判定に使える。
 */
export async function computePerceptualHash(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = HASH_GRID;
    canvas.height = HASH_GRID;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("canvas 2d context を取得できませんでした。");

    context.drawImage(bitmap, 0, 0, HASH_GRID, HASH_GRID);
    const { data } = context.getImageData(0, 0, HASH_GRID, HASH_GRID);

    const luminance: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      luminance.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    const average = luminance.reduce((sum, value) => sum + value, 0) / luminance.length;

    let hash = "";
    for (let i = 0; i < luminance.length; i += 4) {
      let nibble = 0;
      for (let bit = 0; bit < 4; bit += 1) {
        if ((luminance[i + bit] ?? 0) > average) nibble |= 1 << (3 - bit);
      }
      hash += nibble.toString(16);
    }
    return hash;
  } finally {
    bitmap.close();
  }
}

const HEX_BIT_COUNT = Array.from({ length: 16 }, (_, value) =>
  value.toString(2).split("").reduce((sum, bit) => sum + Number(bit), 0),
);

/** 2つの知覚ハッシュのハミング距離。長さが違う場合は比較不能として最大値を返す。 */
export function hashDistance(a: string, b: string): number {
  if (a.length !== b.length) return Number.MAX_SAFE_INTEGER;
  let distance = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    distance += HEX_BIT_COUNT[diff];
  }
  return distance;
}

export function isDuplicateHash(hash: string, existingHashes: string[]): boolean {
  return existingHashes.some((existing) => hashDistance(hash, existing) <= DUPLICATE_DISTANCE_THRESHOLD);
}

/** ファイル名から波形種別を推定する。判定できない場合は空配列を返す。 */
export function guessChannelsFromFileName(fileName: string): BrainwaveChannel[] {
  const normalized = fileName.toLowerCase();
  return BRAINWAVE_CHANNELS.filter((channel) =>
    FILENAME_HINTS[channel].some((hint) => normalized.includes(hint.toLowerCase())),
  );
}

export async function analyzeScreenshot(file: File): Promise<ScreenshotAnalysis> {
  const contentHash = await computePerceptualHash(file);
  const guessedChannels = guessChannelsFromFileName(file.name);

  return {
    contentHash,
    guessedChannels,
    detectionReason: guessedChannels.length
      ? `ファイル名から推定: ${guessedChannels.join(", ")}`
      : "ファイル名から判定できませんでした。波形の種類を手動で指定してください。",
  };
}

export type ScreenshotIntakeResult = {
  accepted: Array<{ file: File; analysis: ScreenshotAnalysis }>;
  /** 既存画像または同一バッチ内の別画像と重複したもの。 */
  duplicates: Array<{ file: File; analysis: ScreenshotAnalysis }>;
  failures: Array<{ file: File; message: string }>;
};

/**
 * 複数枚のスクリーンショットを一括で受け取り、重複を除いて取り込み候補を返す。
 * 4枚撮りで1枚分が重複する運用を想定している。
 */
export async function intakeScreenshots(
  files: File[],
  existingHashes: string[],
): Promise<ScreenshotIntakeResult> {
  const result: ScreenshotIntakeResult = { accepted: [], duplicates: [], failures: [] };
  const seenHashes = [...existingHashes];

  for (const file of files) {
    try {
      const analysis = await analyzeScreenshot(file);
      if (isDuplicateHash(analysis.contentHash, seenHashes)) {
        result.duplicates.push({ file, analysis });
        continue;
      }
      seenHashes.push(analysis.contentHash);
      result.accepted.push({ file, analysis });
    } catch (error) {
      result.failures.push({
        file,
        message: error instanceof Error ? error.message : "画像を解析できませんでした。",
      });
    }
  }

  return result;
}

/** 取り込み済み画像全体で、7波形のうちどれがまだ割り当てられていないかを返す。 */
export function findUncoveredChannels(assigned: BrainwaveChannel[][]): BrainwaveChannel[] {
  const covered = new Set(assigned.flat());
  return BRAINWAVE_CHANNELS.filter((channel) => !covered.has(channel));
}
