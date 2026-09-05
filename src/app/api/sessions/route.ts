import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findOperatorBySession, isDatabaseReady, SESSION_COOKIE } from "@/server/operatorAuth";
import {
  deleteVisitMeasurements,
  findLatestVisit,
  saveVisitMeasurements,
  type NewMeasurement,
} from "@/server/visitRepository";
import { BRAINWAVE_CHANNELS, type BrainwaveChannel } from "@/types/brainwave";

/**
 * 本日のセッション（来店1回分の測定）の保存と読み出し。
 *
 * 画像の実体は先に /api/measurement-images へ送り、ここへはその置き場所と
 * 「何回目に何を試したか」だけを送る。
 *
 * D1 が未接続の環境では 503 を返し、呼び出し側は従来どおり端末内に保存する。
 */
export const dynamic = "force-dynamic";

async function currentOperator() {
  const store = await cookies();
  return findOperatorBySession(store.get(SESSION_COOKIE)?.value ?? "");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseScope(value: unknown): "trial" | "decided" {
  return value === "decided" ? "decided" : "trial";
}

/** 送られてきたチャンネル名のうち、こちらが知っているものだけを通す。 */
function parseChannels(value: unknown): BrainwaveChannel[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (channel): channel is BrainwaveChannel =>
      typeof channel === "string" && BRAINWAVE_CHANNELS.includes(channel as BrainwaveChannel),
  );
}

function parseMeasurements(value: unknown, scope: "trial" | "decided"): NewMeasurement[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => {
      const row = entry as {
        trialNo?: unknown;
        trialLabel?: unknown;
        measuredAt?: unknown;
        images?: unknown;
      };
      const images = Array.isArray(row.images) ? row.images : [];
      return {
        scope,
        trialNo: Number.isFinite(Number(row.trialNo)) ? Number(row.trialNo) : index + 1,
        trialLabel: typeof row.trialLabel === "string" ? row.trialLabel : "",
        measuredAt:
          typeof row.measuredAt === "string" && row.measuredAt
            ? row.measuredAt
            : new Date().toISOString(),
        images: images
          .map((image) => {
            const item = image as Record<string, unknown>;
            return {
              channels: parseChannels(item.channels),
              objectKey: typeof item.objectKey === "string" ? item.objectKey : "",
              contentHash: typeof item.contentHash === "string" ? item.contentHash : "",
              detectionNote: typeof item.detectionNote === "string" ? item.detectionNote : "",
              title: typeof item.title === "string" ? item.title : "",
              note: typeof item.note === "string" ? item.note : "",
              source: item.source === "sample" ? ("sample" as const) : ("upload" as const),
              uploadedAt:
                typeof item.uploadedAt === "string" && item.uploadedAt
                  ? item.uploadedAt
                  : new Date().toISOString(),
            };
          })
          // 置き場所の無い画像は記録しても開けないので落とす。
          .filter((image) => image.objectKey.length > 0),
      };
    })
    .filter((measurement) => measurement.images.length > 0);
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

  return NextResponse.json({ visit: await findLatestVisit(clientId) });
}

export async function POST(request: Request) {
  if (!(await isDatabaseReady())) {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
  const operator = await currentOperator();
  if (!operator) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  let body: { clientId?: unknown; visitedOn?: unknown; scope?: unknown; measurements?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "入力を読み取れませんでした。" }, { status: 400 });
  }

  const clientId = typeof body.clientId === "string" ? body.clientId : "";
  if (!clientId) {
    return NextResponse.json({ error: "利用者が指定されていません。" }, { status: 400 });
  }

  const scope = parseScope(body.scope);
  const visit = await saveVisitMeasurements({
    clientId,
    operatorId: operator.id,
    storeId: operator.storeId,
    visitedOn: typeof body.visitedOn === "string" && body.visitedOn ? body.visitedOn : today(),
    scope,
    measurements: parseMeasurements(body.measurements, scope),
  });

  // 店舗が1つも無いと来店を記録できない。呼び出し側は端末内の保存へ落ちる。
  if (!visit) {
    return NextResponse.json({ error: "store_unavailable" }, { status: 503 });
  }
  return NextResponse.json({ visit });
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
  if (!clientId) {
    return NextResponse.json({ error: "利用者が指定されていません。" }, { status: 400 });
  }

  await deleteVisitMeasurements(
    clientId,
    params.get("visitedOn") || today(),
    parseScope(params.get("scope")),
  );
  return NextResponse.json({ ok: true });
}
