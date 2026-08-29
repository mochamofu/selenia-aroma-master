import { redirect } from "next/navigation";

// 管理者ダッシュボードはスマートフォン幅の /admin から、
// PC・タブレット向けの /operator へ移設した。
export default function AdminRedirectPage() {
  redirect("/operator");
}
