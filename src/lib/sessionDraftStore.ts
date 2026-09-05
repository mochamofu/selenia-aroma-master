"use client";

import type { BrainwaveScreenshot } from "@/types/brainwave";

/**
 * 「本日のセッション」の一時保存。
 *
 * 通常の保存先はサーバー（画像は R2、記録は D1）で、その入口は sessionStore。
 * ここはサーバーが使えない環境——移行前の配信先や、バインディングの無い
 * ローカル——のための控えとして、この端末のブラウザへ保存する。
 *
 * 取り込んだ画像は blob: の一時URLなので、そのまま保存しても再読み込み後には
 * 開けない。保存時に画像そのもの（data URL）へ変換して持たせる。
 */

const STORAGE_KEY = "selenia.sessionDraft.v1";
/** localStorage の上限（おおむね5MB）に当たらないための目安。 */
const MAX_BYTES = 4_000_000;

export type SessionDraft = {
  customerId: string;
  savedAt: string;
  screenshots: BrainwaveScreenshot[];
};

type SessionDraftFile = Record<string, SessionDraft>;

function readFile(): SessionDraftFile {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SessionDraftFile;
  } catch {
    return {};
  }
}

/** blob: / http: の画像を data URL に変換する。data URL はそのまま返す。 */
async function toDataUrl(src: string): Promise<string> {
  if (src.startsWith("data:")) return src;
  const response = await fetch(src);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("画像の変換に失敗しました。"));
    reader.readAsDataURL(blob);
  });
}

export class SessionDraftTooLargeError extends Error {}

/**
 * 1人分の本日のセッションを保存する。
 * 容量を超える場合は保存せずに投げる（一部だけ保存されると、消えたのか
 * 保存できなかったのか分からなくなるため）。
 */
export async function saveSessionDraft(
  customerId: string,
  screenshots: BrainwaveScreenshot[],
): Promise<SessionDraft> {
  const embedded = await Promise.all(
    screenshots.map(async (shot) => ({ ...shot, src: await toDataUrl(shot.src) })),
  );
  const draft: SessionDraft = {
    customerId,
    savedAt: new Date().toISOString(),
    screenshots: embedded,
  };

  const file = readFile();
  file[customerId] = draft;
  const serialized = JSON.stringify(file);
  if (serialized.length > MAX_BYTES) {
    throw new SessionDraftTooLargeError(
      "保存できる容量を超えました。不要な回を削除してから、もう一度保存してください。",
    );
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    throw new SessionDraftTooLargeError(
      "この端末に保存できませんでした。ブラウザの保存容量を確認してください。",
    );
  }
  return draft;
}

export function loadSessionDraft(customerId: string): SessionDraft | null {
  return readFile()[customerId] ?? null;
}

export function clearSessionDraft(customerId: string): void {
  if (typeof window === "undefined") return;
  const file = readFile();
  delete file[customerId];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(file));
}
