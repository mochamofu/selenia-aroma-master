import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findOperatorBySession, isDatabaseReady, SESSION_COOKIE } from "@/server/operatorAuth";
import {
  DEFAULT_SALON_SETTINGS,
  getSalonSettings,
  saveSalonSettings,
} from "@/server/salonSettingsRepository";

/**
 * サロン共通の設定。
 *
 * 読むのはログインしていれば誰でも。書き換えは管理者だけにする。
 * 保管期間や測定の既定値を各地の講師が個別に変えられると、運用が揃わない。
 *
 * D1 が未接続の環境では 503 を返し、呼び出し側は端末の設定で動く。
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
  return NextResponse.json({ settings: await getSalonSettings() });
}

export async function PUT(request: Request) {
  if (!(await isDatabaseReady())) {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
  const operator = await currentOperator();
  if (!operator) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  if (operator.role !== "admin") {
    return NextResponse.json({ error: "この設定は管理者のみ変更できます。" }, { status: 403 });
  }

  let body: {
    salonName?: unknown;
    measurementMinutes?: unknown;
    pairedMeasurement?: unknown;
    retentionMonths?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "入力を読み取れませんでした。" }, { status: 400 });
  }

  // 桁の外れた値を入れられると保管期間の運用が崩れるので、ここで丸める。
  const minutes = Number(body.measurementMinutes);
  const months = Number(body.retentionMonths);
  const settings = {
    salonName:
      typeof body.salonName === "string" && body.salonName.trim()
        ? body.salonName.trim().slice(0, 100)
        : DEFAULT_SALON_SETTINGS.salonName,
    measurementMinutes: Number.isFinite(minutes)
      ? Math.min(Math.max(Math.round(minutes), 1), 60)
      : DEFAULT_SALON_SETTINGS.measurementMinutes,
    pairedMeasurement: Boolean(body.pairedMeasurement),
    retentionMonths: Number.isFinite(months)
      ? Math.min(Math.max(Math.round(months), 1), 120)
      : DEFAULT_SALON_SETTINGS.retentionMonths,
  };

  return NextResponse.json({ settings: await saveSalonSettings(settings) });
}
