import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findOperatorBySession, isDatabaseReady, SESSION_COOKIE } from "@/server/operatorAuth";
import { addSafetyNote, listSafetyNotes, removeSafetyNote } from "@/server/safetyNoteRepository";

/**
 * 禁忌・注意事項。
 *
 * 利用者に紐づく健康上の情報なので、ログインしている施術者にのみ返す。
 * D1 が未接続の環境では 503 を返し、呼び出し側は画面内の保持だけで続ける。
 */
export const dynamic = "force-dynamic";

async function currentOperator() {
  const store = await cookies();
  return findOperatorBySession(store.get(SESSION_COOKIE)?.value ?? "");
}

export async function GET(request: Request) {
  if (!(await isDatabaseReady())) {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
  if (!(await currentOperator())) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const clientId = new URL(request.url).searchParams.get("clientId") ?? "";
  if (!clientId) {
    return NextResponse.json({ error: "利用者が指定されていません。" }, { status: 400 });
  }
  return NextResponse.json({ notes: (await listSafetyNotes(clientId)) ?? [] });
}

export async function POST(request: Request) {
  if (!(await isDatabaseReady())) {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
  if (!(await currentOperator())) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  let body: { clientId?: unknown; label?: unknown; severity?: unknown; guidance?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "入力を読み取れませんでした。" }, { status: 400 });
  }

  const clientId = typeof body.clientId === "string" ? body.clientId : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!clientId || !label) {
    return NextResponse.json({ error: "利用者と注意事項は必須です。" }, { status: 400 });
  }

  const notes = await addSafetyNote({
    clientId,
    label: label.slice(0, 200),
    // 重さと案内文は画面が定型文から引き当てたもの。想定外の値は既定に寄せる。
    severity: body.severity === "要確認" ? "要確認" : "注意",
    guidance: typeof body.guidance === "string" ? body.guidance.slice(0, 500) : "",
  });
  return NextResponse.json({ notes: notes ?? [] });
}

export async function DELETE(request: Request) {
  if (!(await isDatabaseReady())) {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
  if (!(await currentOperator())) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const clientId = params.get("clientId") ?? "";
  const label = params.get("label") ?? "";
  if (!clientId || !label) {
    return NextResponse.json({ error: "利用者と注意事項は必須です。" }, { status: 400 });
  }

  const notes = await removeSafetyNote(clientId, label);
  return NextResponse.json({ notes: notes ?? [] });
}
