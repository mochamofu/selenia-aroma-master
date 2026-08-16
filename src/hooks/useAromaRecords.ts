"use client";

import { useEffect, useState } from "react";
import { getAromaRecordById, getAromaRecords } from "@/services/aromaRecordsService";
import type { AromaRecord } from "@/types/aroma";

export function useAromaRecords(userId?: string, isAdmin = false) {
  const [records, setRecords] = useState<AromaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    getAromaRecords(userId, isAdmin)
      .then(setRecords)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAdmin, userId]);

  return { records, loading, error };
}

export function useAromaRecord(id: string, userId?: string, isAdmin = false) {
  const [record, setRecord] = useState<AromaRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    getAromaRecordById(id, userId, isAdmin)
      .then(setRecord)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isAdmin, userId]);

  return { record, loading, error };
}
