/**
 * iPad の測定スクリーンショットから、グラフを1枚ずつ切り出す。
 *
 * 運用: 1画面に2つのグラフが縦に並ぶ。7波形あるので4回撮影し、
 * 合計8枚のグラフのうち1枚が重複する。
 *
 * ここでやること:
 *   1枚のスクリーンショット → 上下2つのグラフ画像へ分割 → 余白を切り落とす
 *
 * 「画像を50%で割る」方式は、アプリのヘッダーがあったり下部に大きな余白が
 * あると位置がずれる。代わりに、模様のあるかたまり（グラフ）を直接検出し、
 * インク量の多い上位2つをグラフとして取り出す。
 * 2つ見つからない場合は、その旨を warnings で返す。
 */

export type SplitOptions = {
  /**
   * 行が「背景」かどうかの判定に使う輝度の標準偏差のしきい値。
   * これ以下なら、その行にはグラフの線が無いとみなす。
   */
  backgroundStdDev?: number;
  /** かたまりを連結する隙間の許容量（画像高さに対する割合）。 */
  bridgeGapRatio?: number;
  /** 切り出し後に残す余白（ピクセル）。 */
  padding?: number;
  /** 切り出した画像の最小の高さ。これ未満なら分割失敗とみなす。 */
  minPanelHeight?: number;
};

const DEFAULTS: Required<SplitOptions> = {
  backgroundStdDev: 4,
  bridgeGapRatio: 0.04,
  padding: 6,
  minPanelHeight: 60,
};

export type GraphPanel = {
  /** 元画像内での位置。UIで分割位置を見せるために持つ。 */
  top: number;
  height: number;
  blob: Blob;
  objectUrl: string;
  width: number;
};

export type SplitResult = {
  panels: GraphPanel[];
  /** グラフのかたまりを2つ検出できたか。 */
  detected: boolean;
  sourceWidth: number;
  sourceHeight: number;
  /** UIに出す注意書き。 */
  warnings: string[];
};

/** 1行分の輝度の標準偏差。グラフの線がある行ほど大きくなる。 */
function rowStdDev(data: Uint8ClampedArray, width: number, y: number): number {
  let sum = 0;
  let sumSq = 0;
  const base = y * width * 4;
  for (let x = 0; x < width; x += 1) {
    const i = base + x * 4;
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += lum;
    sumSq += lum * lum;
  }
  const mean = sum / width;
  return Math.sqrt(Math.max(0, sumSq / width - mean * mean));
}

function columnStdDev(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  top: number,
  bottom: number,
): number {
  let sum = 0;
  let sumSq = 0;
  const count = bottom - top;
  for (let y = top; y < bottom; y += 1) {
    const i = (y * width + x) * 4;
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += lum;
    sumSq += lum * lum;
  }
  const mean = sum / count;
  return Math.sqrt(Math.max(0, sumSq / count - mean * mean));
}

/**
 * 模様がある行の連続区間（＝コンテンツのかたまり）を列挙する。
 *
 * 「中央で半分に割る」方式は、ヘッダーがあったり下部に大きな余白があると
 * 割る位置がずれる。グラフのかたまりを直接見つけるほうが確実なので、
 * こちらを採用している。
 *
 * グラフのタイトルと波形の間の細い余白で分断されないよう、
 * `bridgeGap` 行までの隙間はつないで1つのかたまりとして扱う。
 */
function findContentBlocks(
  rowScores: number[],
  threshold: number,
  bridgeGap: number,
  minHeight: number,
): Array<{ start: number; end: number; ink: number }> {
  const raw: Array<{ start: number; end: number }> = [];
  let start = -1;
  for (let y = 0; y < rowScores.length; y += 1) {
    const hasContent = rowScores[y] > threshold;
    if (hasContent && start === -1) start = y;
    if (!hasContent && start !== -1) {
      raw.push({ start, end: y });
      start = -1;
    }
  }
  if (start !== -1) raw.push({ start, end: rowScores.length });

  const merged: Array<{ start: number; end: number }> = [];
  for (const run of raw) {
    const last = merged[merged.length - 1];
    if (last && run.start - last.end <= bridgeGap) last.end = run.end;
    else merged.push({ ...run });
  }

  return merged
    .filter((block) => block.end - block.start >= minHeight)
    .map((block) => {
      let ink = 0;
      for (let y = block.start; y < block.end; y += 1) ink += rowScores[y];
      return { ...block, ink };
    });
}

