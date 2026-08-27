import { NextResponse, type NextRequest } from "next/server";

/**
 * このリポジトリは管理者・施術者向けアプリ専用になったため、
 * 以前あった「利用者専用モードでは /admin と /operator を塞ぐ」処理は削除した。
 *
 * ミドルウェア自体は将来の共通処理（アクセスログ、メンテナンス表示など）の
 * 差し込み口として残している。
 */
export function proxy(request: NextRequest) {
  void request;
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/operator/:path*"],
};
