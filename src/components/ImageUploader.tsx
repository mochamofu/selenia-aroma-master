"use client";

import { useState } from "react";
import { Icon } from "./Icon";

export function ImageUploader() {
  const [fileName, setFileName] = useState("");
  return (
    <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-[#d8c8ea] bg-[#fbf8ff] p-5 text-center transition hover:bg-[#f3edfb]">
      <Icon name="ImagePlus" className="h-8 w-8 text-[#8d6fd1]" />
      <span className="mt-2 text-sm font-bold text-stone-700">{fileName || "商品画像をアップロード"}</span>
      <span className="mt-1 text-xs text-stone-500">Supabase Storage aroma-images に保存します</span>
      <input
        className="sr-only"
        type="file"
        accept="image/*"
        onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
      />
    </label>
  );
}
