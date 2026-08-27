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

リソースの名前は `selenia-aroma` で頭を揃える。Cloudflare のアカウント自体が
会社（ココロラボ）なので、個々のリソースに会社名は入れない。同じアカウントで
別の事業を始めたときに、事業ごとに見分けられるようにしておく。

| | 名前 |
|---|---|
| データベース | `selenia-aroma` |
| 画像置き場 | `selenia-aroma-images` |
| アプリ本体 | `selenia-aroma-karte` |

R2 のバケット名は後から変えられない（作り直して中身を移すことになる）ため、
最初に決めておく。

容量の見積もり。切り出したグラフ1枚が約25KB、1人あたり1回の来店で14枚。
100人が月1回来店しても月35MB程度で、無料枠に対して桁が違う。

## 進め方

Vercel を止めずに進める。`next build` は従来どおり動くので、
Cloudflare 側が仕上がるまで両方に出せる。

- [x] Next.js を 16.3.3 へ更新（`@opennextjs/cloudflare` の対応範囲に合わせる）
- [x] `open-next.config.ts` と `wrangler.jsonc` を追加
- [x] D1 のスキーマを用意（`db/migrations/0001_init.sql`）
- [x] D1 のデータベースを作成し、`wrangler.jsonc` に登録
- [ ] R2 のバケットを作成（画像の保存先。未作成）
- [x] ログインを D1 のアカウントに置き換える
- [x] 利用者の保存先を D1 に置き換える
- [ ] 測定・制作記録・レシピの保存先を D1 と R2 に置き換える
- [ ] Vercel から切り替え
- [ ] Supabase の依存を削除

## 作成する手順

Cloudflare のアカウントが必要。以下はアカウント所有者が実行する。
ダッシュボード（ブラウザ）でも同じことができるので、CLI を使わなくてもよい。

```bash
# 1. ログイン
npx wrangler login

# 2. データベース（作成済み。selenia-aroma / wrangler.jsonc に登録済み）
#    新しく作り直す場合のみ:
#    npx wrangler d1 create selenia-aroma
#    → 出力された database_id を wrangler.jsonc に書く

# 3. 画像置き場を作る（未作成）
npx wrangler r2 bucket create selenia-aroma-images
#    → 作成したら wrangler.jsonc の r2_buckets のコメントを外す

# 4. スキーマを適用する
npx wrangler d1 execute selenia-aroma --remote --file db/migrations/0001_init.sql

# 5. 施術者アカウントを作る（下の「施術者アカウントを作る」を参照）

# 6. 動作確認（ローカルで Workers として動かす）
npm run cf:preview

# 7. 公開
npm run cf:deploy
```

## 施術者アカウントを作る

パスワードは平文で保存しない。`scripts/create-operator.mjs` がハッシュ化した
INSERT 文を作るので、その出力を D1 へ流す。

```bash
# 管理者を1人作る
node scripts/create-operator.mjs "admin@selenia" "<パスワード>" "小杉 英之" admin > /tmp/op.sql
npx wrangler d1 execute selenia-aroma --remote --file /tmp/op.sql

# 各地の施術者を足す
node scripts/create-operator.mjs "<メール>" "<パスワード>" "<氏名>" instructor > /tmp/op.sql
npx wrangler d1 execute selenia-aroma --remote --file /tmp/op.sql
```

パスワードが残るのはコマンドの履歴だけで、リポジトリにも SQL ファイルにも平文は入らない。
`/tmp/op.sql` は流し終えたら消すこと。

## 動作確認用のデモデータ

利用者のデモデータを D1 へ入れる SQL を作れる。実在の方の情報はここから入れないこと。

```bash
node scripts/seed-clients.mjs > /tmp/clients.sql
npx wrangler d1 execute selenia-aroma --local  --file /tmp/clients.sql   # 手元で確認
npx wrangler d1 execute selenia-aroma --remote --file /tmp/clients.sql   # 本番へ
```

## 移行中の画面の振る舞い

保存先が使えるかどうかで自動的に切り替わる。

| 状態 | 画面 |
|---|---|
| D1 に利用者がいる | D1 の内容を表示する |
| D1 が空、未接続、未ログイン | デモデータを表示し、「表示中はデモデータです」と出す |

移行の途中でも画面が空にならないようにしている。切り替えのために画面側を
触る必要はない。

## ログインの仕組み

- Cookie に入れるのはセッションIDだけ。ロールなどの判断材料は毎回サーバー側で引き直す。
  Cookie を書き換えても権限は変わらない。
- Cookie は HttpOnly。ブラウザの JavaScript からは読めない。
- パスワードは PBKDF2（SHA-256、10万回）でハッシュ化して保存する。
- 有効期間は14日。期限切れのセッションは参照時に削除する。
- メールが無い場合とパスワードが違う場合で応答を変えない。存在するメールを
  探る手がかりにさせないため。
- D1 が使えない環境（移行前の Vercel など）ではこの経路が 503 を返し、
  従来のデモ用アカウントへ落ちる。移行が終わるまでどちらの環境でも動く。

## ドメイン

まずは `*.workers.dev` で始める。独自ドメインは後から足せる。

Cloudflare では独自ドメインを Worker に後付けする設計で、追加してもコードは変わらない。
D1 と R2 は Worker に紐づいていてドメインには紐づかないため、データの移行も発生しない。
`*.workers.dev` は独自ドメインを足したあとも残せるので、先に配った URL も生き続ける。

アプリ側に URL の直書きはない（`manifest.json` の `start_url` は `/` の相対指定）。
ドメインを変えても直す箇所はない。

そのため、ドメイン代が必要になるのは、お客様へ案内する段階でよい。

## 既存データの引き継ぎ

現在ブラウザに保存している内容は、設定画面の「バックアップを書き出す」でファイルに出せる。
移行後にそのファイルから流し込む。

## 注意

- `db/migrations/` の SQL に実際の配合比率を書かないこと。比率は
  `base_blend_private_recipes` テーブルへ、管理画面から入れる。
- パスワードはハッシュのみ保存する。スキーマの `password_hash` / `password_salt` がその枠。
  現在コードに直書きしている `DEMO_ACCOUNTS` は、この置き換えで不要になる。
