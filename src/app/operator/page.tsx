"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Droplet,
  FlaskConical,
  Layers,
  Users,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { essentialOils } from "@/data/essentialOils";
import { demoBaseBlends } from "@/data/mockData";
import { calculateAge, operatorClients } from "@/data/operatorClients";

/**
 * 管理者ダッシュボード。
 *
 * 以前は `/admin` にスマートフォン幅で置いていたが、この画面はPC・タブレットで
 * 使うものなので AdminShell 配下の業務用レイアウトへ移した。
 * `/admin` は後方互換のためここへリダイレクトする。
 */

function StatCard({
  label,
  value,
  unit,
  icon,
  href,
}: {
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--admin-primary-soft)] text-[var(--admin-primary-strong)]">
        {icon}
      </span>
      <span className="mt-3 block text-xs font-bold text-[var(--admin-text-muted)]">{label}</span>
      <span className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-[var(--admin-text)]">{value}</span>
        <span className="text-sm text-[var(--admin-text-muted)]">{unit}</span>
      </span>
    </>
  );

  const className =
    "block rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 transition";

  return href ? (
    <Link href={href} className={`${className} hover:border-[var(--admin-primary)]`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export default function OperatorDashboardPage() {
  const totalMeasurements = operatorClients.reduce((sum, c) => sum + c.measurementCount, 0);
  const totalBlends = operatorClients.reduce((sum, c) => sum + c.blendCount, 0);
  const flagged = operatorClients.filter((c) => c.safetyNotes.length > 0);

  // 最終来店が新しい順。次に対応する相手を上に出す。
  const recentClients = [...operatorClients]
    .sort((a, b) => b.lastVisitAt.localeCompare(a.lastVisitAt))
    .slice(0, 6);

  return (
    <AdminShell title="ダッシュボード" subtitle="サロン全体の状況をまとめて確認します">
      <div className="space-y-5 p-4 lg:p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="登録利用者"
            value={operatorClients.length}
            unit="名"
            icon={<Users className="h-5 w-5" />}
            href="/operator/customers"
          />
          <StatCard
            label="脳波測定"
            value={totalMeasurements}
            unit="件"
            icon={<Activity className="h-5 w-5" />}
          />
          <StatCard
            label="香り制作"
            value={totalBlends}
            unit="件"
            icon={<FlaskConical className="h-5 w-5" />}
          />
          <StatCard
            label="事前確認が必要"
            value={flagged.length}
            unit="名"
            icon={<AlertTriangle className="h-5 w-5" />}
            href="/operator/customers"
          />
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-5 py-4">
              <div>
                <h2 className="text-base font-bold">最近の来店</h2>
                <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">
                  画面に氏名は出しません。行を押すとその方のカルテが開きます。
                </p>
              </div>
              <Link
                href="/operator/customers"
                className="flex items-center gap-1 text-xs font-bold text-[var(--admin-primary-strong)]"
              >
                利用者一覧
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-primary-softer)] text-left">
                    <th scope="col" className="px-5 py-2.5 font-bold">利用者番号</th>
                    <th scope="col" className="px-5 py-2.5 font-bold">属性</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-bold">測定</th>
                    <th scope="col" className="px-5 py-2.5 font-bold">最終来店</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClients.map((client) => {
                    const age = calculateAge(client.birthday);
                    return (
                      <tr
                        key={client.id}
                        className="border-b border-[var(--admin-border)] transition last:border-b-0 hover:bg-[var(--admin-primary-softer)]"
                      >
                        <td className="px-5 py-3">
                          <Link href={`/operator?client=${client.id}`} className="flex items-center gap-2.5">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--admin-primary-soft)] text-[var(--admin-primary-strong)]">
                              <ClipboardList className="h-4 w-4" />
                            </span>
                            <span className="flex items-center gap-1.5 font-bold">
                              {client.clientNumber}
                              {client.safetyNotes.length > 0 ? (
                                <AlertTriangle
                                  className="h-3.5 w-3.5 text-[var(--admin-warning)]"
                                  aria-label="事前確認が必要"
                                />
                              ) : null}
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-[var(--admin-text-muted)]">
                          {client.gender} / {age !== null ? `${age}歳` : "-"}
                        </td>
                        <td className="px-5 py-3 text-right font-bold">{client.measurementCount}</td>
                        <td className="px-5 py-3 text-[var(--admin-text-muted)]">{client.lastVisitAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5">
              <h2 className="text-base font-bold">よく使う画面</h2>
              <div className="mt-3 grid gap-2">
                {[
                  { href: "/operator/karte", label: "利用者カルテ", icon: <ClipboardList className="h-4 w-4" /> },
                  { href: "/operator/customers", label: "利用者一覧", icon: <Users className="h-4 w-4" /> },
                  { href: "/operator/base-blends", label: "ベースブレンド一覧", icon: <Layers className="h-4 w-4" /> },
                  { href: "/operator/oils", label: "エッセンシャルオイル一覧", icon: <Droplet className="h-4 w-4" /> },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm font-bold transition hover:border-[var(--admin-primary)]"
                  >
                    <span className="text-[var(--admin-primary-strong)]">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    <ArrowRight className="h-4 w-4 text-[var(--admin-text-muted)]" />
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5">
              <h2 className="text-base font-bold">登録データ</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--admin-text-muted)]">ベースブレンド</dt>
                  <dd className="font-bold">{demoBaseBlends.length} 種</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--admin-text-muted)]">エッセンシャルオイル</dt>
                  <dd className="font-bold">{essentialOils.length} 種</dd>
                </div>
              </dl>
            </section>

            {flagged.length > 0 ? (
              <section className="rounded-xl border border-[var(--admin-warning)]/30 bg-[var(--admin-warning-soft)] p-5">
                <h2 className="flex items-center gap-2 text-base font-bold text-[var(--admin-warning)]">
                  <AlertTriangle className="h-4 w-4" />
                  事前確認が必要な利用者
                </h2>
                <ul className="mt-3 space-y-2.5">
                  {flagged.map((client) => (
                    <li key={client.id} className="text-sm leading-5">
                      <Link href={`/operator?client=${client.id}`} className="font-bold underline-offset-2 hover:underline">
                        {client.clientNumber}
                      </Link>
                      <span className="block text-xs text-[var(--admin-text-muted)]">
                        {client.safetyNotes.join(" / ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
