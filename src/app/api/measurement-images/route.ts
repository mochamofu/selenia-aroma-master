import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  isAllowedContentType,
  MAX_IMAGE_BYTES,
  putMeasurementImage,
} from "@/server/measurementImageStore";
import { findOperatorBySession, SESSION_COOKIE } from "@/server/operatorAuth";

/**
 * 測定画像の取り込み口。1回の呼び出しで1枚を R2 に置き、置き場所を返す。
 *
 * 1枚ずつ分けているのは、14枚を1度に送ると途中で切れたときにどこまで
 * 入ったのか分からなくなるため。失敗した枚だけ送り直せる。
 *
 * R2 が未接続の環境では 503 を返し、呼び出し側は従来どおり端末内に保存する。
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const store = await cookies();
  const operator = await findOperatorBySession(store.get(SESSION_COOKIE)?.value ?? "");
  if (!operator) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "画像を読み取れませんでした。" }, { status: 400 });
  }

  const clientId = String(form.get("clientId") ?? "");
  const file = form.get("file");
  if (!clientId || !(file instanceof File)) {
    return NextResponse.json({ error: "利用者と画像は必須です。" }, { status: 400 });
  }
  if (!isAllowedContentType(file.type)) {
    return NextResponse.json(
      { error: "PNG・JPEG・WebP のいずれかで取り込んでください。" },
      { status: 415 },
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "画像1枚の容量が大きすぎます。" }, { status: 413 });
  }

  const stored = await putMeasurementImage(clientId, await file.arrayBuffer(), file.type);
  if (!stored) {
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }

  return NextResponse.json({ objectKey: stored.objectKey, bytes: stored.bytes });
}
