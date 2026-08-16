"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AromaCard } from "@/components/AromaCard";
import { Icon } from "@/components/Icon";
import { useAromaRecords } from "@/hooks/useAromaRecords";
import { useAuth } from "@/hooks/useAuth";

const menu = ["アカウント設定", "お届け先情報", "お支払い方法", "通知設定", "ヘルプ・お問い合わせ"];

export default function ProfilePage() {
  const { session, profile, logout } = useAuth("customer");
  const { records } = useAromaRecords(session?.userId);
  const favorites = records.filter((record) => record.favorite);

  return (
    <AppShell>
      <div className="space-y-6 px-5 py-6">
        <header className="flex items-center justify-between">
          <Link href="/dashboard" className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-md" aria-label="戻る"><Icon name="ArrowLeft" className="h-5 w-5" /></Link>
          <button className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-md" aria-label="設定"><Icon name="Settings" className="h-5 w-5" /></button>
        </header>
        <section className="text-center">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-[32px] bg-[#d7c58e] text-3xl font-bold text-white shadow-lg">{profile?.name?.slice(0, 1) ?? "花"}</div>
          <h1 className="mt-4 text-2xl font-bold text-stone-900">{profile?.name ?? "お客様"}</h1>
          <p className="mt-1 text-sm text-stone-500">会員登録日 {profile?.created_at.slice(0, 10)}</p>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold text-stone-900">お気に入りの香り</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {favorites.map((record) => <div key={record.id} className="w-40 shrink-0"><AromaCard record={record} userId={session?.userId} /></div>)}
          </div>
        </section>
        <section className="rounded-[28px] bg-white p-5 shadow-lg shadow-stone-300/20">
          <h2 className="text-lg font-bold text-stone-900">好みの香りタイプ</h2>
          <div className="mt-3 flex flex-wrap gap-2">{profile?.favorite_types?.map((type) => <span key={type} className="rounded-full bg-[#efe8fb] px-3 py-1.5 text-xs font-bold text-[#755aa8]">{type}</span>)}</div>
          <h2 className="mt-5 text-lg font-bold text-stone-900">使用頻度の高い時間帯</h2>
          <div className="mt-3 flex flex-wrap gap-2">{profile?.frequent_times?.map((time) => <span key={time} className="rounded-full bg-[#eef4e9] px-3 py-1.5 text-xs font-bold text-[#5e7d56]">{time}</span>)}</div>
        </section>
        <section className="overflow-hidden rounded-[28px] bg-white shadow-lg shadow-stone-300/20">
          {menu.map((item) => <button key={item} className="flex h-14 w-full items-center justify-between border-b border-stone-100 px-5 text-left text-sm font-bold text-stone-700"><span>{item}</span><Icon name="ChevronRight" className="h-5 w-5 text-stone-400" /></button>)}
          <button onClick={logout} className="flex h-14 w-full items-center gap-3 px-5 text-left text-sm font-bold text-red-600"><Icon name="LogOut" className="h-5 w-5" />ログアウト</button>
        </section>
      </div>
    </AppShell>
  );
}
