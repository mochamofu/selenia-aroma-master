import "server-only";

/**
 * パスワードのハッシュ化と、セッショントークンのハッシュ化。
 *
 * Workers で動くのは Web Crypto なので PBKDF2 を使う。平文は保存しない。
 *
 * 保存する形は credentials.password_hash の定義に合わせて
 *   pbkdf2$<繰り返し回数>$<salt>$<hash>
 * の1列にまとめる。繰り返し回数を値の中に持つので、あとから回数を増やしても
 * 古い行をそのまま検証できる。
 */

/** これから作る分の繰り返し回数。既存の行は値の中の回数で検証する。 */
const ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;
const PREFIX = "pbkdf2";

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function createSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

async function derive(password: string, salt: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations,
      hash: "SHA-256",
    },
    key,
    KEY_LENGTH_BITS,
  );
  return toHex(bits);
}

/** 保存する1行を作る。 */
export async function hashPassword(password: string): Promise<string> {
  const salt = createSalt();
  const hash = await derive(password, salt, ITERATIONS);
  return `${PREFIX}$${ITERATIONS}$${salt}$${hash}`;
}

/** 長さが同じなら定数時間で比べる。途中で抜けると一致した長さが漏れる。 */
function equals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * 保存してある1行と照らす。
 * 形が違う・回数が読めない場合は、照合できないものとして false を返す。
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4) return false;
  const [prefix, iterationsText, salt, expected] = parts;
  if (prefix !== PREFIX) return false;

  const iterations = Number(iterationsText);
  if (!Number.isInteger(iterations) || iterations <= 0 || iterations > 1_000_000) return false;

  return equals(await derive(password, salt, iterations), expected);
}

/**
 * セッショントークンのハッシュ。
 *
 * Cookie に入れるのは元のトークンで、保存するのはこのハッシュだけ。
 * データベースを見られても、そこからログインできる値は作れない。
 * パスワードと違い十分な長さの乱数なので、総当たりの心配がなく SHA-256 でよい。
 */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return toHex(digest);
}

/** Cookie に入れるトークンを作る。 */
export function createSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}
