import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Cloudflare D1 への入口。
 *
 * Vercel 上や、バインディングが未設定の環境では null を返す。呼び出し側は
 * null のときに従来どおりの動き（デモモード）へ落ちること。移行が終わるまでは
 * どちらの環境でも動く状態を保つ。
 */
export async function getDb(): Promise<D1Database | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.DB ?? null;
  } catch {
    // Cloudflare の外で動いている。
    return null;
  }
}
