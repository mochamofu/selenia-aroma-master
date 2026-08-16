# 開発環境セットアップ（macOS / Windows）

最終更新: 2026年8月16日

このアプリは Next.js の Web アプリなので、**macOS でも Windows でもそのまま開発できます**。
OS 固有の仕組みは使っていません。

## 必要なもの

| | バージョン | 確認コマンド |
|---|---|---|
| Node.js | 22 系（22.16 以上で確認） | `node -v` |
| npm | Node に同梱 | `npm -v` |
| Git | 任意の新しめのもの | `git --version` |

## MacBook で初めて作業を始めるとき

### 1. Node.js を入れる

Homebrew が入っていない場合は先に入れます。

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Node のバージョンを切り替えられるようにしておくと後で楽です。

```bash
brew install nvm
mkdir -p ~/.nvm
```

`~/.zshrc` に以下を追記してターミナルを開き直します。

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$(brew --prefix)/opt/nvm/nvm.sh" ] && . "$(brew --prefix)/opt/nvm/nvm.sh"
```

そのうえで Node 22 を入れます。

```bash
nvm install 22
nvm use 22
node -v   # v22.x.x と出れば OK
```

nvm を使わない場合は `brew install node@22` でも構いません。

### 2. リポジトリを取得する

GitHub に SSH 鍵を登録していない場合は先に登録します。

```bash
ssh-keygen -t ed25519 -C "info@cocorolab.co.jp"
cat ~/.ssh/id_ed25519.pub    # 表示された内容を GitHub の Settings > SSH keys に貼る
```

クローンします。

```bash
cd ~/Documents
git clone git@github.com:mochamofu/selenia-aroma-master.git
cd selenia-aroma-master
```

HTTPS で取得する場合はこちらです。

```bash
git clone https://github.com/mochamofu/selenia-aroma-master.git
```

### 3. 依存関係を入れて起動する

```bash
npm install
npm run dev
```

`http://localhost:3000` が立ち上がります。

- 利用者向け: `http://localhost:3000/dashboard`
- 事業者向けカルテ: `http://localhost:3000/operator`

### 4. 環境変数を置く

`.env.local` をプロジェクト直下に作ります。**このファイルはコミットしません**（`.gitignore` 済み）。

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ENABLE_DEMO_MODE=true
NEXT_PUBLIC_APP_TARGET=all
```

Supabase を繋がずに画面だけ見る場合は、上2行を空のままにして
`NEXT_PUBLIC_ENABLE_DEMO_MODE=true` だけで動きます。

## Windows で作業するとき

PowerShell で同じことをします。

```powershell
winget install OpenJS.NodeJS.LTS
git clone https://github.com/mochamofu/selenia-aroma-master.git
cd selenia-aroma-master
npm install
npm run dev
```

`.env.local` は同じ内容です。メモ帳ではなく VS Code などで作ると
拡張子が `.txt` にならず確実です。

## よく使うコマンド（macOS / Windows 共通）

```bash
npm run dev      # 開発サーバー（http://localhost:3000）
npm run build    # 本番ビルド
npm run start    # ビルド結果を起動
npm run lint     # ESLint
npx tsc --noEmit # 型チェック
```

ポート3000が埋まっているときは `npm run dev:3100` で3100番を使えます。

## iPhone / iPad の実機で確認する

同じ Wi-Fi につないだうえで、開発サーバーを LAN に公開します。

```bash
npm run dev -- --hostname 0.0.0.0
```

Mac の IP アドレスを調べます。

```bash
ipconfig getifaddr en0     # 例: 192.168.1.23
```

iPhone / iPad の Safari で `http://192.168.1.23:3000/operator` を開きます。

Windows の場合は `ipconfig` で IPv4 アドレスを確認してください。
ファイアウォールでブロックされる場合は、Node.js のプライベートネットワーク通信を許可します。

### ホーム画面に追加して確認する

PWA として全画面表示になるかを見るには、Safari の共有ボタンから
「ホーム画面に追加」を選びます。アイコン・タイトル・全画面起動が
`public/manifest.json` と `src/app/layout.tsx` の設定どおりになります。

**注意: PWA の挙動は HTTPS でないと本来の形になりません。** `http://` の
LAN 直アクセスでは一部が効かないため、実際の確認は Vercel のプレビューURL
（HTTPS）で行うのが確実です。手順は[Vercelデプロイ運用](vercel-deployment.md)を参照してください。

## ビルドで Turbopack のエラーが出る場合

`npm run build` は Turbopack を使います。ネイティブバインディングが無い環境では
次のエラーが出ます。

```
Error: Turbopack is not supported on this platform because native bindings are not available.
```

macOS（Intel / Apple Silicon）と Windows x64 では通常発生しません。
発生する場合は webpack にフォールバックできます。

```bash
npx next build --webpack
```

## 複数人・複数エージェントで作業するときのルール

Codex、Claude、GLM などを併用する前提のため、以下を守ってください。

1. `main` へ直接コミットせず、`agent/<機能名>` または `feature/<機能名>` ブランチを使う
2. 作業前に `git pull` と `git status` で他の人の変更を確認する
3. `.env.local`、実顧客データ、脳波画像、内部配合比率をコミットしない
4. PR を出す前に `npm run lint` と `npx tsc --noEmit` を通す
5. 画面を変えたら、対象URLと変更前後のスクリーンショットを PR に載せる

詳細は[共同開発ガイド](repository-collaboration.md)を参照してください。
