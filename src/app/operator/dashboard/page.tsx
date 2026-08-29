import { redirect } from "next/navigation";

// ダッシュボードは /operator/dashboard から /operator へ移した。
// 施術者がURLを直接開いたときの入口はダッシュボードであるべきなので、
// 利用者カルテは /operator/karte へ移設している。
// 既存のブックマークやリンクのためにこのパスは残す。
export default function OperatorDashboardRedirectPage() {
  redirect("/operator");
}
