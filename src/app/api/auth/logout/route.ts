import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deleteSession, SESSION_COOKIE } from "@/server/operatorAuth";

/** ログアウト。セッションを消し、Cookie も落とす。 */
export const dynamic = "force-dynamic";

export async function POST() {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value ?? "";
  if (sessionId) await deleteSession(sessionId);
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
