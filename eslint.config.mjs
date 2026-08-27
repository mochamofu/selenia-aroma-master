import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cloudflare 向けのビルド成果物。生成物なので検査しない。
    ".open-next/**",
    ".wrangler/**",
    // wrangler types が生成する型定義。手で直さないので検査しない。
    "worker-configuration.d.ts",
  ]),
]);

export default eslintConfig;