/**
 * 指定範囲の中で、実際に模様がある領域の外接矩形を求める。
 * グラフの周りの余白を落とすために使う。
 */
function findContentBounds(
  data: Uint8ClampedArray,
  width: number,
  regionTop: number,
  regionBottom: number,
  options: Required<SplitOptions>,
): { top: number; bottom: number; left: number; right: number } | null {
  let top = -1;
  let bottom = -1;
  for (let y = regionTop; y < regionBottom; y += 1) {
    if (rowStdDev(data, width, y) > options.backgroundStdDev) {
      if (top === -1) top = y;
      bottom = y;
    }
  }
  if (top === -1) return null;

  let left = -1;
  let right = -1;
  for (let x = 0; x < width; x += 1) {
    if (columnStdDev(data, width, x, top, bottom + 1) > options.backgroundStdDev) {
      if (left === -1) left = x;
      right = x;
    }
  }
  if (left === -1) return null;

  return {
    top: Math.max(regionTop, top - options.padding),
    bottom: Math.min(regionBottom, bottom + options.padding + 1),
    left: Math.max(0, left - options.padding),
    right: Math.min(width, right + options.padding + 1),
  };
}

function cropToBlob(
  source: ImageBitmap,
  rect: { left: number; top: number; right: number; bottom: number },
): Promise<Blob> {
  const width = rect.right - rect.left;
  const height = rect.bottom - rect.top;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas 2d context を取得できませんでした。");
  context.drawImage(source, rect.left, rect.top, width, height, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("切り出した画像を書き出せませんでした。"));
    }, "image/png");
  });
}

/** スクリーンショット1枚から、写っている2つのグラフを切り出す。 */
export async function splitScreenshotIntoGraphs(
  file: Blob,
  options: SplitOptions = {},
): Promise<SplitResult> {
  const settings = { ...DEFAULTS, ...options };
  const bitmap = await createImageBitmap(file);
  const warnings: string[] = [];

  try {
    const { width, height } = bitmap;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("canvas 2d context を取得できませんでした。");
    context.drawImage(bitmap, 0, 0);
    const { data } = context.getImageData(0, 0, width, height);

    const rowScores: number[] = [];
    for (let y = 0; y < height; y += 1) rowScores.push(rowStdDev(data, width, y));

    const bridgeGap = Math.max(4, Math.round(height * settings.bridgeGapRatio));
    const blocks = findContentBlocks(
      rowScores,
      settings.backgroundStdDev,
      bridgeGap,
      settings.minPanelHeight,
    );

    // インク量の多い順に2つ取り、元の縦位置の順に並べ直す。
    // アプリのヘッダーやタブバーは細くインクも少ないので、ここで自然に落ちる。
    const graphBlocks = [...blocks]
      .sort((a, b) => b.ink - a.ink)
      .slice(0, 2)
      .sort((a, b) => a.start - b.start);

    const detected = graphBlocks.length === 2;
    if (blocks.length === 0) {
      warnings.push("グラフらしい領域が見つかりませんでした。取り込みをスキップしました。");
    } else if (!detected) {
      warnings.push(
        `グラフを${graphBlocks.length}つしか検出できませんでした。1画面に2つ写っているか確認してください。`,
      );
    }

    const panels: GraphPanel[] = [];
    for (const block of graphBlocks) {
      const bounds = findContentBounds(data, width, block.start, block.end, settings);
      if (!bounds) continue;
      const blob = await cropToBlob(bitmap, bounds);
      panels.push({
        top: bounds.top,
        height: bounds.bottom - bounds.top,
        width: bounds.right - bounds.left,
        blob,
        objectUrl: URL.createObjectURL(blob),
      });
    }

    return { panels, detected, sourceWidth: width, sourceHeight: height, warnings };
  } finally {
    bitmap.close();
  }
}
