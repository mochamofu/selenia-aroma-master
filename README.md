# Selenia Aroma Karte（管理者・施術者向け）

脳波アロマ測定サービスの**管理者・施術者向け管理アプリ**です。利用者ごとのカルテ、
1分測定の脳波データ（CSV / 測定画面のスクリーンショット）、香りの制作履歴、
μL / mL ベースの配合計算、ヒアリング回答、精油・ベースブレンド情報を扱います。

**利用者（購入者）向けアプリはこのリポジトリには含まれません。**
別リポジトリ `mochamofu/selenia-aroma-user` が担当します。

## まず画面を開く

**[管理アプリを開く](https://aroma-records-pwa.vercel.app/operator)**

PC・タブレットでの利用を前提にしています。サイドバーから
顧客カルテ / 顧客一覧 / 香り制作記録 / ベースブレンド一覧 / エッセンシャルオイル一覧
へ移動できます。

デモモードのログインは、登録した組み合わせに一致したときだけ通ります。

| 用途 | ID | パスワード | 見えるもの |
| --- | --- | --- | --- |
| サロン管理者 | `admin@selenia` | `aroma` | 内部配合比率まで含めた全て |
| 社外共有用 | `hacosco` | `aroma` | 内部配合比率は非表示 |

社外へURLを送るときは社外共有用のほうを渡す。共有先が増えるときは
`src/lib/auth.ts` の `DEMO_ACCOUNTS` に行を足す。

詳しい操作手順は[非エンジニア向けデモ起動ガイド](docs/demo-start-guide.md)にまとめています。

## まず見る場所

| 用途 | URL / ファイル |
| --- | --- |
| 公開URL（ダッシュボード） | [https://aroma-records-pwa.vercel.app/operator](https://aroma-records-pwa.vercel.app/operator) |
| ローカル起動 | `http://localhost:3000/operator` |
| 管理者ダッシュボード | `src/app/operator/page.tsx` |
| 事業者向けカルテ画面 | `src/app/operator/karte/page.tsx` |
| 仕様書（Markdown） | `docs/aroma-operator-current-capability-spec.md` |
| 仕様書（Word） | `docs/aroma-operator-current-capability-spec.docx` |
| 仕様書（PDF） | `docs/aroma-operator-current-capability-spec.pdf` |
| 本番化仕様 | `docs/web-app-production-spec.md` |
| 精油カタログ | `docs/oil-catalog-database.md` |
| 内部ベースブレンド資料 | `docs/base-blend-recipes-internal.md` |
| 開示ポリシー（3段階） | `docs/disclosure-policy.md` |
| 脳波データ取り込み仕様 | `docs/brainwave-data-intake.md` |
| 非エンジニア向けデモガイド | `docs/demo-start-guide.md` |
| 開発環境セットアップ（Mac/Win） | `docs/development-setup.md` |
| Vercelデプロイ運用（連携済み） | `docs/vercel-deployment.md` |

公開URLは現行デモの記録です。環境やVercelのデプロイ状態によって表示内容・認証状態が変わるため、共有前に`/operator`と`/dashboard`を確認してください。

## 対応環境

Webアプリなので、OSを問わず同じコードが動きます。

| 端末 | 想定する使い方 | 状態 |
|---|---|---|
| iPhone | 利用者向け画面（`/dashboard`）。ホーム画面に追加してPWAとして使う | 対応済み |
| iPad | 事業者向けカルテ（`/operator`）。FocusCalmの測定端末と同じiPadで開く | 対応済み（縦2カラム / 横2カラム / 1280px以上で3カラム） |
| Mac / Windows PC | カルテの管理作業、開発 | 対応済み |

ノッチ・ホームインジケーターのセーフエリア、iOSの入力欄オートズーム抑止、
`100dvh` によるアドレスバー対応を入れてあります。

## 現在の機能

- `/login`: ログインとロール別リダイレクト
- `/dashboard`: 購入者向けのアロマ記録ハブ
- `/aromas`: 制作済みアロマの一覧、検索・タブ表示
- `/aromas/[id]`: 配合概要、メモ、注意事項、再購入導線
- `/aromas/[id]/reorder`: 再購入前の確認画面
- `/moods` / `/moods/[mood]`: 目的・気分別の香り探索
- `/oils/[slug]`: 追加精油36種類の図鑑ページ
- `/base-blends` / `/base-blends/[id]`: ベースブレンド図鑑（香りの印象・使うシーン・使い分け指針まで解説）
- `/profile`: プロフィール、お気に入り、ログアウト
- `/admin`: 管理者ダッシュボード、顧客・制作記録の入口
- `/operator`: 脳波画像、複数回の診断・制作履歴、ヒアリング回答、配合記録を紐づける事業者向けカルテ

### 事業者向けカルテの要点

- 顧客8名のデモデータと、それぞれ複数回の診断・制作履歴
- 履歴選択に応じて、脳波画像、配合レシピ、完成量、追加精油、ヒアリング回答を切り替え
- 脳波画像のタイトル表示、拡大確認、アップロード想定（画像上限10MB）
- 総量を5mL / 10mLなどで指定し、各材料を比率から自動換算
- 単位をμL / mLで切り替え
- 脳波CSVの取り込み、7波形（リラックス / 集中 / α / β / γ / δ / θ）のグラフ描画
- iPadスクリーンショットの一括取り込みと、重複グラフの自動除外
- ベースブレンド情報の3段階開示（利用者 / 認定インストラクター / 管理者）
- 内部配合比率はサーバー側のみで保持し、管理者のみ取得できる
- 妊娠、妊活、出産直後、服薬などの禁忌・注意フラグをヒアリング結果に保持

## ローカル起動

Node.js 22系で確認しています。macOS / Windows どちらでも同じ手順です。

```bash
npm install
npm run dev
```

MacBookで初めて環境を作る場合（Node導入、SSH鍵、実機確認まで）は
[開発環境セットアップ](docs/development-setup.md)を参照してください。

起動後:

- `http://localhost:3000/login`
- `http://localhost:3000/operator`
- `http://localhost:3000/dashboard`

ビルドとLint:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## 環境変数とデモモード

`.env.local`に設定します。`.env.local`はGitHubへコミットしません。

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
NEXT_PUBLIC_APP_TARGET=all
```

現行版は画面検証用のモックデータとブラウザ内stateを中心に動きます。Supabaseの本番接続、永続DB、画像ストレージ、正式な認証・権限管理は未完成部分があります。詳細は[現行仕様書](docs/aroma-operator-current-capability-spec.md)と[本番化仕様](docs/web-app-production-spec.md)を参照してください。

## 画面キャプチャ

GitHub上で主要画面の見た目を確認できます。

<details>
<summary>購入者向け画面</summary>

![Dashboard](output/screenshots/customer/01-dashboard.png)
![Aroma list](output/screenshots/customer/02-aromas.png)
![Aroma detail](output/screenshots/customer/03-aroma-detail.png)
![Reorder](output/screenshots/customer/04-reorder.png)
![Moods](output/screenshots/customer/05-moods.png)
![Mood detail](output/screenshots/customer/06-mood-relax.png)
![Base blends](output/screenshots/customer/07-base-blends.png)
![Base blend detail](output/screenshots/customer/08-base-blend-detail.png)
![Oil catalog](output/screenshots/customer/09-oil-lavender.png)
![Profile](output/screenshots/customer/10-profile.png)

</details>

### 事業者向けカルテ（スマートフォン表示）

![Operator mobile demo](output/screenshots/operator-mobile-390x844.png)

## 更新履歴

以下は、既存の仕様書・実装・生成済み画面資料から再構成した開発マイルストーンです。Gitのコミット履歴とは別に、機能が増えた順番を把握するための一覧です。

### 2026-07-07: 事業者向けカルテの現行デモを整理

- 顧客カルテを8名のデモ利用者と複数回の制作履歴で構成
- 過去履歴の選択に連動して、脳波画像・配合・制作量・ヒアリング回答を切り替え
- 総量を基準にしたμL / mL配合計算へ整理
- Googleフォーム回答を想定したヒアリング項目と禁忌・注意フラグを追加
- ベースブレンド内部情報の管理者限定表示を整理
- 10MB画像アップロード想定、画像タイトル、拡大確認の仕様を整理

### 2026-07-30: 仕様書・画面資料を出力

- 現行アプリ仕様書をMarkdown、Word、PDFで出力
- 購入者向け主要画面のスクリーンショットを`output/screenshots/customer`に整理
- 本番化に向けた認証、DB、Storage、脳波測定データ受信の拡張ポイントを文書化

### 2026-08-16: GitHub共同開発用に整理

- リポジトリの入口としてREADMEを整備
- 公開URL、ローカル起動、画面一覧、仕様書、画面キャプチャを相互リンク
- Codex、Claude、GLMなど複数の開発エージェントが参照できる共同開発ルールを追加
- 一時生成物、環境変数、ブラウザプロファイルをGit管理対象から除外

## ディレクトリ構成

```text
src/
  app/          画面とルート
  components/   共通UI
  data/         モックデータと精油カタログ
  hooks/        認証・プロフィール・記録・お気に入りのhooks
  lib/          Supabase、認証、ルート補助
  services/     データアクセス境界
  types/        DB・プロフィール・アロマ型
supabase/
  schema.sql    テーブル定義とRLSのたたき台
docs/
  *.md          現行仕様、精油、ベースブレンド、本番化資料
  *.docx/*.pdf  共有用の仕様書
output/
  screenshots/  画面キャプチャ
  docx/         生成済み仕様書
  pdf/          生成済みPDF
```

## 共同開発ルール

Codex、Claude、GLMなど別のエージェントで作業するときは、最初にこのREADMEと`docs/aroma-operator-current-capability-spec.md`を読み、担当範囲をIssueまたはブランチ名に残してください。

1. `main`へ直接コミットせず、`agent/<feature>`または`feature/<feature>`ブランチを使う
2. 変更前に`git status`を確認し、他の作業者の変更を上書きしない
3. UI変更は対象ルートと画面キャプチャをPR本文に書く
4. `npm run lint`と`npm run build`を実行し、失敗理由があればPR本文に残す
5. 実顧客データ、脳波画像、`.env.local`、管理者パスワード、内部配合比率を公開コミットしない
6. 配合計算や履歴切替など共有状態に関わる変更は、対象データと再現手順を記載する
7. 仕様書を変更した場合はMarkdownを正本とし、Word/PDFがある場合は再生成する

詳細は[共同開発ガイド](docs/repository-collaboration.md)を参照してください。

## Supabase接続

1. Supabaseプロジェクトを作成
2. SQL Editorで`supabase/schema.sql`を実行
3. Storageに`aroma-images` bucketを作成
4. Authのメール/パスワードログインを有効化
5. `profiles.role`に`customer`、`instructor`、`admin`のいずれかを設定
6. Storageに`brainwave-screenshots`と`raw-brainwave-csv` bucketを作成

本番公開ではデモモードを無効化してください。内部配合比率は `src/server/baseBlendPrivateRecipes.ts`
（`server-only`）と `/api/base-blends/private` に隔離済みで、クライアントバンドルには含まれません。
開示範囲の考え方は[開示ポリシー](docs/disclosure-policy.md)を参照してください。
