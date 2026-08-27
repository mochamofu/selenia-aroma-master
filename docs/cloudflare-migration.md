# Cloudflare への移行

## なぜ移すのか

1. **固定費を下げる。** Vercel の Hobby プランは規約上は非商用向けで、事業として使うなら
   Pro（月20ドル前後）へ移る必要がある。Cloudflare の無料枠は商用利用を認めている。
2. **保存先が必要になった。** 現在カルテと測定はブラウザ内にしか無く、端末を替えると消える。
   各地の施術者がカルテを作り、中央で参照する運用は今の作りでは実現できない。
3. **画像の転送料がかからない。** 測定画像が容量の大半を占める。R2 は転送量が無料なので、
   何度表示しても費用が増えない。

## 構成

| 用途 | サービス | バインディング名 |
|---|---|---|
| アプリ本体 | Workers（`@opennextjs/cloudflare` 経由） | — |
| カルテ・測定・レシピ | D1（SQLite） | `DB` |
| 測定画像 | R2 | `MEASUREMENT_IMAGES` |

容量の見積もり。切り出したグラフ1枚が約25KB、1人あたり1回の来店で14枚。
100人が月1回来店しても月35MB程度で、無料枠に対して桁が違う。

## 進め方

Vercel を止めずに進める。`next build` は従来どおり動くので、
Cloudflare 側が仕上がるまで両方に出せる。

- [x] Next.js を 16.3.3 へ更新（`@opennextjs/cloudflare` の対応範囲に合わせる）
- [x] `open-next.config.ts` と `wrangler.jsonc` を追加
- [x] D1 のスキーマを用意（`db/migrations/0001_init.sql`）
- [ ] Cloudflare 側でリソースを作成（下記「作成する手順」）
- [ ] ログインを D1 のアカウントに置き換える
- [ ] カルテ・測定・レシピの保存先を D1 と R2 に置き換える
- [ ] Vercel から切り替え
- [ ] Supabase の依存を削除

## 作成する手順

Cloudflare のアカウントが必要。以下はアカウント所有者が実行する。

```bash
# 1. ログイン
npx wrangler login

# 2. データベースを作る
npx wrangler d1 create selenia-karte
#    → 出力された database_id を wrangler.jsonc に書く

# 3. 画像置き場を作る
npx wrangler r2 bucket create selenia-measurement-images

# 4. wrangler.jsonc の d1_databases / r2_buckets のコメントを外し、
#    database_id を差し替える

# 5. スキーマを適用する
npx wrangler d1 execute selenia-karte --remote --file db/migrations/0001_init.sql

# 6. 動作確認（ローカルで Workers として動かす）
npm run cf:preview

# 7. 公開
npm run cf:deploy
```

## 移行前に決めること

- **独自ドメインを使うか。** `*.workers.dev` のままでも動くが、社外に出すなら独自ドメインが望ましい。
  ドメイン代だけは固定費として発生する。
- **既存データの引き継ぎ。** 現在ブラウザに保存している内容は、設定画面の
  「バックアップを書き出す」でファイルに出せる。移行後にそのファイルから流し込む。

## 注意

- `db/migrations/` の SQL に実際の配合比率を書かないこと。比率は
  `base_blend_private_recipes` テーブルへ、管理画面から入れる。
- パスワードはハッシュのみ保存する。スキーマの `password_hash` / `password_salt` がその枠。
  現在コードに直書きしている `DEMO_ACCOUNTS` は、この置き換えで不要になる。
