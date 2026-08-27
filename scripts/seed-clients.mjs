/**
 * デモ用の利用者を D1 へ入れる SQL を作る。
 *
 * 動作確認のためのもの。実在の方の情報はここから入れないこと。
 * 本番でカルテを作るのは画面から行う。
 *
 * 使い方:
 *   node scripts/seed-clients.mjs > /tmp/clients.sql
 *   npx wrangler d1 execute selenia-aroma --local  --file /tmp/clients.sql
 *   npx wrangler d1 execute selenia-aroma --remote --file /tmp/clients.sql
 */

import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/data/operatorClients.ts", import.meta.url), "utf8");
const quote = (value) => `'${String(value ?? "").replace(/'/g, "''")}'`;

// operatorClients の配列リテラルから必要な項目だけ拾う。
const blocks = source.split(/\{\s*\n\s*id: "/).slice(1);
const statements = [];

for (const block of blocks) {
  const pick = (key) => block.match(new RegExp(`${key}: "([^"]*)"`))?.[1] ?? "";
  const id = block.slice(0, block.indexOf('"'));
  if (!id.startsWith("clt-")) continue;

  statements.push(
    `INSERT OR REPLACE INTO clients ` +
      `(id, client_number, name, name_kana, gender, birthday, occupation, first_visit_at, last_visit_at, note) ` +
      `VALUES (${quote(id)}, ${quote(pick("clientNumber"))}, ${quote(pick("name"))}, ` +
      `${quote(pick("nameKana"))}, ${quote(pick("gender"))}, ${quote(pick("birthday"))}, ` +
      `${quote(pick("occupation"))}, ${quote(pick("firstVisitAt"))}, ${quote(pick("lastVisitAt"))}, ` +
      `${quote(pick("note"))});`,
  );

  // 禁忌・注意事項。作り直しても重複しないよう、いったん消してから入れる。
  statements.push(`DELETE FROM client_safety_notes WHERE client_id = ${quote(id)};`);
  const notesBlock = block.match(/safetyNotes: \[([^\]]*)\]/)?.[1] ?? "";
  for (const [index, note] of [...notesBlock.matchAll(/"([^"]+)"/g)].entries()) {
    statements.push(
      `INSERT INTO client_safety_notes (id, client_id, label) ` +
        `VALUES (${quote(`${id}-note-${index + 1}`)}, ${quote(id)}, ${quote(note[1])});`,
    );
  }
}

if (statements.length === 0) {
  console.error("利用者を読み取れませんでした。src/data/operatorClients.ts の形を確認してください。");
  process.exit(1);
}

console.log(statements.join("\n"));
