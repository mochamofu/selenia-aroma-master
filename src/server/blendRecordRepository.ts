import "server-only";
import { getDb } from "@/server/db";

/**
 * 香り制作記録の読み書き。保存先は D1。
 *
 * これまで画面の中だけに持っていたため、再読み込みで消えていた。
 * 各地の施術者が作った記録を中央で見るには、サーバー側に残す必要がある。
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
  totalVolumeMl: number;
  lotNumber: string;
  makerNote: string;
  items: BlendRecordItem[];
  createdAt: string;
};

type RecordRow = {
  id: string;
  client_id: string;
  operator_id: string;
  title: string;
  made_on: string;
  base_blend_id: string;
  total_volume_ml: number;
  lot_number: string;
  maker_note: string;
  created_at: string;
};

type ItemRow = {
  blend_record_id: string;
  name: string;
  amount_ul: number;
};

/** 1人分の制作記録を新しい順に返す。D1 が無ければ null。 */
export async function listBlendRecords(clientId: string): Promise<BlendRecord[] | null> {
  const db = await getDb();
  if (!db) return null;

  const records = await db
    .prepare("SELECT * FROM blend_records WHERE client_id = ? ORDER BY made_on DESC, created_at DESC")
    .bind(clientId)
    .all<RecordRow>();

  if (!records.results.length) return [];

  // 明細は1回でまとめて引く。件数分の往復を避けるため。
  const ids = records.results.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(", ");
  const items = await db
    .prepare(
      `SELECT blend_record_id, name, amount_ul FROM blend_items
       WHERE blend_record_id IN (${placeholders}) ORDER BY sort_order`,
    )
    .bind(...ids)
    .all<ItemRow>();

  const itemsByRecord = new Map<string, BlendRecordItem[]>();
  for (const item of items.results) {
    const list = itemsByRecord.get(item.blend_record_id) ?? [];
    list.push({ name: item.name, amountUl: item.amount_ul });
    itemsByRecord.set(item.blend_record_id, list);
  }

  return records.results.map((row) => ({
    id: row.id,
    clientId: row.client_id,
    operatorId: row.operator_id,
    title: row.title,
    madeOn: row.made_on,
    baseBlendId: row.base_blend_id,
    totalVolumeMl: row.total_volume_ml,
    lotNumber: row.lot_number,
    makerNote: row.maker_note,
    items: itemsByRecord.get(row.id) ?? [],
    createdAt: row.created_at,
  }));
}

export type NewBlendRecord = {
  clientId: string;
  operatorId: string;
  title: string;
  madeOn: string;
  baseBlendId: string;
  totalVolumeMl: number;
  lotNumber: string;
  makerNote: string;
  items: BlendRecordItem[];
};

/** 制作記録を1件保存する。明細も同じ処理でまとめて入れる。 */
export async function createBlendRecord(input: NewBlendRecord): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const id = crypto.randomUUID();
  const statements = [
    db
      .prepare(
        `INSERT INTO blend_records
         (id, client_id, visit_id, operator_id, title, made_on, base_blend_id,
          total_volume_ml, lot_number, maker_note)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.clientId,
        input.operatorId,
        input.title,
        input.madeOn,
        input.baseBlendId,
        input.totalVolumeMl,
        input.lotNumber,
        input.makerNote,
      ),
    ...input.items.map((item, index) =>
      db
        .prepare(
          "INSERT INTO blend_items (id, blend_record_id, name, amount_ul, sort_order) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(crypto.randomUUID(), id, item.name, item.amountUl, index),
    ),
  ];

  // 記録と明細がちぐはぐに残らないよう、まとめて実行する。
  await db.batch(statements);
  return id;
}
