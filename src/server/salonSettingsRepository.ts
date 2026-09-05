import "server-only";
import { getDb } from "@/server/db";

/**
 * 店舗ごとの運用設定。保存先は D1 の stores。
 *
 * 端末ごとのブラウザに置いていたため、施術者が別の端末を使うと設定が
 * 揃わなかった。多店舗になるとサロン名や保管期間が店ごとにばらつく。
 * 店舗の情報として持つのが正しいので、stores に列として持たせている。
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

type StoreRow = {
  id: string;
  name: string;
  measurement_minutes: number;
  paired_measurement: number;
  retention_months: number;
};

function toSettings(row: StoreRow): SalonSettings {
  return {
    salonName: row.name,
    measurementMinutes: row.measurement_minutes,
    pairedMeasurement: row.paired_measurement === 1,
    retentionMonths: row.retention_months,
  };
}

/**
 * 設定を引く店舗を決める。
 *
 * 施術者が店舗に所属していればその店舗。所属が無い場合（移行の途中や
 * 管理者アカウント）は、開いている店舗のうち最初の1つを使う。
 */
async function resolveStore(db: D1Database, storeId: string): Promise<StoreRow | null> {
  const columns = "id, name, measurement_minutes, paired_measurement, retention_months";
  if (storeId) {
    const row = await db
      .prepare(`SELECT ${columns} FROM stores WHERE id = ?`)
      .bind(storeId)
      .first<StoreRow>();
    if (row) return row;
  }
  return await db
    .prepare(`SELECT ${columns} FROM stores WHERE status = 'active' ORDER BY store_code LIMIT 1`)
    .first<StoreRow>();
}

/** 設定を読む。D1 が無ければ null、店舗がまだ無ければ既定値。 */
export async function getSalonSettings(storeId = ""): Promise<SalonSettings | null> {
  const db = await getDb();
  if (!db) return null;

  const row = await resolveStore(db, storeId);
  return row ? toSettings(row) : DEFAULT_SALON_SETTINGS;
}

/**
 * 設定を書く。
 * 店舗がまだ1つも無い場合は書き込まず、渡された値をそのまま返す。
 * 存在しない店舗を勝手に作ると、店舗コードの採番が崩れるため。
 */
export async function saveSalonSettings(
  settings: SalonSettings,
  storeId = "",
): Promise<SalonSettings | null> {
  const db = await getDb();
  if (!db) return null;

  const row = await resolveStore(db, storeId);
  if (!row) return settings;

  await db
    .prepare(
      `UPDATE stores
       SET name = ?, measurement_minutes = ?, paired_measurement = ?, retention_months = ?
       WHERE id = ?`,
    )
    .bind(
      settings.salonName,
      settings.measurementMinutes,
      settings.pairedMeasurement ? 1 : 0,
      settings.retentionMonths,
      row.id,
    )
    .run();

  return settings;
}
