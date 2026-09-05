import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * 測定画像の実体を置く場所（Cloudflare R2）。
 *
 * これまで画像はブラウザの localStorage に data URL のまま入れていた。
 * 1枚あたり数百KBあるうえ localStorage の上限がおよそ5MBなので、
 * セッション数回分で頭打ちになる。実体を R2 へ出し、データベース側には
 * 置き場所（オブジェクトキー）だけを持たせる。
 *
 * R2 は転送量に課金されないため、カルテで何度見返しても費用は増えない。
 */

/** 受け付ける画像の形式。iPad のスクリーンショットは PNG、書き出しは JPEG。 */
const ALLOWED_CONTENT_TYPES = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

/** 1枚あたりの上限。iPad の全画面スクリーンショットでも 3MB は超えない。 */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function isAllowedContentType(contentType: string): boolean {
  return ALLOWED_CONTENT_TYPES.has(contentType);
}

/**
 * R2 への入口。バインディングが無い環境（Vercel、ローカルの素の next dev）では
 * null を返す。呼び出し側は null のとき従来どおり端末内に保存すること。
 */
export async function getImageBucket(): Promise<R2Bucket | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.MEASUREMENT_IMAGES ?? null;
  } catch {
    // Cloudflare の外で動いている。
    return null;
  }
}

/**
 * オブジェクトキーの組み立て。
 *
 * 利用者ごとに分けておくと、退会時にその人の画像だけをまとめて消せる。
 * 個人を推測できる文字は入れず、内部IDだけで構成する。
 */
function buildObjectKey(clientId: string, extension: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `clients/${clientId}/${today}/${crypto.randomUUID()}.${extension}`;
}

/**
 * 外から来たキーが、その利用者のものとして妥当かを確かめる。
 *
 * キーは画像の取得URLに現れる。組み立て直したキーで他人の画像を引けては
 * ならないので、読み出す前に必ずここを通す。
 */
export function isKeyOwnedBy(objectKey: string, clientId: string): boolean {
  if (objectKey.includes("..")) return false;
  return objectKey.startsWith(`clients/${clientId}/`);
}

export type StoredImage = {
  objectKey: string;
  contentType: string;
  bytes: number;
};

/** 画像を1枚置く。置けなければ null（R2 未接続）。 */
export async function putMeasurementImage(
  clientId: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<StoredImage | null> {
  const bucket = await getImageBucket();
  if (!bucket) return null;

  const extension = ALLOWED_CONTENT_TYPES.get(contentType);
  if (!extension) return null;

  const objectKey = buildObjectKey(clientId, extension);
  await bucket.put(objectKey, body, {
    httpMetadata: { contentType },
  });
  return { objectKey, contentType, bytes: body.byteLength };
}

/** 画像を1枚読む。無ければ null。 */
export async function getMeasurementImage(objectKey: string): Promise<R2ObjectBody | null> {
  const bucket = await getImageBucket();
  if (!bucket) return null;
  return await bucket.get(objectKey);
}

/** 画像をまとめて消す。測定を削除したときに実体も残さないため。 */
export async function deleteMeasurementImages(objectKeys: string[]): Promise<void> {
  if (objectKeys.length === 0) return;
  const bucket = await getImageBucket();
  if (!bucket) return;
  await bucket.delete(objectKeys);
}
