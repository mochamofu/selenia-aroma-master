import "server-only";
import { getDb } from "@/server/db";
import { deleteMeasurementImages } from "@/server/measurementImageStore";
import type { BrainwaveChannel, ScreenshotScope } from "@/types/brainwave";

/**
 * 来店1回分（visit）と、その中の測定・測定画像の読み書き。保存先は D1。
 *
 * 「本日のセッション」はこれまで端末のブラウザにだけ置いていたため、
 * 端末を替えると消え、各地の施術者が作った記録を中央で見ることもできなかった。
 *
 * 表の対応:
 *   visits            来店。店舗と担当者を持つ
 *   measurements      1回の測定。リラックス度と集中度の2枚をまとめる
 *   brainwave_images  画像1枚。実体は R2 にあり、r2_key で参照する
 */

export type MeasurementImageRecord = {
  id: string;
  channels: BrainwaveChannel[];
  objectKey: string;
  contentHash: string;
  detectionNote: string;
  title: string;
  note: string;
  source: "sample" | "upload";
  uploadedAt: string;
};

export type MeasurementRecord = {
  id: string;
  scope: ScreenshotScope;
  trialNo: number;
  trialLabel: string;
  measuredAt: string;
  images: MeasurementImageRecord[];
};

export type VisitRecord = {
  id: string;
  clientId: string;
  visitedOn: string;
  measurements: MeasurementRecord[];
};

type VisitRow = {
  id: string;
  user_id: string;
  visited_at: string;
};

type MeasurementRow = {
  id: string;
  scope: string;
  trial_no: number;
  trial_label: string;
  measured_at: string;
};

type ImageRow = {
  id: string;
  measurement_id: string;
  channels: string;
  r2_key: string;
  content_hash: string;
  detection_note: string;
  title: string;
  note: string;
  source: string;
  uploaded_at: string;
};

/** チャンネルはカンマ区切りで1列に入れている。読むときにここで戻す。 */
function parseChannels(value: string): BrainwaveChannel[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0) as BrainwaveChannel[];
}

/** 来店日は日付だけで扱う。visited_at は時刻まで持つため、頭の10文字を使う。 */
function toDay(value: string): string {
  return value.slice(0, 10);
}

/** 一番新しい来店を1件返す。D1 が無ければ null、記録が無ければ null。 */
export async function findLatestVisit(clientId: string): Promise<VisitRecord | null> {
  const db = await getDb();
  if (!db) return null;

  const visit = await db
    .prepare(
      "SELECT id, user_id, visited_at FROM visits WHERE user_id = ? ORDER BY visited_at DESC, created_at DESC LIMIT 1",
    )
    .bind(clientId)
    .first<VisitRow>();
  if (!visit) return null;

  const measurements = await db
    .prepare(
      `SELECT id, scope, trial_no, trial_label, measured_at FROM measurements
       WHERE visit_id = ? ORDER BY scope, trial_no`,
    )
    .bind(visit.id)
    .all<MeasurementRow>();

  if (!measurements.results.length) {
    return { id: visit.id, clientId: visit.user_id, visitedOn: toDay(visit.visited_at), measurements: [] };
  }

  // 画像は1回でまとめて引く。測定の件数だけ往復させない。
  const ids = measurements.results.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(", ");
  const images = await db
    .prepare(
      `SELECT id, measurement_id, channels, r2_key, content_hash, detection_note,
              title, note, source, uploaded_at
       FROM brainwave_images WHERE measurement_id IN (${placeholders})
       ORDER BY created_at`,
    )
    .bind(...ids)
    .all<ImageRow>();

  const imagesByMeasurement = new Map<string, MeasurementImageRecord[]>();
  for (const row of images.results) {
    const list = imagesByMeasurement.get(row.measurement_id) ?? [];
    list.push({
      id: row.id,
      channels: parseChannels(row.channels),
      objectKey: row.r2_key,
      contentHash: row.content_hash,
      detectionNote: row.detection_note,
      title: row.title,
      note: row.note,
      source: row.source === "sample" ? "sample" : "upload",
      uploadedAt: row.uploaded_at,
    });
    imagesByMeasurement.set(row.measurement_id, list);
  }

  return {
    id: visit.id,
    clientId: visit.user_id,
    visitedOn: toDay(visit.visited_at),
    measurements: measurements.results.map((row) => ({
      id: row.id,
      scope: row.scope === "decided" ? "decided" : "trial",
      trialNo: row.trial_no,
      trialLabel: row.trial_label,
      measuredAt: row.measured_at,
      images: imagesByMeasurement.get(row.id) ?? [],
    })),
  };
}

export type NewMeasurementImage = {
  channels: BrainwaveChannel[];
  objectKey: string;
  contentHash: string;
  detectionNote: string;
  title: string;
  note: string;
  source: "sample" | "upload";
  uploadedAt: string;
};

export type NewMeasurement = {
  scope: ScreenshotScope;
  trialNo: number;
  trialLabel: string;
  measuredAt: string;
  images: NewMeasurementImage[];
};

export type SaveVisitInput = {
  clientId: string;
  operatorId: string;
  storeId: string;
  visitedOn: string;
  scope: ScreenshotScope;
  measurements: NewMeasurement[];
};

