# Selenia Aroma Webアプリ仕様書

作成日: 2026年7月7日  
対象: 先行開発するWebアプリ版  
位置づけ: iOS/Androidアプリ化前に提供する本番運用向けWebアプリ仕様

## 1. 前提

当初はiOSアプリを想定してUI・導線を検討していたが、開発スケジュールの都合により、まずはWebアプリとして提供する。

本仕様書は、既存デモアプリとは切り分けて、Webアプリとして本番運用するための仕様を定義する。

既存デモアプリは参考実装として残し、Webアプリ版では認証、データベース、権限、運用導線を本番前提に整備する。

## 2. Webアプリ版の目的

Selenia Aroma購入者が、スマートフォンのブラウザから以下を確認できるようにする。

- 自分専用のアロマ制作記録
- ベースブレンド情報
- 追加されたアロマオイル
- 使用メモ
- 注意事項
- 再購入導線
- 気分・目的別の精油情報

管理者は、顧客ごとの制作記録を登録・管理できる。

## 3. 提供形態

### 3.1 初期提供形態

スマートフォン最適化Webアプリとして提供する。

想定URL:

- 仮: `https://selenia-aroma.vercel.app`
- 本番: 独自ドメイン取得後に変更

### 3.2 PWA対応

Webアプリ版ではPWA対応を行う。

対応内容:

- ホーム画面追加
- アプリアイコン
- スプラッシュ相当の表示
- モバイルファーストUI

初期段階では、App Store / Google Play での配布は行わない。

## 4. 対象端末

優先:

- iPhone Safari
- Android Chrome

対応:

- PCブラウザ
- タブレットブラウザ

PCではスマートフォン幅の中央寄せ表示を基本とする。

## 5. ユーザー種別

### 5.1 customer

購入者。

権限:

- 自分のプロフィールのみ閲覧・更新可能
- 自分に紐づく公開済みアロマ記録のみ閲覧可能
- 自分のお気に入りのみ登録・削除可能
- 管理者画面にはアクセス不可

### 5.2 admin

管理者。

権限:

- 顧客一覧の閲覧
- 顧客プロフィールの管理
- アロマ制作記録の作成・編集・削除
- 商品画像の登録
- 再購入URLの設定
- ベースブレンドの管理
- 精油図鑑データの管理

## 6. 認証仕様

### 6.1 認証方式

Supabase Authを使用する。

初期対応:

- メールアドレス
- パスワード

将来対応候補:

- パスワードリセット
- 招待メール
- Magic Link
- SMS認証

### 6.2 ロール別リダイレクト

ログイン後:

- customer: `/dashboard`
- admin: `/admin`

未ログイン時:

- `/login` へリダイレクト

### 6.3 デモモード

ローカル確認・仮公開用にデモモードを用意する。

環境変数:

```env
NEXT_PUBLIC_ENABLE_DEMO_MODE=true
```

本番では必ず以下にする。

```env
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
```

## 7. 画面仕様

### 7.1 `/login`

ログイン画面。

必要項目:

- ブランド名
- メールアドレス
- パスワード
- ログインボタン
- エラー表示
- ローディング表示

### 7.2 `/dashboard`

購入者ホーム。

目的:

ログイン後に次の行動がすぐ分かる行動ハブ。

必要項目:

- あいさつ
- 通知アイコン
- プロフィール導線
- おすすめカード
- 最近の記録
- 再購入導線
- 気分から探す
- ベースブレンド図鑑
- 精油図鑑

### 7.3 `/aromas`

アロマ記録一覧。

必要項目:

- 検索
- フィルター
- すべて
- お気に入り
- 使用頻度順
- 2カラムカード
- 空状態

### 7.4 `/aromas/[id]`

アロマ記録詳細。

必要項目:

- タイトル
- サブコピー
- 制作日
- テーマ
- 気分・目的
- ベースブレンド
- ベースブレンド使用量
- 含まれる精油
- 追加したオイル
- 追加滴数
- ブレンドメモ
- 使用方法
- 注意事項
- 脳波データ連携ID
- 再購入ボタン

非表示項目:

- ベースブレンドの配合比率

### 7.5 `/aromas/[id]/reorder`

再購入確認。

必要項目:

- 外部サイト移動案内
- 商品カード
- 外部ショップボタン
- 注意書き

### 7.6 `/moods`

気分・目的から探す。

必要項目:

- リラックスしたい
- よく眠りたい
- 集中したい
- 元気になりたい
- 気分を上げたい
- リフレッシュしたい
- 精油図鑑導線
- ベースブレンド図鑑導線

### 7.7 `/moods/[mood]`

気分別の精油・記録一覧。

必要項目:

- 目的に合う一般精油
- 自分の記録

### 7.8 `/oils/[slug]`

精油個別ページ。

必要項目:

- 精油名
- 学名
- 科名
- 香りのノート
- 香りの特徴
- よく使われるシーン
- 相性の良い精油
- 注意事項

注意:

医療効能として断定しない。香り選びの参考情報として表現する。

### 7.9 `/base-blends`

ベースブレンド図鑑。

必要項目:

- 12種類のベースブレンド一覧
- ブレンド番号
- 仮名
- 目的タグ

### 7.10 `/base-blends/[id]`

ベースブレンド詳細。

必要項目:

