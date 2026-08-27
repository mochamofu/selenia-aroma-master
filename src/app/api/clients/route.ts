import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { listClients } from "@/server/clientRepository";
import { findOperatorBySession, isDatabaseReady, SESSION_COOKIE } from "@/server/operatorAuth";

/**
 * 利用者一覧。
 *
 * 氏名は個人情報なので、ログインしている施術者にのみ返す。
 * D1 が未接続の環境では 503 を返し、呼び出し側が従来のデモデータへ落ちる。
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isDatabaseReady())) {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }

  const store = await cookies();
  const operator = await findOperatorBySession(store.get(SESSION_COOKIE)?.value ?? "");
  if (!operator) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const clients = await listClients();
  return NextResponse.json({ clients: clients ?? [] });
}
