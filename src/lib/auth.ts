"use client";

import { isDemoModeEnabled, supabase } from "./supabaseClient";
import type { UserRole } from "@/types/profile";

/**
 * 管理者・施術者向けアプリの認証。
 * 利用者（購入者）向けアプリは別リポジトリのため、利用者専用のゲスト
 * セッション生成やロール振り分けはここには置かない。
 */

const STORAGE_KEY = "aroma-demo-session";

/**
 * デモモードのアカウント。
 *
 * 以前はメールに "admin" が入っているかどうかで管理者を決めていたが、
 * 社外の方に見ていただく際、その規則を知られると誰でも管理者になれてしまう。
 * 管理者はメールとパスワードの両方が一致したときだけにし、それ以外は
 * 認定インストラクターとして入る（内部配合比率は表示されない）。
 *
 * ここは画面確認用の仕組みで、本番では Supabase の認証を使う。
 */
const DEMO_ADMIN = {
  email: "admin@selenia.local",
  password: "selenia-admin",
  userId: "user-admin",
};

function resolveDemoAccount(
  email: string,
  password: string,
): { userId: string; role: UserRole } {
  const isAdmin =
    email.trim().toLowerCase() === DEMO_ADMIN.email && password === DEMO_ADMIN.password;
  return isAdmin
    ? { userId: DEMO_ADMIN.userId, role: "admin" }
    : { userId: "user-instructor", role: "instructor" };
}

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

  const account = resolveDemoAccount(email, password);
  const session: AuthSession = { userId: account.userId, email, role: account.role };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return { user: { id: account.userId, email }, role: account.role };
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}
