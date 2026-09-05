"use client";

import { useEffect, useState } from "react";
import { operatorClients as demoClients, type OperatorClient } from "@/data/operatorClients";

/**
 * 利用者の一覧。
 *
 * 保存先（D1）が使えればそちらを、まだ繋がっていなければデモデータを返す。
 * 移行の途中でもどちらの環境でも画面が成立するようにしている。
 */
export function useOperatorClients(): {
  clients: OperatorClient[];
  loading: boolean;
  /** D1 から取得したものか、デモデータか。画面に出す注意書きの出し分けに使う。 */
  source: "database" | "demo";
} {
  const [clients, setClients] = useState<OperatorClient[]>(demoClients);
  const [source, setSource] = useState<"database" | "demo">("demo");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/clients")
      .then(async (response) => {
        if (!response.ok) return null;
        const body = (await response.json()) as { clients?: OperatorClient[] };
        return body.clients ?? null;
      })
      .catch(() => null)
      .then((fromDatabase) => {
        if (cancelled) return;
        // 保存先が空のうちは、画面が真っ白にならないようデモデータのままにする。
        if (fromDatabase && fromDatabase.length > 0) {
          setClients(fromDatabase);
          setSource("database");
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { clients, loading, source };
}
