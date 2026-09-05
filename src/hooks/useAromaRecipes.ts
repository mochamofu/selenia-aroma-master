"use client";

import { useCallback, useEffect, useState } from "react";
import { loadRecipes, saveRecipes, type AromaRecipe } from "@/lib/aromaRecipes";

/**
 * アロマレシピ（よく使う型）の一覧と出し入れ。
 *
 * 保存先（D1）が使えればそちらを、まだ繋がっていなければこれまでどおり
 * この端末のブラウザを使う。移行の途中でもどちらの環境でも画面が成立する。
 *
 * サーバー側では「実績」を制作記録から数えて返す。端末側には数える相手が
 * 無いので、登録時の 0 のままになる。
 */

export type AromaRecipesState = {
  recipes: AromaRecipe[];
  loading: boolean;
  /** D1 から取得したものか、この端末のものか。画面の注意書きに使う。 */
  source: "database" | "device";
  add: (recipe: AromaRecipe) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

async function fetchRecipes(): Promise<AromaRecipe[] | null> {
  try {
    const response = await fetch("/api/recipes");
    if (!response.ok) return null;
    const body = (await response.json()) as { recipes?: AromaRecipe[] };
    return body.recipes ?? null;
  } catch {
    return null;
  }
}

/** サーバーへ1件送る。受け付けられたら true。 */
async function postRecipe(recipe: AromaRecipe): Promise<boolean> {
  try {
    const response = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recipe),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 画面の一覧を持たない場所（カルテなど）から1件だけ登録する。
 * サーバーが使えなければ、この端末の一覧に足す。
 */
export async function saveAromaRecipe(
  recipe: AromaRecipe,
): Promise<"database" | "device"> {
  if (await postRecipe(recipe)) return "database";
  saveRecipes([recipe, ...loadRecipes()]);
  return "device";
}

export function useAromaRecipes(): AromaRecipesState {
  const [recipes, setRecipes] = useState<AromaRecipe[]>([]);
  const [source, setSource] = useState<"database" | "device">("device");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void fetchRecipes().then((fromDatabase) => {
      if (cancelled) return;
      if (fromDatabase) {
        setRecipes(fromDatabase);
        setSource("database");
      } else {
        setRecipes(loadRecipes());
        setSource("device");
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const add = useCallback(async (recipe: AromaRecipe) => {
    if (await postRecipe(recipe)) {
      const fromDatabase = await fetchRecipes();
      if (fromDatabase) {
        setRecipes(fromDatabase);
        setSource("database");
        return;
      }
    }
    setRecipes((current) => {
      const next = [recipe, ...current];
      saveRecipes(next);
      return next;
    });
    setSource("device");
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/recipes?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (response.ok) {
        const fromDatabase = await fetchRecipes();
        if (fromDatabase) {
          setRecipes(fromDatabase);
          setSource("database");
          return;
        }
      }
    } catch {
      // サーバーが使えないときは端末側から消して続ける。
    }
    setRecipes((current) => {
      const next = current.filter((recipe) => recipe.id !== id);
      saveRecipes(next);
      return next;
    });
    setSource("device");
  }, []);

  return { recipes, loading, source, add, remove };
}