/** 来店を引く。その日の記録がまだ無ければ作る。 */
async function findOrCreateVisit(db: D1Database, input: SaveVisitInput): Promise<string | null> {
  const existing = await db
    .prepare("SELECT id FROM visits WHERE user_id = ? AND date(visited_at) = ? LIMIT 1")
    .bind(input.clientId, input.visitedOn)
    .first<{ id: string }>();
  if (existing) return existing.id;

  // 来店は店舗に属する。所属が決まらない場合は、開いている店舗の最初の1つ。
  const store = input.storeId
    ? { id: input.storeId }
    : await db
        .prepare("SELECT id FROM stores WHERE status = 'active' ORDER BY store_code LIMIT 1")
        .first<{ id: string }>();
  if (!store) return null;

  const visitId = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO visits (id, store_id, user_id, staff_user_id, visited_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(visitId, store.id, input.clientId, input.operatorId, input.visitedOn)
    .run();
  return visitId;
}

/**
 * その日の測定を、指定した区分（本日の試作／決定した組み合わせ）ごと入れ替える。
 *
 * 途中の回だけを消したり足したりを追いかけると、画面と記録がずれたときに
 * どちらが正しいか分からなくなる。区分まるごとを今の内容で置き換える。
 * 使われなくなった画像の実体は R2 からも消す。
 */
export async function saveVisitMeasurements(input: SaveVisitInput): Promise<VisitRecord | null> {
  const db = await getDb();
  if (!db) return null;

  const visitId = await findOrCreateVisit(db, input);
  // 店舗が1つも無いと来店を記録できない。画面側は端末内の保存へ落ちる。
  if (!visitId) return null;

  // 消す前に、実体を片付けるためのキーを控えておく。
  const staleKeys = await db
    .prepare(
      `SELECT r2_key FROM brainwave_images
       WHERE measurement_id IN (SELECT id FROM measurements WHERE visit_id = ? AND scope = ?)`,
    )
    .bind(visitId, input.scope)
    .all<{ r2_key: string }>();

  const statements: D1PreparedStatement[] = [
    // brainwave_images は measurements の削除に連なって消える。
    db.prepare("DELETE FROM measurements WHERE visit_id = ? AND scope = ?").bind(visitId, input.scope),
  ];

  for (const measurement of input.measurements) {
    const measurementId = crypto.randomUUID();
    statements.push(
      db
        .prepare(
          `INSERT INTO measurements (id, visit_id, scope, trial_no, trial_label, measured_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          measurementId,
          visitId,
          measurement.scope,
          measurement.trialNo,
          measurement.trialLabel,
          measurement.measuredAt,
        ),
      ...measurement.images.map((image) =>
        db
          .prepare(
            `INSERT INTO brainwave_images
             (id, user_id, measurement_id, channels, r2_key, content_hash, detection_note,
              title, note, source, measured_at, uploaded_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            input.clientId,
            measurementId,
            image.channels.join(","),
            image.objectKey,
            image.contentHash,
            image.detectionNote,
            image.title,
            image.note,
            image.source,
            measurement.measuredAt,
            image.uploadedAt,
          ),
      ),
    );
  }

  // 入れ替えの途中で落ちて、記録が欠けた状態にならないようまとめて実行する。
  await db.batch(statements);

  // 引き続き使われているキーは消さない。同じ画像を保存し直した場合に備える。
  const keptKeys = new Set(
    input.measurements.flatMap((measurement) => measurement.images.map((image) => image.objectKey)),
  );
  await deleteMeasurementImages(
    staleKeys.results.map((row) => row.r2_key).filter((key) => !keptKeys.has(key)),
  );

  return await findLatestVisit(input.clientId);
}

/** その日の測定を区分ごと削除する。画像の実体も残さない。 */
export async function deleteVisitMeasurements(
  clientId: string,
  visitedOn: string,
  scope: ScreenshotScope,
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const visit = await db
    .prepare("SELECT id FROM visits WHERE user_id = ? AND date(visited_at) = ? LIMIT 1")
    .bind(clientId, visitedOn)
    .first<{ id: string }>();
  if (!visit) return true;

  const keys = await db
    .prepare(
      `SELECT r2_key FROM brainwave_images
       WHERE measurement_id IN (SELECT id FROM measurements WHERE visit_id = ? AND scope = ?)`,
    )
    .bind(visit.id, scope)
    .all<{ r2_key: string }>();

  await db
    .prepare("DELETE FROM measurements WHERE visit_id = ? AND scope = ?")
    .bind(visit.id, scope)
    .run();
  await deleteMeasurementImages(keys.results.map((row) => row.r2_key));
  return true;
}

/**
 * その置き場所が、カルテに登録済みの画像かどうか。
 *
 * 画像の取得URLにはオブジェクトキーが現れる。キーを組み立て直して
 * 無関係なものまで引けないよう、配信する前にここで確かめる。
 */
export async function isRegisteredImageKey(objectKey: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const row = await db
    .prepare("SELECT 1 AS found FROM brainwave_images WHERE r2_key = ? LIMIT 1")
    .bind(objectKey)
    .first<{ found: number }>();
  return Boolean(row);
}
