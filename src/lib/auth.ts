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
 * 登録した組み合わせに一致したときだけログインできる。以前はメールに "admin" を
 * 含むかどうかで管理者を決め、それ以外は誰でも入れる作りだったため、URLを知って
 * いれば無関係の人も入れてしまった。社外へ共有する前提で、メールとパスワードの
 * 両方の一致を必須にしている。
 *
 * ここは画面確認用の仕組みで、本番運用では正式な認証に置き換える。
 * 共有相手を増やすときはこの表に行を足す。
 *
 * パスワードは口頭でも伝えられる長さにしている。試用段階の画面で、扱うのは
 * 架空のデータだけであり、入力しにくさのほうが実害が大きいと判断した。
 * 実データを扱う段階では、この仕組みごと正式な認証に置き換える。
 */
const DEMO_ACCOUNTS: Record<string, { password: string; role: UserRole; userId: string }> = {
  // サロン管理者。内部配合比率まで表示される。
  "admin@selenia": {
    password: "selenia2026",
    role: "admin",
    userId: "user-admin",
  },
  // 社外共有用。内部配合比率は表示されない。
  "partner@selenia": {
    password: "selenia",
    role: "instructor",
    userId: "user-instructor",
  },
};

export class DemoLoginError extends Error {}

function resolveDemoAccount(
  email: string,
  password: string,
): { userId: string; role: UserRole } {
  const account = DEMO_ACCOUNTS[email.trim().toLowerCase()];
  if (!account || account.password !== password) {
    throw new DemoLoginError("メールアドレスまたはパスワードが違います。");
  }
  return { userId: account.userId, role: account.role };
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
