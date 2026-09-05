"use client";

import {
  clearSessionDraft,
  loadSessionDraft,
  saveSessionDraft,
  SessionDraftTooLargeError,
} from "@/lib/sessionDraftStore";
import type { BrainwaveChannel, BrainwaveScreenshot, ScreenshotScope } from "@/types/brainwave";

/**
 * 「本日のセッション」の保存先。
 *
 * まずサーバー（画像は R2、記録は D1）へ保存を試み、そこが使えない環境では
 * これまでどおり端末のブラウザへ保存する。移行の途中でも、どちらの環境でも
 * 手が止まらないようにするため。
 *
 * サーバーに入れば端末を替えても記録が残り、ブラウザの容量制限も外れる。
 */

/** どこに保存されたか。画面で「この端末だけ」と伝え分けるために返す。 */
export type SessionStorageKind = "server" | "device";

export type SavedSession = {
  savedAt: string;
  storage: SessionStorageKind;
  /** 保存後の画像。サーバーに入った場合は参照先がサーバーに差し替わる。 */
  screenshots: BrainwaveScreenshot[];
};

export { SessionDraftTooLargeError };

const IMAGE_ENDPOINT = "/api/measurement-images";

/** サーバーに置いた画像を指す URL かどうか。 */
function isServerImageSrc(src: string): boolean {
  return src.startsWith(`${IMAGE_ENDPOINT}/`);
}

function objectKeyFromSrc(src: string): string {
  return src.slice(IMAGE_ENDPOINT.length + 1);
}

function srcFromObjectKey(objectKey: string): string {
  const path = objectKey.split("/").map(encodeURIComponent).join("/");
  return `${IMAGE_ENDPOINT}/${path}`;
}

/** サーバー側がまだ用意できていない（未接続・未ログイン）ことを表す。 */
class ServerUnavailableError extends Error {}

async function fetchBlob(src: string): Promise<Blob> {
  const response = await fetch(src);
  if (!response.ok) throw new Error("画像を読み取れませんでした。");
  return await response.blob();
}

/** 画像を1枚だけサーバーへ送り、置き場所を受け取る。 */
async function uploadImage(clientId: string, screenshot: BrainwaveScreenshot): Promise<string> {
  if (isServerImageSrc(screenshot.src)) return objectKeyFromSrc(screenshot.src);

  const blob = await fetchBlob(screenshot.src);
  const form = new FormData();
  form.append("clientId", clientId);
  form.append("file", blob, `${screenshot.id}.png`);

  const response = await fetch(IMAGE_ENDPOINT, { method: "POST", body: form });
  if (response.status === 503 || response.status === 401) {
    throw new ServerUnavailableError();
  }
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(detail?.error ?? "画像を保存できませんでした。");
  }
  const body = (await response.json()) as { objectKey: string };
  return body.objectKey;
}

type MeasurementPayload = {
  trialNo: number;
  trialLabel: string;
  measuredAt: string;
  images: {
    channels: BrainwaveChannel[];
    objectKey: string;
    contentHash: string;
    detectionNote: string;
    title: string;
    note: string;
    source: "sample" | "upload";
    uploadedAt: string;
  }[];
};

/** 同じ回（trialNo）の画像をひとまとめにする。1回につき2枚が並ぶ。 */
function groupByTrial(
  screenshots: BrainwaveScreenshot[],
  keys: Map<string, string>,
): MeasurementPayload[] {
  const byTrial = new Map<number, MeasurementPayload>();
  for (const shot of screenshots) {
    const objectKey = keys.get(shot.id);
    if (!objectKey) continue;
    const measurement = byTrial.get(shot.trialNo) ?? {
      trialNo: shot.trialNo,
      trialLabel: shot.trialLabel,
      measuredAt: shot.measuredAt,
      images: [],
    };
    measurement.images.push({
      channels: shot.channels,
      objectKey,
      contentHash: shot.contentHash,
      detectionNote: shot.detectionReason,
      title: shot.title,
      note: shot.note,
      source: shot.source,
      uploadedAt: shot.uploadedAt,
    });
    byTrial.set(shot.trialNo, measurement);
  }
  return [...byTrial.values()].sort((a, b) => a.trialNo - b.trialNo);
}

