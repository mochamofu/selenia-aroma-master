"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Activity, AlertTriangle, Check, ImageUp, Trash2, Upload } from "lucide-react";
import { BrainwaveChart } from "@/components/BrainwaveChart";
import { BrainwaveCsvError, parseBrainwaveCsv } from "@/lib/brainwaveCsv";
import { CAPTURE_ORDER, findUncoveredChannels, intakeScreenshotPanels } from "@/lib/screenshotIntake";
import {
  BRAINWAVE_CHANNELS,
  BRAINWAVE_CHANNEL_META,
  PUBLIC_BRAINWAVE_CHANNELS,
  type BrainwaveChannel,
  type BrainwaveScreenshot,
  type BrainwaveSession,
} from "@/types/brainwave";

const MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

type BrainwaveIntakePanelProps = {
  customerId: string;
  customerName: string;
  sessions: BrainwaveSession[];
  screenshots: BrainwaveScreenshot[];
  onSessionsChange: (updater: (sessions: BrainwaveSession[]) => BrainwaveSession[]) => void;
  onScreenshotsChange: (
    updater: (screenshots: BrainwaveScreenshot[]) => BrainwaveScreenshot[],
  ) => void;
  onToast: (message: string) => void;
  /** 元に戻せるよう、状態を変える直前に呼ぶ。 */
  onCommitHistory: (label: string) => void;
};

