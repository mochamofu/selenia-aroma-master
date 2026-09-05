/**
 * `getCloudflareContext()` が返す env の型。
 *
 * バインディングの実体は wrangler types が生成する worker-configuration.d.ts の
 * `Env` にある。@opennextjs/cloudflare は `CloudflareEnv` という名前を見るため、
 * ここで結び付けている。バインディングを増やしたら `npx wrangler types` を流し直す。
 */
type CloudflareEnv = Env;
