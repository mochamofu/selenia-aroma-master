import { redirect } from "next/navigation";

export default function AdminNewAromaRedirectPage() {
  redirect("/operator/blend-records/new");
}
