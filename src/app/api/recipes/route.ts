import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findOperatorBySession, isDatabaseReady, SESSION_COOKIE } from "@/server/operatorAuth";
import { createRecipe, deleteRecipe, listRecipes } from "@/server/recipeRepository";

/**
 * アロマレシピ（よく使う型）。
 *
 * 各地の講師が同じ型を引けるよう、サロン全体で1つの一覧として扱う。
 * D1 が未接続の環境では 503 を返し、呼び出し側は端末の内容で動く。
 */
export const dynamic = "force-dynamic";

async function currentOperator() {
  const store = await cookies();
  return findOperatorBySession(store.get(SESSION_COOKIE)?.value ?? "");
}

export async function GET() {
  if (!(await isDatabaseReady())) {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
  if (!(await currentOperator())) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  return NextResponse.json({ recipes: (await listRecipes()) ?? [] });
}

export async function POST(request: Request) {
  if (!(await isDatabaseReady())) {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
  const operator = await currentOperator();
  if (!operator) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  let body: {
    name?: unknown;
    baseBlendId?: unknown;
    baseAmountUl?: unknown;
    oils?: unknown;
    purposeTags?: unknown;
    note?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "入力を読み取れませんでした。" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const baseBlendId = typeof body.baseBlendId === "string" ? body.baseBlendId : "";
  if (!name || !baseBlendId) {
    return NextResponse.json({ error: "型の名前とベースは必須です。" }, { status: 400 });
  }

  const oils = Array.isArray(body.oils)
    ? body.oils
        .map((entry) => entry as { name?: unknown; amountUl?: unknown })
        .map((oil) => ({
          name: typeof oil.name === "string" ? oil.name : "",
          amountUl: Number(oil.amountUl),
        }))
        .filter((oil) => oil.name && Number.isFinite(oil.amountUl) && oil.amountUl > 0)
    : [];

  const purposeTags = Array.isArray(body.purposeTags)
    ? body.purposeTags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    : [];

  const baseAmountUl = Number(body.baseAmountUl);
  const id = await createRecipe(
    {
      name,
      baseBlendId,
      baseAmountUl: Number.isFinite(baseAmountUl) && baseAmountUl > 0 ? baseAmountUl : 3000,
      oils,
      purposeTags,
      note: typeof body.note === "string" ? body.note : "",
    },
    operator.id,
  );

  return NextResponse.json({ id });
}

export async function DELETE(request: Request) {
  if (!(await isDatabaseReady())) {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
  if (!(await currentOperator())) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ error: "型が指定されていません。" }, { status: 400 });
  }

  await deleteRecipe(id);
  return NextResponse.json({ ok: true });
}