export function BrainwaveIntakePanel({
  customerId,
  customerName,
  sessions,
  screenshots,
  onSessionsChange,
  onScreenshotsChange,
  onToast,
  onCommitHistory,
}: BrainwaveIntakePanelProps) {
  const idCounter = useRef(0);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showInternalChannels, setShowInternalChannels] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const [intakeSummary, setIntakeSummary] = useState<string | null>(null);
  const [splitWarnings, setSplitWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const customerSessions = useMemo(
    () => sessions.filter((session) => session.customerId === customerId),
    [sessions, customerId],
  );
  const customerScreenshots = useMemo(
    () => screenshots.filter((shot) => shot.customerId === customerId),
    [screenshots, customerId],
  );

  const activeSession =
    customerSessions.find((session) => session.id === selectedSessionId) ?? customerSessions[0] ?? null;

  const uncoveredChannels = useMemo(
    () => findUncoveredChannels(customerScreenshots.map((shot) => shot.channels)),
    [customerScreenshots],
  );

  function nextId(prefix: string) {
    idCounter.current += 1;
    return `${prefix}-${Date.now()}-${idCounter.current}`;
  }

  async function handleCsvUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setBusy(true);
    setCsvError(null);
    setCsvWarnings([]);

    const added: BrainwaveSession[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (file.size > MAX_CSV_SIZE_BYTES) {
        errors.push(`${file.name}: 5MBを超えています。`);
        continue;
      }
      try {
        const text = await file.text();
        const parsed = parseBrainwaveCsv(text);
        added.push({
          id: nextId("eeg-session"),
          customerId,
          sourceFileName: file.name,
          measuredAt: new Date(file.lastModified).toISOString().slice(0, 16).replace("T", " "),
          timestampsSec: parsed.timestampsSec,
          series: parsed.series,
          missingChannels: parsed.missingChannels,
          stats: parsed.stats,
          durationSec: parsed.durationSec,
          rawCsv: text,
          note: "",
        });
        warnings.push(...parsed.warnings.map((warning) => `${file.name}: ${warning}`));
      } catch (error) {
        errors.push(
          `${file.name}: ${
            error instanceof BrainwaveCsvError || error instanceof Error
              ? error.message
              : "読み込みに失敗しました。"
          }`,
        );
      }
    }

    if (added.length > 0) {
      onSessionsChange((current) => [...added, ...current]);
      setSelectedSessionId(added[0].id);
      onToast(`${added.length}件のCSVをカルテに取り込みました。`);
    }
    setCsvWarnings(warnings);
    setCsvError(errors.length ? errors.join("\n") : null);
    setBusy(false);
  }

  async function handleScreenshotUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setBusy(true);
    setSplitWarnings([]);

    const oversized = files.filter((file) => file.size > MAX_IMAGE_SIZE_BYTES);
    const usable = files.filter((file) => file.size <= MAX_IMAGE_SIZE_BYTES);

    const existingHashes = screenshots
      .filter((shot) => shot.customerId === customerId)
      .map((shot) => shot.contentHash);

    // 1枚のスクリーンショットに写っているグラフカードを切り出してから取り込む
    const result = await intakeScreenshotPanels(usable, existingHashes);
    if (result.accepted.length > 0) onCommitHistory("スクリーンショットの取り込み");

    // 取り込むスクショは1枚が1回の測定。写っている2枚のグラフを同じ回としてまとめる。
    // 実機の並びはリラックス度と集中度で固定なので、位置から割り当てておき、
    // 逆だった場合は行ごとの「左右を入れ替える」で直せるようにする。
    let nextTrialNo =
      screenshots
        .filter((shot) => shot.customerId === customerId && shot.scope === "trial")
        .reduce((max, shot) => Math.max(max, shot.trialNo), 0) + 1;
    const trialNoBySource = new Map<string, number>();
    const measuredAt = new Date().toISOString().slice(0, 16).replace("T", " ");

    const added: BrainwaveScreenshot[] = result.accepted.map((item) => {
      if (!trialNoBySource.has(item.sourceFileName)) {
        trialNoBySource.set(item.sourceFileName, nextTrialNo);
        nextTrialNo += 1;
      }
      const trialNo = trialNoBySource.get(item.sourceFileName)!;
      // 位置からの割り当て。1枚目=リラックス度、2枚目=集中度。
      const positional: BrainwaveChannel = item.indexInSource === 1 ? "relax" : "focus";
      const channels = item.guessedChannels.length > 0 ? item.guessedChannels : [positional];
      return {
        id: nextId("eeg-panel"),
        customerId,
        title: `第${trialNo}回 / ${BRAINWAVE_CHANNEL_META[channels[0]].shortLabel}`,
        src: item.panel.objectUrl,
        channels,
        detectionReason:
          item.guessedChannels.length > 0 ? item.detectionReason : "画面内の並び順から割り当て",
        contentHash: item.contentHash,
        measuredAt,
        uploadedAt: new Date().toISOString().slice(0, 10),
        note: "",
        source: "upload",
        scope: "trial",
        trialNo,
        trialLabel: `第${trialNo}回`,
      };
    });

    if (added.length > 0) {
      onScreenshotsChange((current) => [...added, ...current]);
    }

    const parts = [`グラフ ${added.length}枚を切り出しました`];
    if (result.duplicates.length > 0) {
      parts.push(`重複 ${result.duplicates.length}枚を自動で除外`);
    }
    if (oversized.length > 0) parts.push(`10MB超 ${oversized.length}枚をスキップ`);
    if (result.failures.length > 0) parts.push(`切り分け失敗 ${result.failures.length}枚`);

    setSplitWarnings([
      ...result.warnings,
      ...result.failures.map((f) => `${f.fileName}: ${f.message}`),
    ]);
    setIntakeSummary(parts.join(" / "));
    onToast(parts.join(" / "));
    setBusy(false);
  }

  /** 機器の表示順が固定なら、取り込んだ順に7波形を割り当てられる。 */
  function assignByCaptureOrder() {
    // 取り込み時に [...新しいバッチ, ...既存] の順で積むため、
    // 直近に取り込んだ4枚分は配列の先頭から撮影順に並んでいる。
    // ここを逆順にすると θ から割り当ててしまうので、並びはそのまま使う。
    const inCaptureOrder = screenshots.filter((shot) => shot.customerId === customerId);
    const assignment = new Map<string, BrainwaveChannel[]>();
    inCaptureOrder.forEach((shot, index) => {
      const channel = CAPTURE_ORDER[index];
      assignment.set(shot.id, channel ? [channel] : []);
    });

    onScreenshotsChange((current) =>
      current.map((shot) =>
        assignment.has(shot.id)
          ? {
              ...shot,
              channels: assignment.get(shot.id)!,
              detectionReason: "撮影順から一括で割り当て",
            }
          : shot,
      ),
    );
    onToast(`${Math.min(inCaptureOrder.length, CAPTURE_ORDER.length)}枚に撮影順で割り当てました。`);
  }

  function toggleScreenshotChannel(shotId: string, channel: BrainwaveChannel) {
    onScreenshotsChange((current) =>
      current.map((shot) => {
        if (shot.id !== shotId) return shot;
        const has = shot.channels.includes(channel);
        return {
          ...shot,
          channels: has
            ? shot.channels.filter((item) => item !== channel)
            : [...shot.channels, channel],
          detectionReason: "操作者が手動で指定",
        };
      }),
    );
  }

  function removeScreenshot(shotId: string) {
    onCommitHistory("グラフの削除");
    onScreenshotsChange((current) => current.filter((shot) => shot.id !== shotId));
  }

  function removeSession(sessionId: string) {
    onSessionsChange((current) => current.filter((session) => session.id !== sessionId));
    if (selectedSessionId === sessionId) setSelectedSessionId(null);
  }

  function downloadCsv(session: BrainwaveSession) {
    const blob = new Blob([session.rawCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = session.sourceFileName || "brainwave.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const visibleChannels = showInternalChannels ? BRAINWAVE_CHANNELS : PUBLIC_BRAINWAVE_CHANNELS;

  return (
    <section className="space-y-4 rounded-lg border border-[#e4dff0] bg-white p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#342a49]">
            <Activity className="h-5 w-5 text-[#8d6fd1]" />
            脳波データ取り込み
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#827690]">
            {customerName} のカルテ。iPad から書き出した CSV と測定画面のスクリーンショットを
            紐づけます。CSV には7波形すべてを保管し、カルテにはリラックス度と集中度を並べます。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-[#8d6fd1] px-3 text-xs font-bold text-white transition hover:bg-[#7a5cc0]">
            <Upload className="h-4 w-4" />
            CSVを取り込む
            <input
              className="sr-only"
              type="file"
              accept=".csv,text/csv"
              multiple
              onChange={handleCsvUpload}
              disabled={busy}
            />
          </label>
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-[#d98aa8] px-3 text-xs font-bold text-white transition hover:bg-[#c87598]">
            <ImageUp className="h-4 w-4" />
            測定画面のスクショを取り込む
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              multiple
              onChange={handleScreenshotUpload}
              disabled={busy}
            />
          </label>
        </div>
      </header>

      {csvError ? (
        <p className="whitespace-pre-line rounded-lg bg-[#fdeaef] p-3 text-xs font-bold text-[#a8506e]">
          {csvError}
        </p>
      ) : null}

      {csvWarnings.length > 0 ? (
        <ul className="space-y-1 rounded-lg bg-[#fdf3e3] p-3 text-xs text-[#8a6a35]">
          {csvWarnings.map((warning) => (
            <li key={warning} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* ---- CSVセッション ---- */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[#342a49]">測定セッション（CSV）</h3>
          <label className="flex items-center gap-2 text-xs font-bold text-[#665a78]">
            <input
              type="checkbox"
              checked={showInternalChannels}
              onChange={(event) => setShowInternalChannels(event.target.checked)}
              className="h-4 w-4 accent-[#8d6fd1]"
            />
            α/β/γ/δ/θ のグラフも表示
          </label>
        </div>

        {customerSessions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#ddd6ea] p-4 text-center text-xs text-[#827690]">
            まだCSVがありません。FocusCalm から書き出したCSVを取り込むと、7波形すべてが保管され、
            グラフがここに描画されます。
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {customerSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                    activeSession?.id === session.id
                      ? "border-[#8d6fd1] bg-[#f6f2fd] font-bold text-[#4b3d6b]"
                      : "border-[#e4dff0] hover:border-[#b7a5dd]"
                  }`}
                >
                  <span className="block max-w-52 truncate font-bold text-[#3b3152]">
                    {session.sourceFileName}
                  </span>
                  <span className="text-[#827690]">
                    {session.measuredAt} / {Math.round(session.durationSec)}秒 /{" "}
                    {session.series.length}波形
                  </span>
                </button>
              ))}
            </div>

            {activeSession ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f8f5fd] p-3">
                  <div className="text-xs text-[#665a78]">
                    <p className="font-bold text-[#3b3152]">{activeSession.sourceFileName}</p>
                    <p className="mt-1">
                      {`${activeSession.timestampsSec.length}行 / ${Math.round(activeSession.durationSec)}秒`}
                      {activeSession.missingChannels.length > 0
                        ? ` / 未取得: ${activeSession.missingChannels
                            .map((channel) => BRAINWAVE_CHANNEL_META[channel].shortLabel)
                            .join(", ")}`
                        : " / 7波形すべて取得済み"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => downloadCsv(activeSession)}
                      className="h-8 rounded-lg border border-[#ddd6ea] bg-white px-3 text-xs font-bold text-[#4b3d6b]"
                    >
                      元CSVを保存
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSession(activeSession.id)}
                      className="flex h-8 items-center gap-1 rounded-lg border border-[#f0d4dd] bg-white px-3 text-xs font-bold text-[#a8506e]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      削除
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  {visibleChannels.map((channel) => {
                    const series = activeSession.series.find((item) => item.channel === channel);
                    const stats = activeSession.stats.find((item) => item.channel === channel);
                    if (!series) {
                      return (
                        <div
                          key={channel}
                          className="grid h-32 place-items-center rounded-lg border border-dashed border-[#ddd6ea] text-xs text-[#827690]"
                        >
                          {BRAINWAVE_CHANNEL_META[channel].label}: このCSVに列がありません
                        </div>
                      );
                    }
                    return (
                      <div key={channel} className="space-y-1">
                        <BrainwaveChart
                          channel={channel}
                          timestampsSec={activeSession.timestampsSec}
                          values={series.values}
                        />
                        {stats ? (
                          <p className="px-1 text-[11px] text-[#827690]">
                            最小 {stats.min.toFixed(1)} / 最大 {stats.max.toFixed(1)} /{" "}
                            {stats.sampleCount} 点
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {!showInternalChannels ? (
                  <p className="rounded-lg bg-[#f8f5fd] p-3 text-xs text-[#665a78]">
                    α/β/γ/δ/θ の5波形も取り込み済みです。必要なときは上のチェックで開けます。
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* ---- スクリーンショット ---- */}
      <div className="space-y-3 border-t border-[#eee9f7] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[#342a49]">測定画面のスクリーンショット</h3>
          {intakeSummary ? (
            <span className="flex items-center gap-1 text-xs font-bold text-[#5e7d56]">
              <Check className="h-3.5 w-3.5" />
              {intakeSummary}
            </span>
          ) : null}
        </div>

        <p className="rounded-lg bg-[#f8f5fd] p-3 text-xs leading-5 text-[#665a78]">
          <strong className="font-bold">7波形が揃うまで撮ったスクショを、まとめて選択してください。</strong>
          測定画面に並ぶグラフのカードを自動で1枚ずつ切り出し、グラフごとの画像として保管します。
          重複したグラフと、下端で切れたグラフは自動で除外します。切り抜きの手作業は不要です。
          <br />
          <strong className="font-bold">おすすめは iPad を縦向きにして3回撮る方法です。</strong>
          1画面に3つ写るので、横向き（2つ×4回）より撮影回数が少なくて済みます。
          <br />
          <strong className="font-bold">波形の種類だけは自動で判別できません。</strong>
          機器の表示順が毎回同じなら「撮影順で一括割り当て」が使えます。違う場合は各カードのタグで指定してください。
        </p>

        {customerScreenshots.length > 0 ? (
          <button
            type="button"
            onClick={assignByCaptureOrder}
            className="flex h-9 items-center gap-2 rounded-lg border border-[#ddd6ea] bg-white px-3 text-xs font-bold text-[#4b3d6b] transition hover:border-[#8d6fd1]"
          >
            <Check className="h-3.5 w-3.5" />
            撮影順で一括割り当て（リラックス → 集中 → α → β → γ → δ → θ）
          </button>
        ) : null}

        {splitWarnings.length > 0 ? (
          <ul className="space-y-1 rounded-lg bg-[#fdf3e3] p-3 text-xs text-[#8a6a35]">
            {splitWarnings.map((warning) => (
              <li key={warning} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {uncoveredChannels.length > 0 && customerScreenshots.length > 0 ? (
          <p className="flex flex-wrap items-center gap-2 rounded-lg bg-[#fdf3e3] p-3 text-xs font-bold text-[#8a6a35]">
            <AlertTriangle className="h-4 w-4" />
            まだ割り当てのない波形:{" "}
            {uncoveredChannels.map((channel) => BRAINWAVE_CHANNEL_META[channel].label).join(" / ")}
          </p>
        ) : null}

        {customerScreenshots.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#ddd6ea] p-4 text-center text-xs text-[#827690]">
            まだスクリーンショットがありません。
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {customerScreenshots.map((shot) => (
              <article key={shot.id} className="overflow-hidden rounded-lg border border-[#e4dff0]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shot.src} alt={shot.title} className="h-32 w-full bg-white object-contain" />
                <div className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-bold text-[#3b3152]">{shot.title}</p>
                    <button
                      type="button"
                      onClick={() => removeScreenshot(shot.id)}
                      className="shrink-0 text-[#a8506e]"
                      aria-label={`${shot.title} を削除`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#827690]">{shot.detectionReason}</p>
                  <div className="flex flex-wrap gap-1">
                    {BRAINWAVE_CHANNELS.map((channel) => {
                      const active = shot.channels.includes(channel);
                      return (
                        <button
                          key={channel}
                          type="button"
                          onClick={() => toggleScreenshotChannel(shot.id, channel)}
                          aria-pressed={active}
                          className={`rounded-full border px-2 py-1 text-[11px] font-bold transition ${
                            active
                              ? "border-transparent text-white"
                              : "border-[#e4dff0] text-[#827690] hover:border-[#b7a5dd]"
                          }`}
                          style={active ? { backgroundColor: BRAINWAVE_CHANNEL_META[channel].color } : undefined}
                        >
                          {BRAINWAVE_CHANNEL_META[channel].shortLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
