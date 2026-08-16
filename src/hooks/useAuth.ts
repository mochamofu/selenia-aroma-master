"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createGuestCustomerSession, getDemoProfile, getStoredSession, signOut, type AuthSession } from "@/lib/auth";
import { isCustomerOnlyApp } from "@/lib/appTarget";
import { isDemoModeEnabled, supabase } from "@/lib/supabaseClient";
import { getProfile } from "@/services/profileService";
import type { Profile } from "@/types/profile";

export function useAuth(requiredRole?: "customer" | "admin") {
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
          if (isCustomerOnlyApp && currentProfile?.role === "admin") {
            await signOut();
            router.replace("/login");
            return;
          }
          setSession({ userId: user.id, email: user.email ?? "", role: currentProfile?.role ?? "customer" });
          setProfile(currentProfile);
          if (requiredRole && currentProfile?.role !== requiredRole) {
            router.replace(currentProfile?.role === "admin" ? "/admin" : "/dashboard");
          }
          return;
        }
        if (!isDemoModeEnabled) {
          router.replace("/login");
          return;
        }
        const demoSession = getStoredSession();
        if (!demoSession) {
          if (isCustomerOnlyApp) {
            const guestSession = createGuestCustomerSession();
            setSession(guestSession);
            setProfile(getDemoProfile(guestSession));
            return;
          }
          router.replace("/login");
          return;
        }
        if (isCustomerOnlyApp && demoSession.role === "admin") {
          await signOut();
          router.replace("/login");
          return;
        }
        const demoProfile = getDemoProfile(demoSession);
        setSession(demoSession);
        setProfile(demoProfile);
        if (requiredRole && demoSession.role !== requiredRole) {
          router.replace(demoSession.role === "admin" ? "/admin" : "/dashboard");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [requiredRole, router]);

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
