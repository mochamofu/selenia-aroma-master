import { BRAINWAVE_CHANNELS, type BrainwaveChannel } from "@/types/brainwave";
import { splitScreenshotIntoGraphs, type GraphPanel } from "@/lib/screenshotSplit";

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

/**
 * 知覚ハッシュのグリッド幅。差分ハッシュなので (GRID+1) 列を読んで GRID 列分の
 * 大小関係を得る。32x32 = 1024bit。
 */
const HASH_GRID = 32;

/**
 * 同一グラフとみなすハミング距離のしきい値（1024bit中）。
 *
 * ここは意図的にかなり厳しくしている。除外したいのは「4枚撮りで必ず生じる
 * 完全重複の1枚」だけであり、波形が違うだけの別グラフを消してはいけない。
 * 平均ハッシュ（aHash）だと白背景が支配的なグラフ同士がほぼ同じ値になり、
 * 別の波形まで重複と誤判定したため、勾配を見る差分ハッシュ（dHash）に変更した。
 */
const DUPLICATE_DISTANCE_THRESHOLD = 8;

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
 * 画像を縮小し、横に隣り合う画素の大小関係を 1bit ずつ並べる（difference hash）。
 * 同じグラフなら一致し、波形が違えば大きく変わる。
 */
export async function computePerceptualHash(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = HASH_GRID + 1;
    canvas.height = HASH_GRID;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("canvas 2d context を取得できませんでした。");

    context.drawImage(bitmap, 0, 0, HASH_GRID + 1, HASH_GRID);
    const { data } = context.getImageData(0, 0, HASH_GRID + 1, HASH_GRID);

    const luminanceAt = (x: number, y: number) => {
      const i = (y * (HASH_GRID + 1) + x) * 4;
      return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    };

    // 隣り合う画素の大小関係を1bitずつ並べる（差分ハッシュ）。
    // 背景の明るさではなく形の変化を見るので、白地のグラフでも差が出る。
    const bits: number[] = [];
    for (let y = 0; y < HASH_GRID; y += 1) {
      for (let x = 0; x < HASH_GRID; x += 1) {
        bits.push(luminanceAt(x, y) > luminanceAt(x + 1, y) ? 1 : 0);
      }
    }

    let hash = "";
    for (let i = 0; i < bits.length; i += 4) {
      const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
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


/**
 * 4枚のスクリーンショットを、グラフ1枚ずつの画像へ切り分けて取り込む。
 *
 * 1枚に2グラフ入るので 4枚 → 8枚のグラフになり、そのうち1枚が重複する。
 * 重複を落として7枚にするところまでをここで行う。
 */
export type PanelIntakeItem = {
  panel: GraphPanel;
  /** 元になったスクリーンショットのファイル名。 */
  sourceFileName: string;
  /** 元画像の中で上半分か下半分か。撮影順の割り当てに使う。 */
  positionInSource: "上" | "下";
  contentHash: string;
  guessedChannels: BrainwaveChannel[];
  detectionReason: string;
};

export type PanelIntakeResult = {
  accepted: PanelIntakeItem[];
  /** 完全に同じグラフとして除外したもの。 */
  duplicates: PanelIntakeItem[];
  failures: Array<{ fileName: string; message: string }>;
  /** 分割時の注意書き（境目を自動検出できなかった等）。 */
  warnings: string[];
};

export async function intakeScreenshotPanels(
  files: File[],
  existingHashes: string[],
): Promise<PanelIntakeResult> {
  const result: PanelIntakeResult = { accepted: [], duplicates: [], failures: [], warnings: [] };
  const seenHashes = [...existingHashes];

  for (const file of files) {
    try {
      const split = await splitScreenshotIntoGraphs(file);
      result.warnings.push(...split.warnings.map((w) => `${file.name}: ${w}`));

      const guessed = guessChannelsFromFileName(file.name);

      for (const [index, panel] of split.panels.entries()) {
        const contentHash = await computePerceptualHash(panel.blob);
        const positionInSource = index === 0 ? "上" : "下";

        // ファイル名から2つ拾えていれば、上下の順で1つずつ割り当てる
        const guessedChannels = guessed.length === split.panels.length ? [guessed[index]] : [];

        const item: PanelIntakeItem = {
          panel,
          sourceFileName: file.name,
          positionInSource,
          contentHash,
          guessedChannels,
          detectionReason: guessedChannels.length
            ? `ファイル名と並び順から推定: ${guessedChannels.join(", ")}`
            : "波形の種類を指定してください",
        };

        if (isDuplicateHash(contentHash, seenHashes)) {
          // 4枚撮りで必ず1枚重複するので、これは想定内の除外
          URL.revokeObjectURL(panel.objectUrl);
          result.duplicates.push(item);
          continue;
        }
        seenHashes.push(contentHash);
        result.accepted.push(item);
      }
    } catch (error) {
      result.failures.push({
        fileName: file.name,
        message: error instanceof Error ? error.message : "画像を切り分けられませんでした。",
      });
    }
  }

  return result;
}

/**
 * 撮影順に7波形を割り当てる。
 * 機器の表示順が固定なら、これで7枚まとめてラベル付けできる。
 */
export const CAPTURE_ORDER: BrainwaveChannel[] = [
  "relax",
  "focus",
  "alpha",
  "beta",
  "gamma",
  "delta",
  "theta",
];
