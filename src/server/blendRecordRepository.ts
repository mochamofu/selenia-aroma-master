import "server-only";
import { getDb } from "@/server/db";

/**
 * 香り制作記録の読み書き。保存先は D1 の aroma_records と aroma_ingredients。
 *
 * これまで画面の中だけに持っていたため、再読み込みで消えていた。
 * 各地の施術者が作った記録を中央で見るには、サーバー側に残す必要がある。
 *
 * aroma_records は利用者向けアプリにも渡る表で、下書きと公開の区別を持つ。
 * ここから作る分は下書きとして入れ、公開は別の判断に委ねる。作った直後に
 * 利用者の画面へ出てしまうのを避けるため。
 */

export type BlendRecordItem = {
  name: string;
  amountUl: number;
};

export type BlendRecord = {
  id: string;
  clientId: string;
  operatorId: string;
  title: string;
  madeOn: string;
  baseBlendId: string;
  baseBlendName: string;
  totalVolumeMl: number;
  lotNumber: string;
  makerNote: string;
  items: BlendRecordItem[];
  createdAt: string;
};

type RecordRow = {
  id: string;
  user_id: string;
  title: string;
  made_at: string;
  base_blend_id: string | null;
  base_blend_name: string | null;
  total_volume_ml: number | null;
  blend_lot_number: string | null;
  maker_note: string;
  created_at: string;
};

type ItemRow = {
  aroma_record_id: string;
  name: string;
  amount: string;
  unit: string;
};

/**
 * 分量は amount と unit の2列に分かれている。
 * こちらは µL でそろえて扱うので、読むときに換算する。
 */
function toMicroLiters(amount: string, unit: string): number {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 0;
  if (unit === "ml") return value * 1000;
  // 「滴」はおよそ 50µL。% は全体に対する割合で µL に直せないため 0 とする。
  if (unit === "滴") return value * 50;
  if (unit === "uL") return value;
  return 0;
}

/** 1人分の制作記録を新しい順に返す。D1 が無ければ null。 */
export async function listBlendRecords(clientId: string): Promise<BlendRecord[] | null> {
  const db = await getDb();
  if (!db) return null;

  const records = await db
    .prepare(
      `SELECT id, user_id, title, made_at, base_blend_id, base_blend_name, total_volume_ml,
              blend_lot_number, maker_note, created_at
       FROM aroma_records WHERE user_id = ? ORDER BY made_at DESC, created_at DESC`,
    )
    .bind(clientId)
    .all<RecordRow>();

  if (!records.results.length) return [];

  // 明細は1回でまとめて引く。件数分の往復を避けるため。
  const ids = records.results.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(", ");
  const items = await db
    .prepare(
      `SELECT aroma_record_id, name, amount, unit FROM aroma_ingredients
       WHERE aroma_record_id IN (${placeholders}) ORDER BY sort_order`,
    )
    .bind(...ids)
    .all<ItemRow>();

  const itemsByRecord = new Map<string, BlendRecordItem[]>();
  for (const item of items.results) {
    const list = itemsByRecord.get(item.aroma_record_id) ?? [];
    list.push({ name: item.name, amountUl: toMicroLiters(item.amount, item.unit) });
    itemsByRecord.set(item.aroma_record_id, list);
  }

  return records.results.map((row) => ({
    id: row.id,
    clientId: row.user_id,
    // 誰が作ったかは visits.staff_user_id が持つ。記録の側には持たせない。
    operatorId: "",
    title: row.title,
    madeOn: row.made_at.slice(0, 10),
    // base_blends に無い識別子は名前だけを残してある。画面はどちらでも引ける。
    baseBlendId: row.base_blend_id ?? "",
    baseBlendName: row.base_blend_name ?? "",
    totalVolumeMl: row.total_volume_ml ?? 0,
    lotNumber: row.blend_lot_number ?? "",
    makerNote: row.maker_note,
    items: itemsByRecord.get(row.id) ?? [],
    createdAt: row.created_at,
  }));
}

export type NewBlendRecord = {
  clientId: string;
  operatorId: string;
  /** どのアロマレシピ（型）から作ったか。型を使わずに作った場合は空。 */
  recipeId: string;
  title: string;
  madeOn: string;
  baseBlendId: string;
  /** ベースの名前。識別子が base_blends に無い場合、これだけが手がかりになる。 */
  baseBlendName: string;
  totalVolumeMl: number;
  lotNumber: string;
  makerNote: string;
  items: BlendRecordItem[];
};

/**
 * ベースの識別子が base_blends に実在するか確かめる。
 *
 * aroma_records.base_blend_id は base_blends への外部キー。画面はいま自前の
 * 識別子（base-05 など）でベースを指しているため、そのまま入れると保存が
 * まるごと失敗する。実在しない場合は識別子を空にし、名前だけを残す。
 */
async function resolveBaseBlendId(db: D1Database, baseBlendId: string): Promise<string | null> {
  if (!baseBlendId) return null;
  const row = await db
    .prepare("SELECT id FROM base_blends WHERE id = ? LIMIT 1")
    .bind(baseBlendId)
    .first<{ id: string }>();
  return row?.id ?? null;
}

/** 制作記録を1件保存する。明細も同じ処理でまとめて入れる。 */
export async function createBlendRecord(input: NewBlendRecord): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const id = crypto.randomUUID();
  const baseBlendId = await resolveBaseBlendId(db, input.baseBlendId);
  const statements = [
    db
      .prepare(
        `INSERT INTO aroma_records
         (id, user_id, title, made_at, base_blend_id, base_blend_name, total_volume_ml,
          blend_lot_number, maker_note, recipe_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      )
      .bind(
        id,
        input.clientId,
        input.title,
        input.madeOn,
        baseBlendId,
        input.baseBlendName || input.baseBlendId,
        input.totalVolumeMl,
        input.lotNumber,
        input.makerNote,
        input.recipeId || null,
      ),
    ...input.items.map((item, index) =>
      db
        .prepare(
          `INSERT INTO aroma_ingredients (id, aroma_record_id, name, amount, unit, sort_order)
           VALUES (?, ?, ?, ?, 'uL', ?)`,
        )
        .bind(crypto.randomUUID(), id, item.name, String(item.amountUl), index),
    ),
  ];

  // 記録と明細がちぐはぐに残らないよう、まとめて実行する。
  await db.batch(statements);
  return id;
}
