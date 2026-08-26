# Vercel デプロイ運用

最終更新: 2026年8月17日

## 現在の状態（2026-08-17 時点）

**連携済みです。** Vercel プロジェクト `aroma-records-pwa` が
`mochamofu/selenia-aroma-master` に接続されています。

| | 用途 | URL |
|---|---|---|
| Production | 本番。`main` への push で自動デプロイ | `https://aroma-records-pwa.vercel.app` |
| Preview | PRごとに自動で作られる確認用 | PR に自動コメントされる |
| Development | 各自のPC | `http://localhost:3000` |

これにより、**PRを出した時点でHTTPSのプレビューURLが手に入る**ので、
iPhone / iPad の実機で PWA の挙動まで確認してからマージできます。
PWA はHTTPSでないと本来の挙動にならないため、LAN経由の `http://` より確実です。

### 連携までに何をしたか（記録）

以前は次の状態でした。

- `main` ブランチには `LICENSE` しか入っておらず、そのままではビルドできなかった
- 公開URLはローカルから `vercel` CLI で直接デプロイされたもので、リポジトリと繋がっていなかった
- そのため、リポジトリに何を push しても公開URLは変わらなかった

順番として、**先に `main` へアプリ本体を入れてから**連携しています。
`main` が空のまま繋ぐと、Production のビルドが失敗して公開サイトが落ちるためです。

## 手順

以下は連携時の手順の記録です。再構築が必要になった場合に参照してください。

### 手順1: `main` にアプリ本体を入れる（連携より先に必要）— 完了済み

`agent/repository-documentation` の内容を `main` へ取り込みました（PR #2）。
`main` が空のまま Vercel を繋ぐと Production のビルドが失敗するため、必ずこちらを先に行います。

### 手順2: Vercel プロジェクトを GitHub に繋ぐ — 完了済み

既存の `aroma-records-pwa` プロジェクトを繋ぎ直す場合:

1. Vercel ダッシュボード → 対象プロジェクト → **Settings** → **Git**
2. **Connect Git Repository** → `mochamofu/selenia-aroma-master` を選択
3. **Production Branch** を `main` に設定

新規プロジェクトとして作る場合:

1. Vercel ダッシュボード → **Add New** → **Project**
2. `mochamofu/selenia-aroma-master` を **Import**
3. Framework Preset が **Next.js** になっていることを確認（`vercel.json` で指定済み）
4. Root Directory は空（リポジトリ直下）のまま

新規で作った場合、古い `aroma-records-pwa` は動いたままなので、
**社内で共有しているURLをどちらにするか決めて、古い方を削除するか
ドメインを新プロジェクトへ移してください。** 両方生きていると
「どっちが最新か分からない」状態が続きます。

### 手順3: 環境変数を入れる（要確認）

**Settings** → **Environment Variables** で以下を登録します。
Production / Preview / Development のどれに適用するかを選べます。

| 変数名 | Production | Preview | 用途 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 本番プロジェクトURL | 同左（または検証用） | Supabase接続 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 本番anonキー | 同左（または検証用） | Supabase接続 |
| `NEXT_PUBLIC_ENABLE_DEMO_MODE` | `false` | `true` | デモデータで動かすか |
| `NEXT_PUBLIC_APP_TARGET` | `all` | `all` | 画面の出し分け |

**重要: 本番では `NEXT_PUBLIC_ENABLE_DEMO_MODE` を必ず `false` にしてください。**
`true` のままだと、`/api/base-blends/private` が認証なしでデモ用の配合比率を返します。
（デモ用のダミー値であって実レシピではありませんが、権限チェックが働かない状態になります。）

`NEXT_PUBLIC_` が付いた変数はブラウザに配信されます。**サービスロールキーなど
秘密にすべき値を `NEXT_PUBLIC_` 付きで登録しないでください。**

### 手順4: 動作を確認する

`main` に push すると Production が自動更新されます。
PR を作ると Preview URL が PR にコメントされます。

確認する項目:

- `/login` → ロール別に `/dashboard` か `/operator` へ飛ぶ
- `/operator` → iPad で3カラムまたは2カラムで表示される
- `/base-blends/base-09` → ログインロールに応じて表示範囲が変わる
- iPhone Safari でホーム画面に追加 → アイコンが出て全画面起動する

## 以後の開発の流れ

```
ローカルで作業
  ↓ git push（作業ブランチ）
PR 作成 → Vercel が Preview URL を自動作成
  ↓ iPhone / iPad の実機で Preview URL を開いて確認
main へマージ → Production が自動更新
```

MacBook から作業する場合の環境構築は[開発環境セットアップ](development-setup.md)を参照してください。

## 補足: Vercel CLI で手動デプロイする場合

GitHub 連携をせずに手元から上げることもできますが、
**誰がいつ何を上げたか追えなくなるため、常用は避けてください。**

```bash
npm i -g vercel
vercel          # プレビューへ
vercel --prod   # 本番へ
```

## トラブル時

**ビルドが Turbopack で失敗する**
Vercel のビルド環境は linux x64 でネイティブバインディングがあるため通常は成功します。
それでも失敗する場合は、`package.json` の `build` を `next build --webpack` に変えます。

**プレビューでログインできない**
Preview 環境の `NEXT_PUBLIC_ENABLE_DEMO_MODE` が `false` かつ Supabase 環境変数が
未設定だと、ログインできず `/login` から進めません。Preview では `true` にしておくと
デモデータで確認できます。

**画面が古いまま**
Vercel は静的ページをキャッシュします。デプロイ完了を確認したうえで
スーパーリロード（iOS Safari は設定からWebサイトデータを消す）で確認してください。
