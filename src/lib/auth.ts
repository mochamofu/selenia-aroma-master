"use client";

import { isDemoModeEnabled, supabase } from "./supabaseClient";
import type { UserRole } from "@/types/profile";

/**
 * 管理者・施術者向けアプリの認証。
 * 利用者（購入者）向けアプリは別リポジトリのため、利用者専用のゲスト
 * セッション生成やロール振り分けはここには置かない。
 */

const STORAGE_KEY = "aroma-demo-session";

export type AuthSession = {
  userId: string;
  email: string;
  role: UserRole;
};

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    // 壊れた値が残っている場合は捨てる（ログイン不能になるのを防ぐ）
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
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

  // デモモードでは、メールに admin を含むかどうかでロールを決める。
  const role: UserRole = email.includes("admin") ? "admin" : "instructor";
  const userId = role === "admin" ? "user-admin" : "user-instructor";
  const session: AuthSession = { userId, email, role };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return { user: { id: userId, email }, role };
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}
