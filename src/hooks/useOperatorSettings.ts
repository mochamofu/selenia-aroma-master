"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  getOperatorSettingsServerSnapshot,
  getOperatorSettingsSnapshot,
  saveOperatorSettings,
  subscribeOperatorSettings,
  type OperatorSettings,
} from "@/lib/operatorSettings";

/**
 * 運用設定。サロン共通の項目はサーバー（D1）、端末で決めればよい項目は
 * これまでどおりこの端末のブラウザから読む。
 *
 * サロン名や保管期間を端末ごとに持つと、多店舗になったとき店ごとに
 * ばらついてしまう。全員で揃えるべきものはサーバーに寄せる。
 * サーバーが使えない環境では、端末の値だけで今までどおり動く。
 */

/** サーバーで揃える項目。ここに無いものは端末ごとの設定。 */
type SalonSettings = Pick<
  OperatorSettings,
  "salonName" | "measurementMinutes" | "pairedMeasurement" | "retentionMonths"
>;

export type OperatorSettingsState = {
  settings: OperatorSettings;
  /** サロン共通の項目がサーバーから来ているか。画面の注意書きに使う。 */
  source: "database" | "device";
  loading: boolean;
};

export function useOperatorSettings(): OperatorSettingsState {
  const device = useSyncExternalStore(
    subscribeOperatorSettings,
    getOperatorSettingsSnapshot,
    getOperatorSettingsServerSnapshot,
  );
  const [salon, setSalon] = useState<SalonSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/settings")
      .then(async (response) => {
        if (!response.ok) return null;
        const body = (await response.json()) as { settings?: SalonSettings | null };
        return body.settings ?? null;
      })
      .catch(() => null)
      .then((fromDatabase) => {
        if (cancelled) return;
        if (fromDatabase) setSalon(fromDatabase);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    settings: salon ? { ...device, ...salon } : device,
    source: salon ? "database" : "device",
    loading,
  };
}

/**
 * 設定の保存。サロン共通の項目はサーバーへ、端末の項目はブラウザへ。
 * サーバーが断ったときは端末側だけ保存し、どこに入ったかを返す。
 */
export function useSaveOperatorSettings(): (
  settings: OperatorSettings,
) => Promise<{ storage: "database" | "device"; error: string }> {
  return useCallback(async (settings: OperatorSettings) => {
    saveOperatorSettings(settings);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonName: settings.salonName,
          measurementMinutes: settings.measurementMinutes,
          pairedMeasurement: settings.pairedMeasurement,
          retentionMonths: settings.retentionMonths,
        }),
      });
      if (response.ok) return { storage: "database" as const, error: "" };
      if (response.status === 403) {
        const detail = (await response.json().catch(() => null)) as { error?: string } | null;
        return { storage: "device" as const, error: detail?.error ?? "" };
      }
    } catch {
      // 通信できないときは端末側の保存で続ける。
    }
    return { storage: "device" as const, error: "" };
  }, []);
}
