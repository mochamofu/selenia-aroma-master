"use client";

import { useCallback, useState } from "react";

/**
 * カルテ編集の「戻る・進む」。
 *
 * 記録するのは、消した・足したといった1回で完結する操作だけにする。
 * 文字入力を1文字ずつ記録すると、戻るボタンを何十回も押すことになるため。
 *
 * 使い方: 状態を変える直前に `commit()` を呼ぶ。呼んだ時点の状態が
 * 「戻る」で復元される地点になる。
 */
export type EditHistory<T> = {
  commit: (label: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  canUndo: boolean;
  canRedo: boolean;
  /** 直前に記録した操作の名前。「〜を元に戻しました」の表示に使う。 */
  lastLabel: string;
};

const MAX_ENTRIES = 50;

export function useEditHistory<T>(snapshot: () => T, restore: (value: T) => void): EditHistory<T> {
  type Entry = { label: string; value: T };
  const [past, setPast] = useState<Entry[]>([]);
  const [future, setFuture] = useState<Entry[]>([]);

  const commit = useCallback(
    (label: string) => {
      setPast((current) => [...current, { label, value: snapshot() }].slice(-MAX_ENTRIES));
      setFuture([]);
    },
    [snapshot],
  );

  const undo = useCallback(() => {
    const entry = past[past.length - 1];
    if (!entry) return null;
    setPast((current) => current.slice(0, -1));
    setFuture((current) => [...current, { label: entry.label, value: snapshot() }]);
    restore(entry.value);
    return entry.label;
  }, [past, restore, snapshot]);

  const redo = useCallback(() => {
    const entry = future[future.length - 1];
    if (!entry) return null;
    setFuture((current) => current.slice(0, -1));
    setPast((current) => [...current, { label: entry.label, value: snapshot() }]);
    restore(entry.value);
    return entry.label;
  }, [future, restore, snapshot]);

  return {
    commit,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    lastLabel: past[past.length - 1]?.label ?? "",
  };
}
