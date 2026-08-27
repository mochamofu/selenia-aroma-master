import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createBlendRecord, listBlendRecords } from "@/server/blendRecordRepository";
import { findOperatorBySession, isDatabaseReady, SESSION_COOKIE } from "@/server/operatorAuth";

/**
 * 香り制作記録。
 *
 * 利用者に紐づく情報なので、ログインしている施術者にのみ返す。
 * D1 が未接続の環境では 503 を返し、呼び出し側が従来どおり画面内に保持する。
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
  const operator = await currentOperator();
  if (!operator) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const clientId = new URL(request.url).searchParams.get("clientId") ?? "";
  if (!clientId) {
    return NextResponse.json({ error: "利用者が指定されていません。" }, { status: 400 });
  }

  const records = await listBlendRecords(clientId);
  return NextResponse.json({ records: records ?? [] });
}

export async function POST(request: Request) {
  if (!(await isDatabaseReady())) {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
  const operator = await currentOperator();
  if (!operator) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  let body: {
    clientId?: unknown;
    title?: unknown;
    madeOn?: unknown;
    baseBlendId?: unknown;
    totalVolumeMl?: unknown;
    lotNumber?: unknown;
    makerNote?: unknown;
    items?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "入力を読み取れませんでした。" }, { status: 400 });
  }

  const clientId = typeof body.clientId === "string" ? body.clientId : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!clientId || !title) {
    return NextResponse.json({ error: "利用者と制作名は必須です。" }, { status: 400 });
  }

  const items = Array.isArray(body.items)
    ? body.items
        .map((item) => item as { name?: unknown; amountUl?: unknown })
        .map((item) => ({
          name: typeof item.name === "string" ? item.name : "",
          amountUl: Number(item.amountUl),
        }))
        .filter((item) => item.name && Number.isFinite(item.amountUl) && item.amountUl > 0)
    : [];

  const id = await createBlendRecord({
    clientId,
    operatorId: operator.id,
    title,
    madeOn: typeof body.madeOn === "string" ? body.madeOn : new Date().toISOString().slice(0, 10),
    baseBlendId: typeof body.baseBlendId === "string" ? body.baseBlendId : "",
    totalVolumeMl: Number.isFinite(Number(body.totalVolumeMl)) ? Number(body.totalVolumeMl) : 0,
    lotNumber: typeof body.lotNumber === "string" ? body.lotNumber : "",
    makerNote: typeof body.makerNote === "string" ? body.makerNote : "",
    items,
  });

  return NextResponse.json({ id });
}
