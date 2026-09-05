import "server-only";
import { getDb } from "@/server/db";
import { deleteMeasurementImages } from "@/server/measurementImageStore";
import type { BrainwaveChannel, ScreenshotScope } from "@/types/brainwave";

/**
 * 来店1回分（visit）と、その中の測定・測定画像の読み書き。保存先は D1。
 *
 * 「本日のセッション」はこれまで端末のブラウザにだけ置いていたため、
 * 端末を替えると消え、各地の施術者が作った記録を中央で見ることもできなかった。
 * ここをサーバー側に移す。画像の実体は R2 にあり、この表は置き場所だけ持つ。
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
  client_id: string;
  visited_on: string;
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
  object_key: string;
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

/** 一番新しい来店を1件返す。D1 が無ければ null、記録が無ければ空の配列。 */
export async function findLatestVisit(clientId: string): Promise<VisitRecord | null> {
  const db = await getDb();
  if (!db) return null;

  const visit = await db
    .prepare(
      "SELECT id, client_id, visited_on FROM visits WHERE client_id = ? ORDER BY visited_on DESC, created_at DESC LIMIT 1",
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
    return { id: visit.id, clientId: visit.client_id, visitedOn: visit.visited_on, measurements: [] };
  }

  // 画像は1回でまとめて引く。測定の件数だけ往復させない。
  const ids = measurements.results.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(", ");
  const images = await db
    .prepare(
      `SELECT id, measurement_id, channels, object_key, content_hash, detection_note,
              title, note, source, uploaded_at
       FROM measurement_images WHERE measurement_id IN (${placeholders})
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
      objectKey: row.object_key,
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
    clientId: visit.client_id,
    visitedOn: visit.visited_on,
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
  visitedOn: string;
  scope: ScreenshotScope;
  measurements: NewMeasurement[];
};

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

  const existing = await db
    .prepare("SELECT id FROM visits WHERE client_id = ? AND visited_on = ? LIMIT 1")
    .bind(input.clientId, input.visitedOn)
    .first<{ id: string }>();

  const visitId = existing?.id ?? crypto.randomUUID();
  const statements: D1PreparedStatement[] = [];

  if (!existing) {
    statements.push(
      db
        .prepare("INSERT INTO visits (id, client_id, operator_id, visited_on) VALUES (?, ?, ?, ?)")
        .bind(visitId, input.clientId, input.operatorId, input.visitedOn),
    );
  }

  // 消す前に、実体を片付けるためのキーを控えておく。
  const staleKeys = await db
    .prepare(
      `SELECT object_key FROM measurement_images
       WHERE measurement_id IN (SELECT id FROM measurements WHERE visit_id = ? AND scope = ?)`,
    )
    .bind(visitId, input.scope)
    .all<{ object_key: string }>();

  // measurement_images は measurements の削除に連なって消える。
  statements.push(
    db.prepare("DELETE FROM measurements WHERE visit_id = ? AND scope = ?").bind(visitId, input.scope),
  );

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
            `INSERT INTO measurement_images
             (id, measurement_id, channels, object_key, content_hash, detection_note,
              title, note, source, uploaded_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            measurementId,
            image.channels.join(","),
            image.objectKey,
            image.contentHash,
            image.detectionNote,
            image.title,
            image.note,
            image.source,
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
    staleKeys.results.map((row) => row.object_key).filter((key) => !keptKeys.has(key)),
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
    .prepare("SELECT id FROM visits WHERE client_id = ? AND visited_on = ? LIMIT 1")
    .bind(clientId, visitedOn)
    .first<{ id: string }>();
  if (!visit) return true;

  const keys = await db
    .prepare(
      `SELECT object_key FROM measurement_images
       WHERE measurement_id IN (SELECT id FROM measurements WHERE visit_id = ? AND scope = ?)`,
    )
    .bind(visit.id, scope)
    .all<{ object_key: string }>();

  await db
    .prepare("DELETE FROM measurements WHERE visit_id = ? AND scope = ?")
    .bind(visit.id, scope)
    .run();
  await deleteMeasurementImages(keys.results.map((row) => row.object_key));
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
    .prepare("SELECT 1 AS found FROM measurement_images WHERE object_key = ? LIMIT 1")
    .bind(objectKey)
    .first<{ found: number }>();
  return Boolean(row);
}
