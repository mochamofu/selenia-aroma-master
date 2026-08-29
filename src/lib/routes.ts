/**
 * 管理者・施術者向けアプリのルート定義。
 * サイドバーの項目は `@/lib/adminNav` を参照。
 */
export const routes = {
  login: "/login",
  dashboard: "/operator",
  karte: "/operator/karte",
  customers: "/operator/customers",
  blendRecords: "/operator/blend-records",
  baseBlends: "/operator/base-blends",
  oils: "/operator/oils",
} as const;
