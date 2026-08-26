"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredSession, signOut, type AuthSession } from "@/lib/auth";
import { isDemoModeEnabled, supabase } from "@/lib/supabaseClient";
import { getProfile } from "@/services/profileService";
import type { Profile } from "@/types/profile";

/**
 * ログイン状態を取得し、未ログインなら /login へ送る。
 *
 * このリポジトリは管理者・施術者向けアプリ専用。
 * 利用者（購入者）向けアプリは別リポジトリ（selenia-aroma-user）にある。
 *
 * 以前はロールごとに /admin と /dashboard へ振り分けていたが、これが
 * 「利用者向け画面を開くと一瞬表示されてから管理者画面へ飛ぶ」原因だった。
 * 振り分けは行わない。表示範囲の出し分けは `@/lib/disclosure` が担当する。
 */
export function useAuth() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          const user = data.session?.user;
          if (!user) {
            router.replace("/login");
            return;
          }
          const currentProfile = await getProfile(user.id);
          if (!mounted) return;
          setSession({
            userId: user.id,
            email: user.email ?? "",
            role: currentProfile?.role ?? "customer",
          });
          setProfile(currentProfile);
          return;
        }

        if (!isDemoModeEnabled) {
          router.replace("/login");
          return;
        }

        const demoSession = getStoredSession();
        if (!demoSession) {
          router.replace("/login");
          return;
        }
        if (!mounted) return;
        setSession(demoSession);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [router]);

  return {
    session,
    profile,
    loading,
    logout: async () => {
      await signOut();
      router.replace("/login");
    },
  };
}
