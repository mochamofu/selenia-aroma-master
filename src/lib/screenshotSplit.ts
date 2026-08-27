/**
 * 測定アプリ（FocusCalm ローカル計測）のスクリーンショットから、
 * グラフを1枚ずつ切り出す。
 *
 * 実際の画面構造:
 *   - 背景は水色（明るい）
 *   - グラフは「黒に近いダークカード（角丸）」として並ぶ
 *   - 上部にヘッダー（X / ローカル計測 / 脳アイコン）
 *   - 下部に「脳波データを転送」（白ボタン）と「再計測」（黒ボタン）
 *   - 端末の向きによって、1画面に写る完全なグラフの数が変わる
 *       iPad 横      … 2つ
 *       iPad 縦      … 3つ（＋下端に切れた4つ目）
 *       iPhone 縦    … 2つ
 *
 * したがって「1枚を上下半分に割る」のではなく、
 * **暗いカードを検出して、完全に写っているものだけを取り出す**。
 * 画面に何個写っていても対応できるので、端末の向きを問わない。
 *
 * 手書きの注釈（黄・赤のペン）はシステムの表示ではないため、検出では無視される。
 * カードの上に書かれていてもカードの暗さは保たれるので、判定に影響しない。
 */

export type SplitOptions = {
  /** これより暗い画素を「カードの内側」とみなす輝度のしきい値。 */
  darkLuminance?: number;
  /** 行のうちこの割合以上が暗ければ、その行はカード内とみなす。 */
  darkRowRatio?: number;
  /** 角丸などで途切れた行をつなぐ許容量（画像高さに対する割合）。 */
  bridgeGapRatio?: number;
  /** カードとして扱う最小の高さ（画像高さに対する割合）。 */
  minCardHeightRatio?: number;
  /**
   * いちばん大きいカードに対する高さの比。これ未満は
   * 「下端で切れたカード」や「再計測ボタン」とみなして除外する。
   */
  relativeHeightFloor?: number;
  /** 切り出しに残す余白（ピクセル）。 */
  padding?: number;
};

const DEFAULTS: Required<SplitOptions> = {
  darkLuminance: 100,
  darkRowRatio: 0.5,
  bridgeGapRatio: 0.01,
  minCardHeightRatio: 0.05,
  relativeHeightFloor: 0.5,
  padding: 4,
};

export type GraphPanel = {
  top: number;
  height: number;
  width: number;
  blob: Blob;
  objectUrl: string;
};

export type SplitResult = {
  panels: GraphPanel[];
  /** 完全に写っているカードを1つ以上取り出せたか。 */
  detected: boolean;
  /** 下端で切れていて除外したカードの数。 */
  partialCount: number;
  sourceWidth: number;
  sourceHeight: number;
  warnings: string[];
};

/** その行のうち、暗い画素が占める割合。カード内なら1に近づく。 */
function darkFractionOfRow(
  data: Uint8ClampedArray,
  width: number,
  y: number,
  darkLuminance: number,
): number {
  let dark = 0;
  const base = y * width * 4;
  for (let x = 0; x < width; x += 1) {
    const i = base + x * 4;
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum < darkLuminance) dark += 1;
  }
  return dark / width;
}

/** 指定行で、暗い画素が左右どこからどこまで続いているか。 */
function darkBoundsOfRow(
  data: Uint8ClampedArray,
  width: number,
  y: number,
  darkLuminance: number,
): { left: number; right: number } | null {
  let left = -1;
  let right = -1;
  const base = y * width * 4;
  for (let x = 0; x < width; x += 1) {
    const i = base + x * 4;
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum < darkLuminance) {
      if (left === -1) left = x;
      right = x;
    }
  }
  return left === -1 ? null : { left, right };
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

/**
 * スクリーンショット1枚から、写っているグラフカードをすべて切り出す。
 * 下端で切れているカードは取り込まない（次の撮影で完全な形が入るため）。
 */
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

    // 1) 各行が「カードの内側か」を判定する
    const isCardRow: boolean[] = [];
    for (let y = 0; y < height; y += 1) {
      isCardRow.push(darkFractionOfRow(data, width, y, settings.darkLuminance) >= settings.darkRowRatio);
    }

    // 2) 連続する行をまとめてカード候補にする（角丸の欠けは埋める）
    const bridgeGap = Math.max(2, Math.round(height * settings.bridgeGapRatio));
    const runs: Array<{ start: number; end: number }> = [];
    let start = -1;
    for (let y = 0; y < height; y += 1) {
      if (isCardRow[y] && start === -1) start = y;
      if (!isCardRow[y] && start !== -1) {
        runs.push({ start, end: y });
        start = -1;
      }
    }
    if (start !== -1) runs.push({ start, end: height });

    const merged: Array<{ start: number; end: number }> = [];
    for (const run of runs) {
      const last = merged[merged.length - 1];
      if (last && run.start - last.end <= bridgeGap) last.end = run.end;
      else merged.push({ ...run });
    }

    const minHeight = Math.max(24, Math.round(height * settings.minCardHeightRatio));
    const candidates = merged.filter((run) => run.end - run.start >= minHeight);

    if (candidates.length === 0) {
      warnings.push(
        "グラフのカードが見つかりませんでした。測定結果の画面が写っているか確認してください。",
      );
      return { panels: [], detected: false, partialCount: 0, sourceWidth: width, sourceHeight: height, warnings };
    }

    // 3) いちばん大きいカードを基準に、明らかに低いものを落とす。
    //    「再計測」ボタン（黒くて短い）と、下端で切れたカードがここで外れる。
    const maxHeight = Math.max(...candidates.map((run) => run.end - run.start));
    const floor = maxHeight * settings.relativeHeightFloor;
    const complete = candidates.filter((run) => run.end - run.start >= floor);
    const partialCount = candidates.length - complete.length;

    // 4) カードごとに左右の端を求めて切り出す
    const panels: GraphPanel[] = [];
    for (const run of complete) {
      const probeY = Math.floor((run.start + run.end) / 2);
      const bounds = darkBoundsOfRow(data, width, probeY, settings.darkLuminance);
      if (!bounds) continue;

      const rect = {
        left: Math.max(0, bounds.left - settings.padding),
        right: Math.min(width, bounds.right + 1 + settings.padding),
        top: Math.max(0, run.start - settings.padding),
        bottom: Math.min(height, run.end + settings.padding),
      };

      const blob = await cropToBlob(bitmap, rect);
      panels.push({
        top: rect.top,
        height: rect.bottom - rect.top,
        width: rect.right - rect.left,
        blob,
        objectUrl: URL.createObjectURL(blob),
      });
    }

    if (partialCount > 0) {
      warnings.push(
        `下端で切れているグラフを ${partialCount}件 除外しました（次の撮影で完全な形を取り込みます）。`,
      );
    }

    return {
      panels,
      detected: panels.length > 0,
      partialCount,
      sourceWidth: width,
      sourceHeight: height,
      warnings,
    };
  } finally {
    bitmap.close();
  }
}
