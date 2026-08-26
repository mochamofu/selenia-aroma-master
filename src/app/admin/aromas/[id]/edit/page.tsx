import { redirect } from "next/navigation";

export default async function AdminEditAromaRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/operator/blend-records/${id}/edit`);
}
