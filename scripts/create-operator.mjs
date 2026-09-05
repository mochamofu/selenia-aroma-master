/**
 * 施術者アカウントを作る SQL を組み立てる。
 *
 * 人は profiles、ログインIDとパスワードは credentials に入る。両方を1組で
 * 作る必要があるので、ここで2文まとめて出す。
 *
 * パスワードは平文で保存しないため、ハッシュ化した SQL をここで作る。
 * パスワード自体はコマンドの引数に残るだけで、リポジトリにも SQL ファイルにも
 * 平文は残らない。
 *
 * 使い方:
 *   node scripts/create-operator.mjs <ログインID> <パスワード> <表示名> <admin|operator> [店舗ID]
 *
 * 出力された SQL を流す:
 *   node scripts/create-operator.mjs ... > /tmp/op.sql
 *   npx wrangler d1 execute selenia-aroma --remote --file /tmp/op.sql
 *
 * GitHub から流す場合は Actions の「Apply D1 migration」を使う。
 */

import { webcrypto as crypto } from "node:crypto";

// credentials.password_hash と同じ形にする: pbkdf2$<繰り返し回数>$<salt>$<hash>
const ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function derive(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: ITERATIONS, hash: "SHA-256" },
    key,
    KEY_LENGTH_BITS,
  );
  return toHex(bits);
}

const [loginId, password, displayName, role = "operator", storeId] = process.argv.slice(2);

if (!loginId || !password || !displayName) {
  console.error(
    "使い方: node scripts/create-operator.mjs <ログインID> <パスワード> <表示名> <admin|operator> [店舗ID]",
  );
  process.exit(1);
}

// profiles.role の許す値に合わせる。利用者（customer）はここでは作らない。
if (role !== "admin" && role !== "operator") {
  console.error("ロールは admin か operator を指定してください。");
  process.exit(1);
}

if (password.length < 8) {
  console.error("パスワードは8文字以上にしてください。");
  process.exit(1);
}

const saltBytes = new Uint8Array(16);
crypto.getRandomValues(saltBytes);
const salt = toHex(saltBytes.buffer);
const passwordHash = `pbkdf2$${ITERATIONS}$${salt}$${await derive(password, salt)}`;

const userId = crypto.randomUUID();
const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;
const nullable = (value) => (value ? quote(value) : "NULL");

console.log(
  `INSERT INTO profiles (id, user_id, store_id, name, role) VALUES ` +
    `(${quote(crypto.randomUUID())}, ${quote(userId)}, ${nullable(storeId)}, ` +
    `${quote(displayName)}, ${quote(role)});`,
);
console.log(
  `INSERT INTO credentials (id, user_id, login_id, password_hash) VALUES ` +
    `(${quote(crypto.randomUUID())}, ${quote(userId)}, ${quote(loginId.trim().toLowerCase())}, ` +
    `${quote(passwordHash)});`,
);
