import "server-only";
import { getDb } from "@/server/db";
import { verifyPassword } from "@/server/password";
import type { UserRole } from "@/types/profile";

/**
 * 施術者アカウントとログインセッション。
 *
 * 保存先は D1。Cookie に入れるのはセッションIDだけで、ロールなどの判断材料は
 * 毎回サーバー側で引き直す。Cookie の中身を書き換えても権限は変わらない。
 */

/** Cookie 名。値はセッションIDのみ。 */
export const SESSION_COOKIE = "selenia_session";

/** セッションの有効期間。 */
const SESSION_DAYS = 14;

export type OperatorAccount = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  location: string;
};

type OperatorRow = {
  id: string;
  email: string;
  display_name: string;
  role: string;
  password_hash: string;
  password_salt: string;
  location: string;
  is_active: number;
};

function toAccount(row: OperatorRow): OperatorAccount {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role === "admin" ? "admin" : "instructor",
    location: row.location,
  };
}

/** D1 が使えるか。使えない環境では従来のデモモードへ落とす。 */
export async function isDatabaseReady(): Promise<boolean> {
  return (await getDb()) !== null;
}

/**
 * メールとパスワードでアカウントを引く。
 * 一致しない場合は、メールが無いのかパスワードが違うのかを区別せずに null を返す。
 */
export async function findOperatorByCredentials(
  email: string,
  password: string,
): Promise<OperatorAccount | null> {
  const db = await getDb();
  if (!db) return null;

  const row = await db
    .prepare("SELECT * FROM operators WHERE email = ? AND is_active = 1")
    .bind(email.trim().toLowerCase())
    .first<OperatorRow>();

  if (!row) return null;
  const ok = await verifyPassword(password, row.password_salt, row.password_hash);
  return ok ? toAccount(row) : null;
}

export async function createSession(operatorId: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db
    .prepare("INSERT INTO sessions (id, operator_id, expires_at) VALUES (?, ?, ?)")
    .bind(id, operatorId, expiresAt)
    .run();
  return id;
}

/** セッションIDから施術者を引く。期限切れは無効として扱い、その場で消す。 */
export async function findOperatorBySession(
  sessionId: string,
): Promise<OperatorAccount | null> {
  const db = await getDb();
  if (!db || !sessionId) return null;

  const row = await db
    .prepare(
      `SELECT o.* FROM sessions s
       JOIN operators o ON o.id = s.operator_id
       WHERE s.id = ? AND s.expires_at > ? AND o.is_active = 1`,
    )
    .bind(sessionId, new Date().toISOString())
    .first<OperatorRow>();

  if (!row) {
    await deleteSession(sessionId);
    return null;
  }
  return toAccount(row);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await getDb();
  if (!db || !sessionId) return;
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}

export const SESSION_MAX_AGE_SECONDS = SESSION_DAYS * 24 * 60 * 60;
