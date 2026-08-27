"use client";

/**
 * バックアップの書き出しと読み込み。
 *
 * いまの保存先はブラウザ（localStorage）だけなので、端末が壊れたりブラウザの
 * データを消したりすると内容が失われる。恒久的な保存先を用意するまでの保険として、
 * 全体を1つのファイルに書き出し、別の端末で読み込めるようにする。
 *
 * 対象はこのアプリが `selenia.` で始まるキーに保存しているものすべて。
 */

const PREFIX = "selenia.";
const FORMAT = "selenia-backup";
const VERSION = 1;

export type BackupFile = {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  entries: Record<string, string>;
};

export function buildBackup(): BackupFile {
  const entries: Record<string, string> = {};
  if (typeof window !== "undefined") {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith(PREFIX)) continue;
      const value = window.localStorage.getItem(key);
      if (value !== null) entries[key] = value;
    }
  }
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    entries,
  };
}

/** バックアップに含まれる項目数。書き出す前に中身が空でないか確かめるのに使う。 */
export function countEntries(backup: BackupFile): number {
  return Object.keys(backup.entries).length;
}

export function downloadBackup(): number {
  const backup = buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `selenia-backup-${backup.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  return countEntries(backup);
}

export class BackupFormatError extends Error {}

/**
 * バックアップを読み込む。
 * 現在の内容は上書きされるため、呼び出す側で必ず確認を取ること。
 */
export async function restoreBackup(file: File): Promise<number> {
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(await file.text()) as BackupFile;
  } catch {
    throw new BackupFormatError("ファイルを読み取れませんでした。書き出したJSONファイルを選んでください。");
  }

  if (parsed?.format !== FORMAT || typeof parsed.entries !== "object" || parsed.entries === null) {
    throw new BackupFormatError("このアプリで書き出したバックアップではないようです。");
  }
  if (parsed.version > VERSION) {
    throw new BackupFormatError("新しい形式のバックアップです。アプリを更新してから読み込んでください。");
  }

  // 既存の内容を消してから入れ直す。中途半端に混ざるのを避ける。
  const existing: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(PREFIX)) existing.push(key);
  }
  existing.forEach((key) => window.localStorage.removeItem(key));

  let restored = 0;
  for (const [key, value] of Object.entries(parsed.entries)) {
    if (!key.startsWith(PREFIX) || typeof value !== "string") continue;
    window.localStorage.setItem(key, value);
    restored += 1;
  }
  return restored;
}
