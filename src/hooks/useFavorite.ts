"use client";

import { useEffect, useState } from "react";
import { isFavorite, toggleFavorite } from "@/services/favoritesService";

export function useFavorite(userId: string | undefined, aromaRecordId: string, initial = false) {
  const [favorite, setFavorite] = useState(initial);

  useEffect(() => {
    if (!userId) return;
    isFavorite(userId, aromaRecordId).then(setFavorite).catch(() => setFavorite(initial));
  }, [aromaRecordId, initial, userId]);

  return {
    favorite,
    toggle: async () => {
      if (!userId) return;
      const next = !favorite;
      setFavorite(next);
      try {
        await toggleFavorite(userId, aromaRecordId, next);
      } catch {
        setFavorite(!next);
      }
    },
  };
}
