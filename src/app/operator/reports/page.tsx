"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { FileText, Printer, Search, X } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { demoBaseBlends } from "@/data/mockData";
import { calculateAge, operatorClients } from "@/data/operatorClients";
import { reportsForClient, type ReportEntry } from "@/data/operatorReports";
import {
  getOperatorSettingsServerSnapshot,
  getOperatorSettingsSnapshot,
  subscribeOperatorSettings,
} from "@/lib/operatorSettings";

/**
 * 利用者へ渡すレポートの作成画面。
 *
 * 載せる範囲は開示ポリシーの「一般公開」に合わせる。内部配合比率と
 * α〜θ の5帯域は出さない。分量も書かず、構成精油名までにとどめる。
 *
 * 出力はブラウザの印刷機能を使う。PDFはOS側の「PDFとして保存」で作れるため、
 * PDF生成ライブラリを持ち込まずに済む。
 */

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export default function OperatorReportsPage() {
  const settings = useSyncExternalStore(
    subscribeOperatorSettings,
    getOperatorSettingsSnapshot,
    getOperatorSettingsServerSnapshot,
  );

  const [query, setQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");

  // 問診中に他の方の氏名が並ばないよう、入力するまで候補を出さない。
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return operatorClients
      .filter((client) =>
        `${client.name} ${client.nameKana} ${client.clientNumber}`.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [query]);

  const client = operatorClients.find((item) => item.id === selectedClientId) ?? null;
  const reports = client ? reportsForClient(client.id) : [];
  const report: ReportEntry | null =
    reports.find((item) => item.id === selectedReportId) ?? reports[0] ?? null;
  const baseBlend = report ? demoBaseBlends.find((blend) => blend.id === report.baseBlendId) : null;

  function selectClient(id: string) {
    setSelectedClientId(id);
    setSelectedReportId("");
    setQuery("");
  }

  return (
    <AdminShell
      title="レポート出力"
      subtitle="利用者へ渡す1枚のレポートを作ります"
      actions={
        report ? (
          <button
            type="button"
            onClick={() => window.print()}
            className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[var(--admin-primary)] px-4 text-xs font-bold text-white transition hover:bg-[var(--admin-primary-strong)]"
          >
            <Printer className="h-4 w-4" />
            印刷・PDF保存
          </button>
        ) : null
      }
    >
      <div className="grid gap-4 p-4 lg:p-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="space-y-4 print:hidden">
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
            <h2 className="text-sm font-bold">利用者を選ぶ</h2>
            <div className="mt-3 flex h-11 items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3">
              <Search className="h-4 w-4 shrink-0 text-[var(--admin-text-muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="氏名・カナ・利用者番号"
                className="min-w-0 flex-1 bg-transparent text-base outline-none"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")} aria-label="入力を消す">
                  <X className="h-4 w-4 text-[var(--admin-text-muted)]" />
                </button>
              ) : null}
            </div>

            {query && candidates.length === 0 ? (
              <p className="mt-3 text-xs text-[var(--admin-text-muted)]">
                該当する方が見つかりません。
              </p>
            ) : null}

            {candidates.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {candidates.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      onClick={() => selectClient(candidate.id)}
                      className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 text-left transition hover:border-[var(--admin-primary)]"
                    >
                      <span className="block text-sm font-bold">{candidate.name}</span>
                      <span className="block text-xs text-[var(--admin-text-muted)]">
                        {candidate.clientNumber}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {client && reports.length > 0 ? (
            <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
              <h2 className="text-sm font-bold">出力する測定</h2>
              <ul className="mt-3 space-y-1.5">
                {reports.map((item) => {
                  const active = report?.id === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedReportId(item.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                          active
                            ? "border-[var(--admin-primary)] bg-[var(--admin-primary-softer)]"
                            : "border-[var(--admin-border)] hover:border-[var(--admin-primary)]"
                        }`}
                      >
                        <span className="block text-sm font-bold">{formatDate(item.measuredAt)}</span>
                        <span className="block text-xs text-[var(--admin-text-muted)]">
                          {item.blendName} / {item.volumeMl}mL
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <p className="rounded-xl bg-[var(--admin-primary-softer)] p-3.5 text-xs leading-5 text-[var(--admin-text-muted)]">
            レポートには内部配合比率とα〜θの数値を載せません。分量も書かず、構成精油名までにとどめます。
            サロン名と担当者名は設定画面の内容が入ります。
          </p>
        </section>

        {!report || !client ? (
          <section className="print:hidden">
            <div className="mx-auto max-w-md rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface)] p-10 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[var(--admin-primary-soft)] text-[var(--admin-primary-strong)]">
                <FileText className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-lg font-bold">氏名を入力してください</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--admin-text-muted)]">
                レポートを作る方を呼び出すと、ここにプレビューが出ます。
              </p>
            </div>
          </section>
        ) : (
          <section
            id="report-sheet"
            className="mx-auto w-full max-w-[794px] rounded-xl border border-[var(--admin-border)] bg-white p-8 text-[#33294a] shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none"
          >
            <header className="flex items-start justify-between gap-4 border-b border-[#e4dff0] pb-5">
              <div>
                <p className="text-xs font-bold tracking-[0.2em] text-[#8d6fd1]">
                  {settings.salonName || "Selenia"}
                </p>
                <h1 className="mt-1.5 text-2xl font-bold">香りのご提案レポート</h1>
              </div>
              <div className="text-right text-xs leading-5 text-[#7b7088]">
                <p>測定日: {formatDate(report.measuredAt)}</p>
                {settings.operatorName ? <p>担当: {settings.operatorName}</p> : null}
              </div>
            </header>

            <section className="mt-5">
              <p className="text-lg font-bold">
                {client.name} 様
                <span className="ml-3 text-xs font-normal text-[#7b7088]">
                  {client.clientNumber}
                  {calculateAge(client.birthday) !== null
                    ? ` / ${calculateAge(client.birthday)}歳`
                    : ""}
                </span>
              </p>
            </section>

            <section className="mt-6">
              <h2 className="text-sm font-bold text-[#8d6fd1]">測定の結果</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <figure>
                  <img
                    src={report.relaxImage}
                    alt="リラックス度のグラフ"
                    className="w-full rounded-lg"
                  />
                  <figcaption className="mt-1.5 text-xs text-[#7b7088]">リラックス度</figcaption>
                </figure>
                <figure>
                  <img src={report.focusImage} alt="集中度のグラフ" className="w-full rounded-lg" />
                  <figcaption className="mt-1.5 text-xs text-[#7b7088]">集中度</figcaption>
                </figure>
              </div>

              <p className="mt-4 text-sm leading-6">{report.comment}</p>
            </section>

            <section className="mt-6 rounded-lg bg-[#f8f5fd] p-4">
              <h2 className="text-sm font-bold text-[#8d6fd1]">お作りした香り</h2>
              <p className="mt-2 text-lg font-bold">
                {report.blendName}
                <span className="ml-2 text-sm font-normal text-[#7b7088]">{report.volumeMl}mL</span>
              </p>
              {baseBlend ? (
                <p className="mt-1.5 text-sm leading-6">
                  ベース: {baseBlend.name}
                  <span className="block text-xs text-[#7b7088]">
                    {baseBlend.public_ingredients.join(" / ")}
                  </span>
                </p>
              ) : null}
              {report.addedOils.length > 0 ? (
                <p className="mt-2 text-sm leading-6">
                  お好みに合わせて加えた精油: {report.addedOils.join(" / ")}
                </p>
              ) : null}
            </section>

            <section className="mt-6">
              <h2 className="text-sm font-bold text-[#8d6fd1]">お使いいただき方</h2>
              <p className="mt-2 text-sm leading-6">{report.usage}</p>
            </section>

            <footer className="mt-8 border-t border-[#e4dff0] pt-4 text-xs leading-5 text-[#7b7088]">
              <p>
                本品は芳香を楽しむための雑貨です。医薬品ではなく、病気の治療・予防を目的としたもの
                ではありません。香りの感じ方には個人差があります。
              </p>
              <p className="mt-1.5">
                お肌に直接つけないでください。妊娠中・授乳中の方、通院中の方は、使用前に専門家へ
                ご相談ください。お子様やペットの手の届かない場所で保管してください。
              </p>
              <p className="mt-1.5">
                測定結果は測定時の状態を記録したものです。体調や環境によって変わります。
              </p>
            </footer>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