type VisitResponse = {
  visit: {
    visitedOn: string;
    measurements: {
      scope: ScreenshotScope;
      trialNo: number;
      trialLabel: string;
      measuredAt: string;
      images: {
        id: string;
        channels: BrainwaveChannel[];
        objectKey: string;
        contentHash: string;
        detectionNote: string;
        title: string;
        note: string;
        source: "sample" | "upload";
        uploadedAt: string;
      }[];
    }[];
  } | null;
};

function toScreenshots(clientId: string, visit: VisitResponse["visit"]): BrainwaveScreenshot[] {
  if (!visit) return [];
  return visit.measurements.flatMap((measurement) =>
    measurement.images.map((image) => ({
      id: image.id,
      customerId: clientId,
      title: image.title,
      src: srcFromObjectKey(image.objectKey),
      channels: image.channels,
      detectionReason: image.detectionNote,
      contentHash: image.contentHash,
      measuredAt: measurement.measuredAt,
      uploadedAt: image.uploadedAt,
      note: image.note,
      source: image.source,
      scope: measurement.scope,
      trialNo: measurement.trialNo,
      trialLabel: measurement.trialLabel,
    })),
  );
}

async function saveToServer(
  clientId: string,
  screenshots: BrainwaveScreenshot[],
  scope: ScreenshotScope,
): Promise<SavedSession> {
  // 画像を先に置いてから、記録を送る。置けなかった枚があれば記録も作らない。
  const keys = new Map<string, string>();
  for (const shot of screenshots) {
    keys.set(shot.id, await uploadImage(clientId, shot));
  }

  const response = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, scope, measurements: groupByTrial(screenshots, keys) }),
  });
  if (response.status === 503 || response.status === 401) {
    throw new ServerUnavailableError();
  }
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(detail?.error ?? "保存できませんでした。");
  }

  const body = (await response.json()) as VisitResponse;
  return {
    savedAt: new Date().toISOString(),
    storage: "server",
    screenshots: toScreenshots(clientId, body.visit),
  };
}

/**
 * 本日のセッションを保存する。
 * サーバーが使えない環境では端末に保存し、その旨を `storage` で返す。
 */
export async function saveSession(
  clientId: string,
  screenshots: BrainwaveScreenshot[],
  scope: ScreenshotScope = "trial",
): Promise<SavedSession> {
  try {
    return await saveToServer(clientId, screenshots, scope);
  } catch (error) {
    if (!(error instanceof ServerUnavailableError)) throw error;
  }

  const draft = await saveSessionDraft(clientId, screenshots);
  return { savedAt: draft.savedAt, storage: "device", screenshots: draft.screenshots };
}

/** 保存済みの本日のセッションを読み出す。無ければ null。 */
export async function loadSession(clientId: string): Promise<SavedSession | null> {
  try {
    const response = await fetch(`/api/sessions?clientId=${encodeURIComponent(clientId)}`);
    if (response.ok) {
      const body = (await response.json()) as VisitResponse;
      const screenshots = toScreenshots(clientId, body.visit);
      if (screenshots.length > 0) {
        return { savedAt: body.visit?.visitedOn ?? "", storage: "server", screenshots };
      }
      return null;
    }
    // 503 / 401 は移行前の環境。端末に保存したものを見に行く。
  } catch {
    // 通信できないときも端末側で続けられるようにする。
  }

  const draft = loadSessionDraft(clientId);
  if (!draft || draft.screenshots.length === 0) return null;
  return { savedAt: draft.savedAt, storage: "device", screenshots: draft.screenshots };
}

/** 保存した本日のセッションを消す。両方の保存先から消す。 */
export async function clearSession(
  clientId: string,
  scope: ScreenshotScope = "trial",
): Promise<void> {
  clearSessionDraft(clientId);
  try {
    await fetch(`/api/sessions?clientId=${encodeURIComponent(clientId)}&scope=${scope}`, {
      method: "DELETE",
    });
  } catch {
    // サーバー側に無ければ端末から消えていれば十分。
  }
}
