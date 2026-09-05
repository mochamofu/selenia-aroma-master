"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
/**
 * デモモードの判定。
 *
 * 設定画面で値を入力するとき、前後に空白や改行が混ざることがある。
 * 厳密一致にしていると、見た目は true でも無効になり、原因が分かりにくい。
 * 空白を落とし、大文字小文字も問わない。
 */
export const isDemoModeEnabled =
  (process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE ?? "").trim().toLowerCase() === "true";

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * デモモードは Supabase より優先する。
 *
 * 環境変数に Supabase の URL とキーが残っていても、NEXT_PUBLIC_ENABLE_DEMO_MODE=true の
 * 間は Supabase へ一切リクエストを送らない。検証中に Supabase の利用料が発生するのを
 * 防ぐためで、ログイン画面そのものは残したまま仮ログインで通せるようにしている。
 *
 * 本番運用に切り替えるときは NEXT_PUBLIC_ENABLE_DEMO_MODE を false（または未設定）にする。
 */
export const supabase =
  hasSupabaseEnv && !isDemoModeEnabled
    ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
    : null;
