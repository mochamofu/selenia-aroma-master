"use client";

import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { demoCustomers } from "@/data/mockData";
import { useAuth } from "@/hooks/useAuth";

export default function AdminCustomersPage() {
  useAuth("admin");
  return (
    <AppShell variant="admin">
      <div className="space-y-5 px-5 py-6">
        <h1 className="text-2xl font-bold text-stone-900">顧客一覧</h1>
        <div className="space-y-3">
          {demoCustomers.filter((profile) => profile.role === "customer").map((profile) => (
            <div key={profile.id} className="flex items-center gap-3 rounded-[24px] bg-white p-4 shadow-md shadow-stone-300/20">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#d7c58e] font-bold text-white">{profile.name.slice(0, 1)}</div>
              <div className="flex-1">
                <h2 className="font-bold text-stone-900">{profile.name}</h2>
                <p className="text-xs text-stone-500">登録日 {profile.created_at.slice(0, 10)}</p>
              </div>
              <Icon name="ChevronRight" className="h-5 w-5 text-stone-400" />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
