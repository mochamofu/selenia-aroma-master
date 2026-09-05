"use client";

import { useState } from "react";
import { AlertTriangle, Check, Database, Download, Lock, ShieldCheck, Upload } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useViewerRole } from "@/hooks/useViewerRole";
import { DISCLOSURE_DESCRIPTIONS, DISCLOSURE_LABELS, disclosureLevelForRole } from "@/lib/disclosure";
import { useOperatorSettings, useSaveOperatorSettings } from "@/hooks/useOperatorSettings";
import { type OperatorSettings } from "@/lib/operatorSettings";
import { BackupFormatError, buildBackup, countEntries, downloadBackup, restoreBackup } from "@/lib/backup";

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5">
      <h2 className="text-base font-bold">{title}</h2>
      {description ? (
        <p className="mt-1 text-xs leading-5 text-[var(--admin-text-muted)]">{description}</p>
      ) : null}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[var(--admin-text-muted)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 h-11 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 text-base outline-none focus:border-[var(--admin-primary)]"
      />
      {hint ? <span className="mt-1 block text-xs text-[var(--admin-text-muted)]">{hint}</span> : null}
    </label>
  );
}

function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--admin-border)] p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[var(--admin-primary)]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-xs leading-5 text-[var(--admin-text-muted)]">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

export default function OperatorSettingsPage() {
  // サロン共通の項目はサーバー、端末の項目はブラウザから読む。
  const { settings, source, loading } = useOperatorSettings();
  // 読み終わる前にフォームを作ると、届いた値で編集途中が消える。
  if (loading) return null;
  // 保存値が変わったらフォームを作り直す。編集途中の値を effect で上書きしないため。
  return (
    <SettingsForm key={JSON.stringify(settings)} initialSettings={settings} source={source} />
  );
}

