import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSession,
  findOperatorByCredentials,
  isDatabaseReady,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/server/operatorAuth";

/**
 * ログイン。
 *
 * データベースが使えない環境（Vercel など移行前）では 503 を返し、
 * 呼び出し側が従来のデモモードへ落ちられるようにする。
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isDatabaseReady())) {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }

  let email = "";
  let password = "";
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    email = typeof body.email === "string" ? body.email : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "入力を読み取れませんでした。" }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: "メールアドレスとパスワードを入力してください。" },
      { status: 400 },
    );
  }

  const account = await findOperatorByCredentials(email, password);
  if (!account) {
    // どちらが違うかは伝えない。存在するメールを探る手がかりにさせないため。
    return NextResponse.json(
      { error: "メールアドレスまたはパスワードが違います。" },
      { status: 401 },
    );
  }

  // どの端末からのログインかを監査のために控える。個人の特定には使わない。
  const token = await createSession(account.id, request.headers.get("user-agent") ?? "");
  if (!token) {
    return NextResponse.json({ error: "ログインを開始できませんでした。" }, { status: 500 });
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return NextResponse.json({ account });
}
