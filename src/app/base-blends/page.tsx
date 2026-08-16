"use client";

import { AppShell } from "@/components/AppShell";
import { BaseBlendCard } from "@/components/BaseBlendCard";
import { demoBaseBlends } from "@/data/mockData";
import { useAuth } from "@/hooks/useAuth";
import { DISCLOSURE_DESCRIPTIONS, disclosureLevelForRole } from "@/lib/disclosure";

export default function BaseBlendsPage() {
  const { session, profile } = useAuth();
  const level = disclosureLevelForRole(session?.role ?? profile?.role);

  return (
    <AppShell>
      <div className="space-y-5 px-5 py-6">
        <header>
          <h1 className="text-2xl font-bold text-stone-900">ベースブレンド図鑑</h1>
          <p className="mt-1 text-sm leading-6 text-stone-500">
            セレニアアロマの12種類の土台です。各ブレンドを開くと、香りの印象・使うシーン・
            脳波測定との関係まで確認できます。
          </p>
          <p className="mt-3 rounded-2xl bg-[#faf7ff] p-3 text-xs leading-5 text-[#5b4b7d]">
            現在の表示範囲: {DISCLOSURE_DESCRIPTIONS[level]}
          </p>
        </header>
        <div className="space-y-3">
          {demoBaseBlends.map((blend) => (
            <BaseBlendCard key={blend.id} blend={blend} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
