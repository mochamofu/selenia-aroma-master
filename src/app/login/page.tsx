"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Droplet } from "lucide-react";
import { signInWithEmail } from "@/lib/auth";
import { isDemoModeEnabled } from "@/lib/supabaseClient";

/**
 * 管理者・施術者向けアプリのログイン画面。
 *
 * ログイン後の遷移先は常に管理者アプリのダッシュボード（/operator）。
 * 以前はロールで /admin と /dashboard に振り分けていたが、
 * 利用者向けアプリを別リポジトリへ分離したため分岐を廃止した。
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      router.replace("/operator");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--admin-canvas)] px-6 py-10">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-8 shadow-xl shadow-[#2b2340]/8"
      >
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--admin-primary)] text-white">
            <Droplet className="h-8 w-8" />
          </span>
          <h1 className="text-2xl font-bold text-[var(--admin-text)]">Selenia Aroma Karte</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--admin-text-muted)]">
            脳波測定にもとづくアロマ制作の管理アプリ
          </p>
        </div>

        {/* デモ用のIDはメールアドレスの形をしていないため、ラベルは「ID」にしている。 */}
        <label className="block text-sm font-bold text-[var(--admin-text)]">
          ID（メールアドレス）
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className="mt-2 h-12 w-full rounded-lg border border-[var(--admin-border)] px-4 text-base outline-none transition focus:border-[var(--admin-primary)]"
            required
          />
        </label>

        <label className="mt-4 block text-sm font-bold text-[var(--admin-text)]">
          パスワード
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            className="mt-2 h-12 w-full rounded-lg border border-[var(--admin-border)] px-4 text-base outline-none transition focus:border-[var(--admin-primary)]"
            required
          />
        </label>

        {error ? (
          <p className="mt-4 rounded-lg bg-[var(--admin-danger-soft)] p-3 text-sm font-bold text-[var(--admin-danger)]">
            {error}
          </p>
        ) : null}

        <button
          disabled={loading}
          type="submit"
          className="mt-6 h-12 w-full rounded-lg bg-[var(--admin-primary)] text-base font-bold text-white transition hover:bg-[var(--admin-primary-strong)] disabled:opacity-60"
        >
          {loading ? "ログイン中..." : "ログイン"}
        </button>

        {isDemoModeEnabled ? (
          <p className="mt-4 rounded-lg bg-[var(--admin-primary-softer)] p-3 text-center text-xs leading-5 text-[var(--admin-text-muted)]">
            デモ表示用の画面です。表示されるデータはすべて架空のものです。
          </p>
        ) : null}
      </form>
    </main>
  );
}
