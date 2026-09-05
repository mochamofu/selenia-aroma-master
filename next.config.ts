import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

/**
 * `next dev` から Cloudflare のバインディング（D1 など）を触れるようにする。
 *
 * これを入れておくと、開発中も本番と同じ経路でデータベースを読み書きできる。
 * 本番のビルドには影響しない。
 */
if (process.env.NODE_ENV === "development") {
  void initOpenNextCloudflareForDev();
}
