import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Cloudflare Workers 向けのビルド設定。
 *
 * Vercel でのビルド（`next build`）には影響しない。移行が終わるまでは
 * どちらの環境にも出せる状態を保つ。
 */
export default defineCloudflareConfig();
