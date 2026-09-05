import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  demoPrivateBaseBlendRecipes,
  type PrivateBaseBlendRecipe,
} from "@/server/baseBlendPrivateRecipes";

/**
 * ベースブレンドの内部配合比率を返す、管理者限定エンドポイント。
 *
 * Supabase 接続時: 呼び出し元のアクセストークンで Supabase に問い合わせ、
 * `base_blend_private_recipes` の RLS（管理者のみ）に判定を委ねる。
 * このサーバー側にサービスロールキーは置かないので、RLS を迂回する経路は存在しない。
 *
 * デモモード時: NEXT_PUBLIC_ENABLE_DEMO_MODE=true のときはデモ用の比率を返し、
 * Supabase へは問い合わせない。本番環境ではデモモードを無効にすること。
 */

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// クライアント側（supabaseClient.ts）と同じ判定にする。前後の空白は落とす。
const isDemoModeEnabled =
  (process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE ?? "").trim().toLowerCase() === "true";

function unauthorized(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function GET(request: Request) {
  // デモモードは Supabase より優先する（クライアント側の supabaseClient と同じ方針）。
  if (isDemoModeEnabled || !supabaseUrl || !supabaseAnonKey) {
    if (!isDemoModeEnabled) {
      return NextResponse.json(
        { error: "Supabaseが未設定です。管理者に確認してください。" },
        { status: 503 },
      );
    }
    return NextResponse.json({
      source: "demo" as const,
      recipes: demoPrivateBaseBlendRecipes,
    });
  }

  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!accessToken) {
    return unauthorized("ログインが必要です。");
  }

  // 匿名キー + 呼び出し元トークンで接続する。テーブルのRLSが管理者以外を弾く。
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: user, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.user) {
    return unauthorized("セッションが無効です。再度ログインしてください。");
  }

  const { data, error } = await supabase
    .from("base_blend_private_recipes")
    .select("base_blend_id, internal_ratio, private_note");

  if (error) {
    return unauthorized("内部配合比率を参照する権限がありません。");
  }

  const recipes: PrivateBaseBlendRecipe[] = (data ?? []).map((row) => ({
    baseBlendId: row.base_blend_id as string,
    internalRatio: row.internal_ratio as string,
    privateNote: (row.private_note as string) ?? "",
  }));

  // RLS で全件弾かれた場合は空配列が返る。権限なしとして扱う。
  if (recipes.length === 0) {
    return unauthorized("内部配合比率を参照する権限がありません。");
  }

  return NextResponse.json({ source: "supabase" as const, recipes });
}
