"use client";

import { isDemoModeEnabled, supabase } from "./supabaseClient";
import { isCustomerOnlyApp } from "./appTarget";
import { demoCustomers } from "@/data/mockData";
import type { Profile, UserRole } from "@/types/profile";

const STORAGE_KEY = "aroma-demo-session";

export type AuthSession = {
  userId: string;
  email: string;
  role: UserRole;
};

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AuthSession) : null;
}

export function getDemoProfile(session: AuthSession | null): Profile | null {
  if (!session) return null;
  return demoCustomers.find((profile) => profile.user_id === session.userId) ?? null;
}

export function createGuestCustomerSession() {
  const session: AuthSession = { userId: "user-yuka", email: "guest@selenia-aroma.local", role: "customer" };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

export async function signInWithEmail(email: string, password: string) {
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  if (!isDemoModeEnabled) {
    throw new Error("Supabaseの環境変数が未設定です。管理者に確認してください。");
  }

  const role: UserRole = isCustomerOnlyApp ? "customer" : email.includes("admin") ? "admin" : "customer";
  const userId = role === "admin" ? "user-admin" : "user-yuka";
  const session: AuthSession = { userId, email, role };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return { user: { id: userId, email }, role };
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}
