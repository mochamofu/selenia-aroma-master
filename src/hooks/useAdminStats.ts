"use client";

import { useMemo } from "react";
import { demoCustomers } from "@/data/mockData";
import type { AromaRecord } from "@/types/aroma";

export function useAdminStats(records: AromaRecord[]) {
  return useMemo(
    () => ({
      customers: demoCustomers.filter((profile) => profile.role === "customer").length,
      records: records.length,
      newThisMonth: records.filter((record) => record.made_at.startsWith("2026-05")).length,
    }),
    [records],
  );
}
