import { redirect } from "next/navigation";

// アロマ記録一覧は /operator/blend-records（香り制作記録）へ移設した。
export default function AdminAromasRedirectPage() {
  redirect("/operator/blend-records");
}
