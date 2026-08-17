"use client";

import { useFavorite } from "@/hooks/useFavorite";
import { Icon } from "./Icon";

export function FavoriteButton({
  userId,
  aromaRecordId,
  initial,
  className = "",
}: {
  userId?: string;
  aromaRecordId: string;
  initial?: boolean;
  className?: string;
}) {
  const { favorite, toggle } = useFavorite(userId, aromaRecordId, initial);
  return (
    <button
      type="button"
      aria-label={favorite ? "お気に入りから外す" : "お気に入りに追加"}
      onClick={(event) => {
        event.preventDefault();
        toggle();
      }}
      className={`grid h-10 w-10 place-items-center rounded-full bg-white/88 text-[#a77891] shadow-md transition hover:scale-105 active:scale-95 ${className}`}
    >
      <Icon name="Heart" className={`h-5 w-5 ${favorite ? "fill-[#cf7f9f]" : ""}`} />
    </button>
  );
}