- ブレンド番号
- 仮名
- 含まれる精油
- 目的
- 関連する自分の記録

非表示:

- 配合比率

### 7.11 `/profile`

プロフィール画面。

必要項目:

- 名前
- 会員登録日
- お気に入り
- 好みの香りタイプ
- 使用頻度の高い時間帯
- アカウント設定
- 通知設定
- ヘルプ
- ログアウト

### 7.12 `/admin`

管理者ダッシュボード。

必要項目:

- 顧客数
- アロマ記録数
- 今月の新規記録
- 最近の記録
- 新規作成導線

### 7.13 `/admin/aromas/new`

管理者用アロマ記録作成。

必要項目:

- 顧客選択
- タイトル
- サブコピー
- テーマ
- ロット番号 / 投資番号
- 気分
- 目的
- 制作日
- ベースブレンド
- ベースブレンド使用量
- 脳波データ連携ID
- 商品画像
- 追加するオイル
- 滴数
- 単位
- ブレンドメモ
- 使用方法
- 注意事項
- 再購入URL
- 公開状態
- 保存
- 下書き保存

## 8. データベース仕様

### 8.1 profiles

顧客・管理者プロフィール。

主な項目:

- id
- user_id
- name
- avatar_url
- role
- created_at

### 8.2 aroma_records

アロマ制作記録。

主な項目:

- id
- user_id
- blend_lot_number
- base_blend_id
- base_blend_name
- base_blend_volume_ml
- brainwave_profile_id
- title
- subtitle
- concept
- mood
- purpose
- blend_notes
- usage_notes
- caution_notes
- product_image_url
- reorder_url
- price
- volume
- status
- made_at

### 8.3 aroma_ingredients

追加したアロマオイル。

主な項目:

- id
- aroma_record_id
- name
- amount
- unit
- sort_order

### 8.4 base_blends

公開用ベースブレンド情報。

主な項目:

- id
- code
- name
- description
- public_ingredients
- benefits
- color

### 8.5 base_blend_private_recipes

管理者専用の内部レシピ情報。

主な項目:

- id
- base_blend_id
- internal_ratio
- private_note

customerには公開しない。

### 8.6 essential_oils

一般精油図鑑。

主な項目:

- id
- slug
- name
- botanical_name
- family
- scent_note
- scent_profile
- overview
- common_uses
- mood_slugs
- blends_well_with
- safety_note
- color

### 8.7 favorites

お気に入り。

主な項目:

- id
- user_id
- aroma_record_id
- created_at

## 9. セキュリティ仕様

Supabase RLSを使用する。

customer:

- 自分のprofileのみ閲覧・更新可能
- 自分に紐づくpublishedのaroma_recordsのみ閲覧可能
- 自分のお気に入りのみ作成・削除可能
- base_blendsとessential_oilsは閲覧可能
- private recipeは閲覧不可

admin:

- 全顧客を管理可能
- 全記録を作成・編集・削除可能
- base_blendsを管理可能
- private recipeを管理可能
- essential_oilsを管理可能

未ログイン:

- login以外にはアクセス不可

## 10. 画像・Storage仕様

Supabase Storageを使用する。

bucket:

- `aroma-images`

用途:

- 商品画像
- 顧客プロフィール画像

初期段階:

- プレースホルダー表示あり
- 画像未登録でも画面が破綻しない

## 11. 再購入導線

`aroma_records.reorder_url` を使用する。

詳細画面:

- 再購入するボタン

確認画面:

- 外部ショップで購入する

URL未設定時:

- ボタン非表示または「現在準備中」

## 12. 脳波データ連携方針

Webアプリ版では、まず `brainwave_profile_id` の保持・表示まで行う。

将来のカルテアプリ側で管理する想定:

- 脳波波形データ
- 測定日
- 測定条件
- 対応するアロマ記録
- 波形サマリー

連携方法候補:

- ID参照
- API連携
- 管理者画面からリンク

## 13. Webアプリ版の優先開発範囲

第1段階:

- Supabase本番接続
- ログイン/ログアウト
- 顧客別記録表示
- 管理者記録作成
- 画像保存
- 再購入URL設定

第2段階:

- 管理者編集・削除
- 顧客管理
- 精油図鑑管理
- ベースブレンド管理
- 検索・フィルター強化

第3段階:

- 脳波データ連携
- 通知
- 詳細な分析表示
- iOS/Androidアプリ化

## 14. iOS/Androidアプリ化への移行方針

Webアプリ版では、将来のReact Native / Expo移植を想定し、以下を分離する。

- UI components
- hooks
- services
- types
- data model

Web版で固めた仕様をもとに、将来的にネイティブアプリへ移植する。

## 15. 本番公開に必要なもの

- Vercelアカウント
- Supabaseアカウント
- Supabase Project URL
- Supabase anon public key
- Supabase SQL適用
- Storage bucket作成
- 管理者ユーザー作成
- 環境変数設定

環境変数:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
```

## 16. 受け入れ条件

- customerがログインできる
- customerが自分の記録だけ見られる
- adminが記録を作成できる
- ベースブレンド比率が顧客画面に表示されない
- 追加オイルと滴数が確認できる
- 再購入導線が動作する
- 精油図鑑が閲覧できる
- ベースブレンド図鑑が閲覧できる
- スマートフォンで自然に操作できる
- 本番ビルドが通る

