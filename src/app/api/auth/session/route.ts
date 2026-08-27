import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findOperatorBySession, isDatabaseReady, SESSION_COOKIE } from "@/server/operatorAuth";

/** 現在のログイン状態。Cookie のセッションIDから毎回引き直す。 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isDatabaseReady())) {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }

  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value ?? "";
  const account = await findOperatorBySession(sessionId);
  return NextResponse.json({ account });
}
