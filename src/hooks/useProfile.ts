"use client";

import { useEffect, useState } from "react";
import { getProfile } from "@/services/profileService";
import type { Profile } from "@/types/profile";

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    getProfile(userId)
      .then(setProfile)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  return { profile, loading, error };
}
