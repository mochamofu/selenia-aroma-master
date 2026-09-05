import "server-only";
import { getDb } from "@/server/db";
import type { OperatorClient } from "@/data/operatorClients";

/**
 * 利用者の読み書き。保存先は D1。
 *
 * 人は profiles に1つの表で入っていて、role で利用者と施術者が分かれる。
 * ここが返すのは role='customer' の人だけ。
 *
 * 画面が扱う形（OperatorClient）は変えず、ここで行と相互変換する。
 * こうしておくと、保存先が変わっても画面側を触らずに済む。
 */

type ProfileRow = {
  id: string;
  user_id: string;
  customer_number: string | null;
  name: string;
  name_kana: string;
  birthday: string | null;
  last_visit_at: string | null;
  favorite_types: string;
  created_at: string;
};

type ClientCounts = {
  measurementCount: number;
  blendCount: number;
  firstVisitAt: string;
};

/** favorite_types は JSON の配列で入っている。壊れていたら空として扱う。 */
function parseTags(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}

function toClient(row: ProfileRow, safetyNotes: string[], counts: ClientCounts): OperatorClient {
  return {
    id: row.user_id,
    clientNumber: row.customer_number ?? "",
    userId: row.user_id,
    name: row.name,
    nameKana: row.name_kana,
    // profiles は性別と職業を持たない。カルテの入力欄は空で出す。
    gender: "回答なし",
    birthday: row.birthday ?? "",
    occupation: "",
    // 初回来店は来店の記録から出す。無ければ登録日を使う。
    firstVisitAt: counts.firstVisitAt || row.created_at.slice(0, 10),
    lastVisitAt: row.last_visit_at ?? "",
    preferenceTags: parseTags(row.favorite_types),
    safetyNotes,
    measurementCount: counts.measurementCount,
    blendCount: counts.blendCount,
    orderCount: counts.blendCount,
    note: "",
  };
}

/**
 * 利用者を一覧で返す。件数は測定と香りの記録から数える。
 * D1 が使えない環境では null を返し、呼び出し側でデモデータへ落とす。
 */
export async function listClients(): Promise<OperatorClient[] | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .prepare(
      `SELECT id, user_id, customer_number, name, name_kana, birthday,
              last_visit_at, favorite_types, created_at
       FROM profiles WHERE role = 'customer'
       ORDER BY COALESCE(last_visit_at, created_at) DESC`,
    )
    .all<ProfileRow>();

  if (!rows.results.length) return [];

  // 一覧のたびに1件ずつ問い合わせると件数分の往復になるため、まとめて引く。
  const notes = await db
    .prepare("SELECT user_id, label FROM client_safety_notes ORDER BY created_at")
    .all<{ user_id: string; label: string }>();

  const measurementCounts = await db
    .prepare(
      `SELECT v.user_id AS user_id, COUNT(m.id) AS n, MIN(v.visited_at) AS first_visit
       FROM visits v LEFT JOIN measurements m ON m.visit_id = v.id
       GROUP BY v.user_id`,
    )
    .all<{ user_id: string; n: number; first_visit: string | null }>();

  const blendCounts = await db
    .prepare("SELECT user_id, COUNT(id) AS n FROM aroma_records GROUP BY user_id")
    .all<{ user_id: string; n: number }>();

  const notesByUser = new Map<string, string[]>();
  for (const note of notes.results) {
    const list = notesByUser.get(note.user_id) ?? [];
    list.push(note.label);
    notesByUser.set(note.user_id, list);
  }

  const visitsByUser = new Map(measurementCounts.results.map((r) => [r.user_id, r]));
  const blendByUser = new Map(blendCounts.results.map((r) => [r.user_id, r.n]));

  return rows.results.map((row) => {
    const visit = visitsByUser.get(row.user_id);
    return toClient(row, notesByUser.get(row.user_id) ?? [], {
      measurementCount: visit?.n ?? 0,
      blendCount: blendByUser.get(row.user_id) ?? 0,
      firstVisitAt: visit?.first_visit?.slice(0, 10) ?? "",
    });
  });
}
