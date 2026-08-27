"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type PrivateBaseRecipeMap = Record<string, { ratio: string; note: string }>;

type FetchState = {
  recipes: PrivateBaseRecipeMap;
  loading: boolean;
  /** 権限がなく取得できなかった場合のメッセージ。 */
  error: string | null;
  /** 実際に内部比率を保持しているか。 */
  unlocked: boolean;
  /** デモ用の架空データか、Supabase の実データか。 */
  source: "demo" | "supabase" | null;
};

const IDLE: FetchState = { recipes: {}, loading: false, error: null, unlocked: false, source: null };

/**
 * ベースブレンドの内部配合比率を取得する。
 *
 * 比率はクライアントのバンドルに含めず、`/api/base-blends/private` から取得する。
 * 権限判定は Supabase の RLS が行うため、UI 側のフラグを書き換えても比率は取得できない。
 */
export function usePrivateBaseRecipes(enabled: boolean): FetchState & { reload: () => void } {
  const [state, setState] = useState<FetchState>(IDLE);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function load() {
      try {
        const headers: HeadersInit = {};
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch("/api/base-blends/private", { headers, cache: "no-store" });
        const body = await response.json();
        if (cancelled) return;

        if (!response.ok) {
          setState({
            recipes: {},
            loading: false,
            error:
              typeof body?.error === "string" ? body.error : "内部配合比率を取得できませんでした。",
            unlocked: false,
            source: null,
          });
          return;
        }

        const recipes: PrivateBaseRecipeMap = {};
        for (const recipe of body.recipes ?? []) {
          recipes[recipe.baseBlendId] = { ratio: recipe.internalRatio, note: recipe.privateNote };
        }

        setState({
          recipes,
          loading: false,
          error: null,
          unlocked: true,
          source: body.source === "supabase" ? "supabase" : "demo",
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          recipes: {},
          loading: false,
          error: error instanceof Error ? error.message : "内部配合比率を取得できませんでした。",
          unlocked: false,
          source: null,
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled, reloadToken]);

  // 無効時は保持している比率を一切返さない。取得中かどうかも enabled から導出する。
  if (!enabled) return { ...IDLE, reload };
  if (!state.unlocked && !state.error) return { ...IDLE, loading: true, reload };

  return { ...state, reload };
}
