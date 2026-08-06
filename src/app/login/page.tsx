"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ToyBrick, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Email ou senha inválidos");
      return;
    }

    if (data.user?.primeiro_login) {
      router.push("/trocar-senha");
    } else if (data.user?.role === "vendedor") {
      router.push("/vendas");
    } else {
      router.push("/");
    }
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-100 via-white to-amber-100 dark:from-[var(--background)] dark:via-[var(--background)] dark:to-[var(--background)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-violet-100 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-8 shadow-lg shadow-violet-100/50 dark:shadow-black/20">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/30">
            <ToyBrick className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-violet-900 dark:text-violet-300">Ateliê Angels Kids</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Loja Praia Grande</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--input-bg)] px-4 py-3 outline-none transition text-slate-900 dark:text-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
            <div className="relative">
              <input
                type={showSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--input-bg)] px-4 py-3 pr-12 outline-none transition text-slate-900 dark:text-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowSenha(!showSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
          Acesso restrito para funcionários autorizados
        </p>
      </div>
    </div>
  );
}
