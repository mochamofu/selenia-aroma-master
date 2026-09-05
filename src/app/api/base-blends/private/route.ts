import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  demoPrivateBaseBlendRecipes,
  listPrivateBaseRecipes,
} from "@/server/baseBlendPrivateRecipes";
import { findOperatorBySession, isDatabaseReady, SESSION_COOKIE } from "@/server/operatorAuth";

/**
 * ベースブレンドの内部配合比率を返す、管理者限定の経路。
 *
 * 比率はクライアントのバンドルに含めず、ここからだけ渡す。誰が読めるかは
 * Cookie のセッションから毎回サーバー側で引き直して判定するので、画面側の
 * 表示フラグを書き換えても取得できない。
 *
 * 保存先（D1）が無い環境では、画面の動きを確かめるための架空の値を返す。
 * その場合は権限判定を通らないため、実際の比率をそこへ置かないこと。
 */

export const dynamic = "force-dynamic";

export async function GET() {
  // 保存先が無い環境（移行前の配信先など）は、架空の値で画面だけ動かす。
  if (!(await isDatabaseReady())) {
    return NextResponse.json({
      source: "demo" as const,
      recipes: demoPrivateBaseBlendRecipes,
    });
  }

  const store = await cookies();
  const operator = await findOperatorBySession(store.get(SESSION_COOKIE)?.value ?? "");
  if (!operator) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  if (operator.role !== "admin") {
    return NextResponse.json(
      { error: "内部配合比率を参照する権限がありません。" },
      { status: 403 },
    );
  }

  const recipes = await listPrivateBaseRecipes();
  return NextResponse.json({ source: "database" as const, recipes: recipes ?? [] });
}
