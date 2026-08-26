"use client";

import { useEffect, useState } from "react";
import { getAromaRecordById, getAromaRecords } from "@/services/aromaRecordsService";
import type { AromaRecord } from "@/types/aroma";

/**
 * 管理者表示では全件を返すので userId は不要。
 * 逆に userId も管理者フラグも無いときは取得しようがないので、
 * loading を effect の中で落とさず、ここで false に確定させる。
 * （effect 内で setState すると読み込み表示のまま止まる不具合を招いた。）
 */
function canFetch(userId: string | undefined, isAdmin: boolean) {
  return Boolean(userId) || isAdmin;
}

export function useAromaRecords(userId?: string, isAdmin = false) {
  const enabled = canFetch(userId, isAdmin);
  const [records, setRecords] = useState<AromaRecord[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getAromaRecords(userId ?? "", isAdmin)
      .then((result) => {
        if (!cancelled) setRecords(result);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, isAdmin, userId]);

  return { records, loading: enabled ? fetching : false, error };
}

export function useAromaRecord(id: string, userId?: string, isAdmin = false) {
  const enabled = canFetch(userId, isAdmin);
  const [record, setRecord] = useState<AromaRecord | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getAromaRecordById(id, userId ?? "", isAdmin)
      .then((result) => {
        if (!cancelled) setRecord(result);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, id, isAdmin, userId]);

  return { record, loading: enabled ? fetching : false, error };
}