function SettingsForm({
  initialSettings,
  source,
}: {
  initialSettings: OperatorSettings;
  source: "database" | "device";
}) {
  const { role, loading: roleLoading } = useViewerRole();
  const level = disclosureLevelForRole(role);

  const [settings, setSettings] = useState<OperatorSettings>(initialSettings);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [backupError, setBackupError] = useState("");

  function handleExport() {
    setBackupError("");
    const count = downloadBackup();
    setBackupMessage(
      count === 0
        ? "書き出す内容がまだありません。"
        : `${count} 件のデータをファイルに書き出しました。`,
    );
  }

  async function handleImport(file: File) {
    setBackupMessage("");
    setBackupError("");
    const current = countEntries(buildBackup());
    if (current > 0) {
      const ok = window.confirm(
        `この端末に保存されている ${current} 件のデータは、読み込んだ内容で置き換わります。続けますか。`,
      );
      if (!ok) return;
    }
    try {
      const restored = await restoreBackup(file);
      setBackupMessage(`${restored} 件を読み込みました。反映するため画面を再読み込みします。`);
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setBackupError(
        error instanceof BackupFormatError ? error.message : "読み込みに失敗しました。",
      );
    }
  }

  const update = <K extends keyof OperatorSettings>(key: K, value: OperatorSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setSaveError("");
  };

  const saveSettings = useSaveOperatorSettings();

  const handleSave = async () => {
    const result = await saveSettings(settings);
    setSaveError(result.error);
    setSaved(!result.error);
  };

  return (
    <AdminShell
      title="設定"
      subtitle="サロン情報・測定の既定値・表示範囲を確認します"
      actions={
        <button
          type="button"
          onClick={handleSave}
          className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[var(--admin-primary)] px-4 text-xs font-bold text-white transition hover:bg-[var(--admin-primary-strong)]"
        >
          {saved ? <Check className="h-4 w-4" /> : null}
          {saved ? "保存しました" : "保存する"}
        </button>
      }
    >
      {saveError ? (
        <p className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-[#e8c4c4] bg-[#fdf4f4] p-3 text-xs leading-5 text-[#9a4a4a] lg:mx-6">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {saveError}この端末での表示にだけ反映しました。
        </p>
      ) : null}
      {source === "device" ? (
        <p className="mx-4 mt-4 flex items-start gap-2 rounded-lg bg-[var(--admin-primary-softer)] p-3 text-xs leading-5 text-[var(--admin-text-muted)] lg:mx-6">
          <Database className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          サロン名・測定の既定値・保管期間は、通常はサロン全体で揃えて保存します。
          いまはこの端末にだけ保存されています。
        </p>
      ) : null}

      <div className="grid gap-4 p-4 lg:grid-cols-2 lg:p-6">
        <Card title="サロン情報" description="レポートや同意文面に差し込みます。">
          <TextField
            label="サロン名"
            value={settings.salonName}
            onChange={(value) => update("salonName", value)}
            placeholder="Selenia"
          />
          <TextField
            label="施術担当者名"
            hint="香り制作記録の作成者欄の既定値になります。"
            value={settings.operatorName}
            onChange={(value) => update("operatorName", value)}
            placeholder="例: 小杉"
          />
        </Card>

        <Card title="測定の既定値" description="脳波測定の取り込み時に使う初期設定です。">
          <label className="block">
            <span className="text-xs font-bold text-[var(--admin-text-muted)]">1回の測定時間</span>
            <select
              value={settings.measurementMinutes}
              onChange={(event) => update("measurementMinutes", Number(event.target.value))}
              className="mt-1.5 h-11 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 text-base outline-none focus:border-[var(--admin-primary)]"
            >
              <option value={1}>1分</option>
              <option value={3}>3分</option>
              <option value={5}>5分</option>
            </select>
          </label>
          <ToggleField
            label="香り前・香り後の2回セットで測る"
            hint="2回分をひと組として扱い、差分をカルテに残します。"
            checked={settings.pairedMeasurement}
            onChange={(value) => update("pairedMeasurement", value)}
          />
          <ToggleField
            label="カルテでα〜θの5帯域を最初から開く"
            hint="通常はリラックス・集中のみ表示し、5帯域は必要なときだけ開きます。"
            checked={settings.showBandsByDefault}
            onChange={(value) => update("showBandsByDefault", value)}
          />
        </Card>

        <Card
          title="利用者へ渡すレポート"
          description="レポートには測定画面のグラフと香りの提案内容を載せます。内部配合比率と5帯域の数値は含めません。"
        >
          <p className="flex items-start gap-2 rounded-lg bg-[var(--admin-primary-softer)] p-3 text-xs leading-5 text-[var(--admin-text-muted)]">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            内部配合比率はレポート・画面の書き出しのいずれにも含めません。
          </p>
        </Card>

        <Card
          title="個人情報の取り扱い"
          description="測定データは個人情報です。保管期間を決め、期間を過ぎたものは消せるようにします。"
        >
          <label className="block">
            <span className="text-xs font-bold text-[var(--admin-text-muted)]">測定データの保管期間</span>
            <select
              value={settings.retentionMonths}
              onChange={(event) => update("retentionMonths", Number(event.target.value))}
              className="mt-1.5 h-11 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 text-base outline-none focus:border-[var(--admin-primary)]"
            >
              <option value={12}>12か月</option>
              <option value={24}>24か月</option>
              <option value={36}>36か月</option>
            </select>
          </label>
          <ul className="space-y-1.5 text-xs leading-5 text-[var(--admin-text-muted)]">
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--admin-success)]" />
              問診中は、呼び出した利用者以外の氏名を画面に出しません。
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--admin-success)]" />
              利用者一覧・カルテは、ログインした施術者だけが開けます。
            </li>
          </ul>
        </Card>

        <Card title="表示範囲" description="いまのログインで見える範囲です。ロールから自動で決まります。">
          <div className="rounded-lg border border-[var(--admin-border)] p-3">
            <p className="text-sm font-bold">
              {roleLoading ? "確認しています…" : DISCLOSURE_LABELS[level]}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--admin-text-muted)]">
              {DISCLOSURE_DESCRIPTIONS[level]}
            </p>
          </div>
          <p className="text-xs leading-5 text-[var(--admin-text-muted)]">
            インストラクターの招待と権限付与は、Supabase の profiles.role をこの画面から変更できるように
            したうえで追加します。
          </p>
        </Card>

        <Card
          title="バックアップ"
          description="いまの保存先はこの端末のブラウザだけです。ファイルに書き出しておくと、別の端末へ移したり、消えたときに戻したりできます。"
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="flex h-11 items-center gap-2 rounded-lg bg-[var(--admin-primary)] px-4 text-xs font-bold text-white transition hover:bg-[var(--admin-primary-strong)]"
            >
              <Download className="h-4 w-4" />
              バックアップを書き出す
            </button>
            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-[var(--admin-border)] px-4 text-xs font-bold transition hover:border-[var(--admin-primary)]">
              <Upload className="h-4 w-4" />
              バックアップを読み込む
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) handleImport(file);
                }}
              />
            </label>
          </div>

          {backupMessage ? (
            <p className="flex items-start gap-2 rounded-lg bg-[var(--admin-primary-softer)] p-3 text-xs leading-5">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--admin-primary-strong)]" />
              {backupMessage}
            </p>
          ) : null}
          {backupError ? (
            <p className="flex items-start gap-2 rounded-lg bg-[var(--admin-danger-soft)] p-3 text-xs font-bold leading-5 text-[var(--admin-danger)]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {backupError}
            </p>
          ) : null}

          <p className="text-xs leading-5 text-[var(--admin-text-muted)]">
            書き出したファイルには、設定・保存した本日のセッション・アロマレシピが入ります。
            利用者の測定画像も含まれるため、扱いには注意してください。
            読み込むと、この端末の内容は置き換わります。
          </p>
        </Card>

        <Card title="データ連携" description="保存先と測定機器の取り込み状況です。">
          <div className="flex items-start gap-2 rounded-lg border border-[var(--admin-border)] p-3">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-[var(--admin-primary-strong)]" />
            <div>
              <p className="text-sm font-bold">
                {source === "database"
                  ? "保存先に接続しています"
                  : "保存先が未接続（この端末に保存）"}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--admin-text-muted)]">
                {source === "database"
                  ? "カルテ・測定・制作記録・アロマレシピ・注意事項はサーバーに保存され、別の端末からも同じ内容が見えます。測定画像も同様です。"
                  : "入力内容はこの端末のブラウザにだけ残ります。端末を替えると消えるため、実在の利用者情報は入れないでください。"}
              </p>
            </div>
          </div>
          <p className="text-xs leading-5 text-[var(--admin-text-muted)]">
            FocusCalm からの取り込みは、iPadのスクリーンショットとCSVの読み込みに対応しています。
            取り込みは利用者カルテの「脳波データ取り込み」から行います。
          </p>
        </Card>
      </div>
    </AdminShell>
  );
}
