/**
 * 管理者・施術者アプリの運用設定。
 *
 * ここが持つのは、その端末で決めればよい項目（担当者名、グラフの初期表示）。
 * サロン全体で揃える項目——サロン名・測定の既定値・保管期間——は D1 に置く。
 * 読み書きの入口は useOperatorSettings で、両方をまとめて扱う。
 *
 * 内部配合比率の開示可否はここでは扱わない。表示制御はロール、実データの
 * 取得可否は Supabase の RLS で決まる（`src/lib/disclosure.ts` を参照）。
 */

export type OperatorSettings = {
  /** レポートや同意文面に出すサロン名。 */
  salonName: string;
  /** 施術担当者名。制作記録の作成者欄の既定値。 */
  operatorName: string;
  /** 1回の測定の長さ（分）。取り込み時の既定値になる。 */
  measurementMinutes: number;
  /** 測定を「香り前」「香り後」の2回セットで行う運用かどうか。 */
  pairedMeasurement: boolean;
  /** カルテで5帯域（α〜θ）のグラフを初期表示するか。 */
  showBandsByDefault: boolean;
  /** 取り込んだ測定データを何か月保持するか。個人情報保護法の保管期間の考え方に合わせる。 */
  retentionMonths: number;
};

export const DEFAULT_OPERATOR_SETTINGS: OperatorSettings = {
  salonName: "Selenia",
  operatorName: "",
  measurementMinutes: 1,
  pairedMeasurement: true,
  showBandsByDefault: false,
  retentionMonths: 24,
};

const STORAGE_KEY = "selenia.operatorSettings.v1";

export function loadOperatorSettings(): OperatorSettings {
  if (typeof window === "undefined") return DEFAULT_OPERATOR_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_OPERATOR_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<OperatorSettings>;
    // 保存済みの値にキーが足りなくても既定値で埋める。
    return { ...DEFAULT_OPERATOR_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_OPERATOR_SETTINGS;
  }
}

export function saveOperatorSettings(settings: OperatorSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  snapshotCache = settings;
}

/**
 * localStorage を React の外部ストアとして読むための最小実装。
 *
 * `useSyncExternalStore` はスナップショットが同じ参照であることを前提にするため、
 * 読み取った設定はキャッシュし、別タブでの変更（storage イベント）でのみ破棄する。
 */
let snapshotCache: OperatorSettings | null = null;

export function subscribeOperatorSettings(onChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    snapshotCache = null;
    onChange();
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

export function getOperatorSettingsSnapshot(): OperatorSettings {
  if (!snapshotCache) snapshotCache = loadOperatorSettings();
  return snapshotCache;
}

export function getOperatorSettingsServerSnapshot(): OperatorSettings {
  return DEFAULT_OPERATOR_SETTINGS;
}
