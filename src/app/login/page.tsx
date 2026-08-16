"use client";

import { FormEvent, useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { signInWithEmail } from "@/lib/auth";
import { isCustomerOnlyApp } from "@/lib/appTarget";
import { isDemoModeEnabled } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(isDemoModeEnabled ? "yuka@example.com" : "");
  const [password, setPassword] = useState(isDemoModeEnabled ? "password" : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isCustomerOnlyApp && isDemoModeEnabled) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signInWithEmail(email, password);
      const role = isCustomerOnlyApp ? "customer" : "role" in result ? result.role : email.includes("admin") ? "admin" : "customer";
      router.replace(role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-[430px] place-items-center bg-[#FAF7F1] px-6">
      <form onSubmit={onSubmit} className="w-full rounded-[34px] bg-white/86 p-6 shadow-2xl shadow-stone-300/40 backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[24px] bg-gradient-to-br from-[#c6b0e6] to-[#d7c58e] text-white shadow-lg">
            <Icon name="Sparkles" className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Selenia Aroma</h1>
          <p className="mt-2 text-sm leading-6 text-stone-500">制作記録と香りの記憶を、いつでも手元に。</p>
        </div>
        <label className="block text-sm font-bold text-stone-700">
          メール
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="text" inputMode="email" autoComplete="email" className="mt-2 h-14 w-full rounded-2xl border border-[#e4d8c7] bg-[#faf7f1] px-4 text-base outline-none transition focus:border-[#9b82c8]" required />
        </label>
        <label className="mt-4 block text-sm font-bold text-stone-700">
          パスワード
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="mt-2 h-14 w-full rounded-2xl border border-[#e4d8c7] bg-[#faf7f1] px-4 text-base outline-none transition focus:border-[#9b82c8]" required />
        </label>
        {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <button disabled={loading} className="mt-6 h-14 w-full rounded-full bg-[#755aa8] text-base font-bold text-white shadow-lg shadow-[#755aa8]/25 transition hover:brightness-105 active:scale-95 disabled:opacity-60" type="submit" aria-label="ログイン">
          {loading ? "ログイン中..." : "ログイン"}
        </button>
        {isDemoModeEnabled ? (
          <p className="mt-4 text-center text-xs leading-5 text-stone-500">
            {isCustomerOnlyApp ? "デモ: yuka@example.com / password" : "デモ: customer は yuka@example.com、admin は admin@example.com"}
          </p>
        ) : null}
      </form>
    </main>
  );
}
