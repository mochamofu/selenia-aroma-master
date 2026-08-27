/**
 * 施術者アカウントを作る SQL を組み立てる。
 *
 * パスワードは平文で保存しないため、ハッシュ化した SQL をここで作り、
 * その出力を wrangler で流す。パスワード自体はコマンドの引数に残るだけで、
 * リポジトリにも SQL ファイルにも平文は残らない。
 *
 * 使い方:
 *   node scripts/create-operator.mjs <メール> <パスワード> <表示名> <admin|instructor>
 *
 * 出力された SQL を流す:
 *   node scripts/create-operator.mjs ... > /tmp/op.sql
 *   npx wrangler d1 execute selenia-aroma --remote --file /tmp/op.sql
 */

import { webcrypto as crypto } from "node:crypto";

const ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt) {
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
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    key,
    KEY_LENGTH_BITS,
  );
  return toHex(bits);
}

const [email, password, displayName, role = "instructor"] = process.argv.slice(2);

if (!email || !password || !displayName) {
  console.error(
    "使い方: node scripts/create-operator.mjs <メール> <パスワード> <表示名> <admin|instructor>",
  );
  process.exit(1);
}

if (role !== "admin" && role !== "instructor") {
  console.error("ロールは admin か instructor を指定してください。");
  process.exit(1);
}

const saltBytes = new Uint8Array(16);
crypto.getRandomValues(saltBytes);
const salt = toHex(saltBytes.buffer);
const hash = await hashPassword(password, salt);
const id = crypto.randomUUID();
const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;

console.log(
  `INSERT INTO operators (id, email, display_name, role, password_hash, password_salt) ` +
    `VALUES (${quote(id)}, ${quote(email.trim().toLowerCase())}, ${quote(displayName)}, ` +
    `${quote(role)}, ${quote(hash)}, ${quote(salt)});`,
);
