import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getMeasurementImage } from "@/server/measurementImageStore";
import { findOperatorBySession, SESSION_COOKIE } from "@/server/operatorAuth";
import { isRegisteredImageKey } from "@/server/visitRepository";

/**
 * 測定画像の配信。R2 に置いた実体を、ログインしている施術者にだけ返す。
 *
 * URL にオブジェクトキーが現れるため、キーを組み立て直して無関係なものを
 * 引けないよう、カルテに登録済みのキーであることを必ず確かめてから返す。
 */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const store = await cookies();
  const operator = await findOperatorBySession(store.get(SESSION_COOKIE)?.value ?? "");
  if (!operator) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const { key } = await context.params;
  const objectKey = key.map((part) => decodeURIComponent(part)).join("/");
  if (!(await isRegisteredImageKey(objectKey))) {
    return NextResponse.json({ error: "画像が見つかりません。" }, { status: 404 });
  }

  const object = await getMeasurementImage(objectKey);
  if (!object) {
    return NextResponse.json({ error: "画像が見つかりません。" }, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "Content-Length": String(object.size),
      // 利用者に紐づく画像なので、共有のキャッシュには残さない。
      "Cache-Control": "private, max-age=3600",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
