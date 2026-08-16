# Selenia Aroma 共同開発ガイド

この文書は、Codex、Claude、GLMなど複数の開発エージェントや人が、同じリポジトリを安全に更新するための最低限のルールです。

## 作業開始時

1. READMEと`docs/aroma-operator-current-capability-spec.md`を読む
2. `git status -sb`で作業ツリーを確認する
3. 現在の公開URLとローカル起動URLで対象画面を確認する
4. 変更対象、目的、確認方法をIssueまたはPR本文に書く

## ブランチとコミット

- `main`へ直接作業せず、`agent/<目的>`または`feature/<目的>`を使う
- 1コミット1目的を基本にする
- UI、データモデル、認証、配合計算など境界の異なる変更はコミットを分ける
- 他の作業者の未コミット変更を削除・リセットしない

## 確認コマンド

```powershell
npm run lint
npm run build
```

画面変更時は対象ルートを確認し、可能なら変更前後のPNGをPRに添付します。履歴切替、μL / mL換算、内部比率の表示制御、画像アップロードを変更した場合は、手動確認の手順を必ず残します。

## データと秘密情報

- `.env.local`、SupabaseのService Role Key、アクセストークンはコミットしない
- 実顧客の氏名、生年月日、脳波画像、ヒアリング回答を公開データに入れない
- 内部配合比率は顧客・店舗事業者向け画面へ露出させない
- デモデータを追加する場合は架空の人物・架空の画像を使う
- `output/screenshots/**/chrome-profile`、`.next`、`node_modules`はコミットしない

## 仕様書の正本

仕様の正本はMarkdownです。

- 現行機能: `docs/aroma-operator-current-capability-spec.md`
- 本番化の検討事項: `docs/web-app-production-spec.md`
- 精油カタログ: `docs/oil-catalog-database.md`
- 内部ベースブレンド: `docs/base-blend-recipes-internal.md`

WordやPDFを更新する場合は、Markdownを先に更新し、同じ内容から再生成します。コードと仕様が食い違う場合は、PR本文に差分と判断理由を書いてください。

## PR本文のテンプレート

```markdown
## 変更内容
- 

## 対象画面・ファイル
- 

## 確認
- [ ] npm run lint
- [ ] npm run build
- [ ] 対象URLをブラウザで確認
- [ ] 実顧客データ・秘密情報を含まない

## 既知の制限
- 
```

