import "server-only";
import { getDb } from "@/server/db";

/**
 * 禁忌・注意事項の読み書き。保存先は D1。
 *
 * 妊娠中・授乳中・既往症など、施術の可否に直結する内容を持つ。端末の中に
 * しか無いと、別の端末や別の講師が担当したときに見落とす。見落として困る
 * 種類の情報なので、記録は必ずサーバー側に残す。
 *
 * 見出し（label）は1人につき重複させない。同じ注意が二重に並ぶと、
 * 一覧で確認するときに数え違いのもとになる。
 */

export type SafetyNote = {
  id: string;
  label: string;
  severity: string;
  guidance: string;
};

type NoteRow = {
  id: string;
  label: string;
  severity: string;
  guidance: string;
};

/** 1人分の注意事項を返す。D1 が無ければ null。 */
export async function listSafetyNotes(clientId: string): Promise<SafetyNote[] | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .prepare(
      "SELECT id, label, severity, guidance FROM client_safety_notes WHERE client_id = ? ORDER BY created_at",
    )
    .bind(clientId)
    .all<NoteRow>();
  return rows.results;
}

export type NewSafetyNote = {
  clientId: string;
  label: string;
  severity: string;
  guidance: string;
};

/**
 * 注意事項を1件足す。同じ見出しがすでにあれば足さずに現状を返す。
 * 追加できたかどうかは、呼び出し側が件数の変化で判断できる。
 */
export async function addSafetyNote(input: NewSafetyNote): Promise<SafetyNote[] | null> {
  const db = await getDb();
  if (!db) return null;

  const existing = await db
    .prepare("SELECT id FROM client_safety_notes WHERE client_id = ? AND label = ? LIMIT 1")
    .bind(input.clientId, input.label)
    .first<{ id: string }>();

  if (!existing) {
    await db
      .prepare(
        "INSERT INTO client_safety_notes (id, client_id, label, severity, guidance) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(crypto.randomUUID(), input.clientId, input.label, input.severity, input.guidance)
      .run();
  }

  return await listSafetyNotes(input.clientId);
}

/** 注意事項を見出しで1件外す。 */
export async function removeSafetyNote(
  clientId: string,
  label: string,
): Promise<SafetyNote[] | null> {
  const db = await getDb();
  if (!db) return null;

  await db
    .prepare("DELETE FROM client_safety_notes WHERE client_id = ? AND label = ?")
    .bind(clientId, label)
    .run();
  return await listSafetyNotes(clientId);
}
