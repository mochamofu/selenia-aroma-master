"use client";

import { useEffect, useState } from "react";
import { getStoredSession } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import { getProfile } from "@/services/profileService";
import type { UserRole } from "@/types/profile";

/**
 * 閲覧者のロールだけを取得する。`useAuth` と違い、未ログインでもリダイレクトしない。
 *
 * 用途は「表示範囲の出し分け」のみ。ここで返るロールは表示制御にしか使わず、
 * 内部配合比率のような機密は必ずサーバー側（RLS）で再判定すること。
 */
export function useViewerRole(): { role: UserRole | null; loading: boolean } {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          const user = data.session?.user;
          if (!user) return;
          const profile = await getProfile(user.id);
          if (mounted) setRole(profile?.role ?? "customer");
          return;
        }
        const demoSession = getStoredSession();
        if (mounted) setRole(demoSession?.role ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return { role, loading };
}
