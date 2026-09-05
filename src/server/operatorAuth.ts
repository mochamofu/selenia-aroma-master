import "server-only";
import { getDb } from "@/server/db";
import { createSessionToken, hashToken, verifyPassword } from "@/server/password";
import type { UserRole } from "@/types/profile";

/**
 * 施術者アカウントとログインセッション。保存先は D1。
 *
 * 人は profiles に1つの表で入っていて、利用者か施術者かは role で分かれる。
 * ログインIDとパスワードは credentials、ログイン中の状態は sessions が持つ。
 *
 * Cookie に入れるのはトークンだけ。ロールなどの判断材料は毎回サーバー側で
 * 引き直すので、Cookie の中身を書き換えても権限は変わらない。
 * 保存するのはトークンのハッシュなので、データベースを見てもログインできない。
 */

/** Cookie 名。値はセッショントークンのみ。 */
export const SESSION_COOKIE = "selenia_session";

/** セッションの有効期間。 */
const SESSION_DAYS = 14;

/** 連続で失敗したら、しばらく受け付けない。総当たりを遅くするため。 */
const LOCK_AFTER_FAILURES = 5;
const LOCK_MINUTES = 15;

export type OperatorAccount = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  location: string;
  /** 所属店舗。店舗ごとの設定を引くのに使う。未所属なら空。 */
  storeId: string;
};

type AccountRow = {
  user_id: string;
  login_id: string;
  name: string;
  role: string;
  password_hash: string;
  failed_attempts: number;
  locked_until: string | null;
  store_name: string | null;
  store_id: string | null;
};

/**
 * profiles.role とアプリのロールの対応。
 * 向こうは operator、こちらは instructor と呼んでいる。同じものを指す。
 */
function toRole(value: string): UserRole {
  if (value === "admin") return "admin";
  if (value === "operator") return "instructor";
  return "customer";
}

function toAccount(row: AccountRow): OperatorAccount {
  return {
    id: row.user_id,
    email: row.login_id,
    displayName: row.name,
    role: toRole(row.role),
    location: row.store_name ?? "",
    storeId: row.store_id ?? "",
  };
}

/** D1 が使えるか。使えない環境では従来のデモモードへ落とす。 */
export async function isDatabaseReady(): Promise<boolean> {
  return (await getDb()) !== null;
}

/**
 * ログインIDとパスワードでアカウントを引く。
 *
 * 一致しない場合は、IDが無いのかパスワードが違うのかを区別せずに null を返す。
 * 存在するIDを探る手がかりにさせないため。
 */
export async function findOperatorByCredentials(
  loginId: string,
  password: string,
): Promise<OperatorAccount | null> {
  const db = await getDb();
  if (!db) return null;

  const row = await db
    .prepare(
      `SELECT c.user_id, c.login_id, c.password_hash, c.failed_attempts, c.locked_until,
              p.name, p.role, p.store_id, s.name AS store_name
       FROM credentials c
       JOIN profiles p ON p.user_id = c.user_id
       LEFT JOIN stores s ON s.id = p.store_id
       WHERE c.login_id = ?`,
    )
    .bind(loginId.trim().toLowerCase())
    .first<AccountRow>();

  if (!row) return null;

  // 利用者のアカウントでは、この管理者向けアプリに入れない。
  if (row.role !== "admin" && row.role !== "operator") return null;

  const now = new Date();
  if (row.locked_until && new Date(row.locked_until) > now) return null;

  if (!(await verifyPassword(password, row.password_hash))) {
    await recordFailure(db, row.user_id, row.failed_attempts + 1);
    return null;
  }

  await db
    .prepare(
      `UPDATE credentials
       SET failed_attempts = 0, locked_until = NULL, last_login_at = ?, updated_at = ?
       WHERE user_id = ?`,
    )
    .bind(now.toISOString(), now.toISOString(), row.user_id)
    .run();

  return toAccount(row);
}

async function recordFailure(db: D1Database, userId: string, failures: number): Promise<void> {
  const lockedUntil =
    failures >= LOCK_AFTER_FAILURES
      ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
      : null;
  await db
    .prepare(
      "UPDATE credentials SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE user_id = ?",
    )
    .bind(failures, lockedUntil, new Date().toISOString(), userId)
    .run();
}

/**
 * セッションを開始し、Cookie に入れるトークンを返す。
 * 保存するのはトークンのハッシュだけで、元のトークンは残さない。
 */
export async function createSession(userId: string, userAgent = ""): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await db
    .prepare(
      `INSERT INTO sessions (id, user_id, token_hash, store_id, expires_at, user_agent)
       VALUES (?, ?, ?, (SELECT store_id FROM profiles WHERE user_id = ?), ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      userId,
      await hashToken(token),
      userId,
      expiresAt,
      userAgent.slice(0, 300),
    )
    .run();

  return token;
}

/** トークンから施術者を引く。期限切れは無効として扱い、その場で消す。 */
export async function findOperatorBySession(token: string): Promise<OperatorAccount | null> {
  const db = await getDb();
  if (!db || !token) return null;

  const tokenHash = await hashToken(token);
  const row = await db
    .prepare(
      `SELECT c.user_id, c.login_id, c.password_hash, c.failed_attempts, c.locked_until,
              p.name, p.role, p.store_id, st.name AS store_name
       FROM sessions s
       JOIN profiles p ON p.user_id = s.user_id
       JOIN credentials c ON c.user_id = s.user_id
       LEFT JOIN stores st ON st.id = p.store_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .bind(tokenHash, new Date().toISOString())
    .first<AccountRow>();

  if (!row) {
    // 期限切れの行を残さない。
    await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
    return null;
  }
  if (row.role !== "admin" && row.role !== "operator") return null;

  // 最後に使った時刻を控える。使われていないセッションの整理に使う。
  await db
    .prepare("UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?")
    .bind(new Date().toISOString(), tokenHash)
    .run();

  return toAccount(row);
}

export async function deleteSession(token: string): Promise<void> {
  const db = await getDb();
  if (!db || !token) return;
  await db
    .prepare("DELETE FROM sessions WHERE token_hash = ?")
    .bind(await hashToken(token))
    .run();
}

export const SESSION_MAX_AGE_SECONDS = SESSION_DAYS * 24 * 60 * 60;
