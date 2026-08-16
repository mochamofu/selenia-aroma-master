import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Selenia Aroma",
  description: "脳波測定にもとづくアロマ制作記録とカルテ管理",
  manifest: "/manifest.json",
  // iOS のホーム画面追加でアイコン・タイトル・ステータスバーを制御する。
  // iOS は manifest の icons を読まないため、apple-touch-icon が別途必要。
  appleWebApp: {
    capable: true,
    title: "Selenia",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // iOS Safari が電話番号・日付を勝手にリンク化するのを防ぐ（顧客IDやロット番号の誤変換対策）。
  formatDetection: { telephone: false, date: false, address: false },
  other: {
    // Next.js 16 は標準名の mobile-web-app-capable しか出力しない。
    // Safari 17.4 未満の iPhone / iPad はこの apple- 付きでないと
    // ホーム画面から全画面で起動しないため、明示的に補う。
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#8d6fd1",
  width: "device-width",
  initialScale: 1,
  // iPad/iPhone でのピンチズームは許可する。測定グラフを拡大して確認するため。
  maximumScale: 5,
  userScalable: true,
  // ノッチ・ホームインジケーター領域まで描画する。実際の余白は
  // globals.css の env(safe-area-inset-*) で確保している。
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
