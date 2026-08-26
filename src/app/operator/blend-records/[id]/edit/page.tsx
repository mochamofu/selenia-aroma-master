"use client";

import { useParams } from "next/navigation";
import { AromaForm } from "@/components/AromaForm";

export default function EditBlendRecordPage() {
  const params = useParams<{ id: string }>();
  return <AromaForm mode="edit" aromaId={params.id} />;
}
