import "server-only";
import { getDb } from "@/server/db";

/**
 * サロン共通の設定。保存先は D1。
 *
 * 端末ごとのブラウザに置いていたため、施術者が別の端末を使うと設定が
 * 揃わなかった。多店舗になるとサロン名や保管期間が店ごとにばらつく。
 * 全員で揃えるべき項目だけをここに置く。
 *
 * 担当者名やグラフの初期表示など、その端末で決めればよいものは
 * これまでどおりブラウザ側に残す（operatorSettings）。
 */

export type SalonSettings = {
  salonName: string;
  measurementMinutes: number;
  pairedMeasurement: boolean;
  retentionMonths: number;
};

export const DEFAULT_SALON_SETTINGS: SalonSettings = {
  salonName: "Selenia",
  measurementMinutes: 1,
  pairedMeasurement: true,
  retentionMonths: 24,
};

type SettingsRow = {
  salon_name: string;
  measurement_minutes: number;
  paired_measurement: number;
  retention_months: number;
};

/** サロン設定を読む。D1 が無ければ null、まだ保存が無ければ既定値。 */
export async function getSalonSettings(): Promise<SalonSettings | null> {
  const db = await getDb();
  if (!db) return null;

  const row = await db
    .prepare(
      "SELECT salon_name, measurement_minutes, paired_measurement, retention_months FROM salon_settings WHERE id = 1",
    )
    .first<SettingsRow>();
  if (!row) return DEFAULT_SALON_SETTINGS;

  return {
    salonName: row.salon_name,
    measurementMinutes: row.measurement_minutes,
    pairedMeasurement: row.paired_measurement === 1,
    retentionMonths: row.retention_months,
  };
}

/** サロン設定を書く。1行しか持たないので、あれば更新・無ければ作成する。 */
export async function saveSalonSettings(settings: SalonSettings): Promise<SalonSettings | null> {
  const db = await getDb();
  if (!db) return null;

  await db
    .prepare(
      `INSERT INTO salon_settings
         (id, salon_name, measurement_minutes, paired_measurement, retention_months, updated_at)
       VALUES (1, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         salon_name = excluded.salon_name,
         measurement_minutes = excluded.measurement_minutes,
         paired_measurement = excluded.paired_measurement,
         retention_months = excluded.retention_months,
         updated_at = excluded.updated_at`,
    )
    .bind(
      settings.salonName,
      settings.measurementMinutes,
      settings.pairedMeasurement ? 1 : 0,
      settings.retentionMonths,
    )
    .run();

  return settings;
}
