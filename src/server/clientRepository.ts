import "server-only";
import { getDb } from "@/server/db";
import type { ClientGender, OperatorClient } from "@/data/operatorClients";

/**
 * 利用者の読み書き。保存先は D1。
 *
 * 画面が扱う形（OperatorClient）は変えず、ここで行と相互変換する。
 * こうしておくと、保存先が変わっても画面側を触らずに済む。
 */

type ClientRow = {
  id: string;
  client_number: string;
  name: string;
  name_kana: string;
  gender: string;
  birthday: string;
  occupation: string;
  first_visit_at: string;
  last_visit_at: string;
  note: string;
};

function toGender(value: string): ClientGender {
  if (value === "女性" || value === "男性") return value;
  return "回答なし";
}

function toClient(row: ClientRow, safetyNotes: string[], counts: ClientCounts): OperatorClient {
  return {
    id: row.id,
    clientNumber: row.client_number,
    // 認証ユーザーとの紐づけは、利用者向けアプリを繋ぐ段階で持たせる。
    userId: row.id,
    name: row.name,
    nameKana: row.name_kana,
    gender: toGender(row.gender),
    birthday: row.birthday,
    occupation: row.occupation,
    firstVisitAt: row.first_visit_at,
    lastVisitAt: row.last_visit_at,
    preferenceTags: [],
    safetyNotes,
    measurementCount: counts.measurementCount,
    blendCount: counts.blendCount,
    orderCount: counts.blendCount,
    note: row.note,
  };
}

type ClientCounts = { measurementCount: number; blendCount: number };

/**
 * 利用者を一覧で返す。件数は測定と制作記録から数える。
 * D1 が使えない環境では null を返し、呼び出し側でデモデータへ落とす。
 */
export async function listClients(): Promise<OperatorClient[] | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .prepare("SELECT * FROM clients ORDER BY last_visit_at DESC")
    .all<ClientRow>();

  if (!rows.results.length) return [];

  // 一覧のたびに1件ずつ問い合わせると件数分の往復になるため、まとめて引く。
  const notes = await db
    .prepare("SELECT client_id, label FROM client_safety_notes")
    .all<{ client_id: string; label: string }>();

  const measurementCounts = await db
    .prepare(
      `SELECT v.client_id AS client_id, COUNT(m.id) AS n
       FROM visits v LEFT JOIN measurements m ON m.visit_id = v.id
       GROUP BY v.client_id`,
    )
    .all<{ client_id: string; n: number }>();

  const blendCounts = await db
    .prepare("SELECT client_id, COUNT(id) AS n FROM blend_records GROUP BY client_id")
    .all<{ client_id: string; n: number }>();

  const notesByClient = new Map<string, string[]>();
  for (const note of notes.results) {
    const list = notesByClient.get(note.client_id) ?? [];
    list.push(note.label);
    notesByClient.set(note.client_id, list);
  }

  const measurementByClient = new Map(measurementCounts.results.map((r) => [r.client_id, r.n]));
  const blendByClient = new Map(blendCounts.results.map((r) => [r.client_id, r.n]));

  return rows.results.map((row) =>
    toClient(row, notesByClient.get(row.id) ?? [], {
      measurementCount: measurementByClient.get(row.id) ?? 0,
      blendCount: blendByClient.get(row.id) ?? 0,
    }),
  );
}
