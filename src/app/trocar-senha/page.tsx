"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ToyBrick } from "lucide-react";

export default function TrocarSenhaPage() {
  const router = useRouter();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (novaSenha !== confirmar) {
      setError("As senhas não coincidem");
      return;
    }
    if (novaSenha.length < 6) {
      setError("Nova senha deve ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/trocar-senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senhaAtual, novaSenha }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Erro ao trocar senha");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-100 via-white to-amber-100 dark:from-violet-950 dark:via-slate-900 dark:to-amber-950 p-4">
      <div className="w-full max-w-md rounded-2xl border border-violet-100 dark:border-violet-800 bg-white dark:bg-[var(--card-bg)] p-8 shadow-lg shadow-violet-100/50 dark:shadow-violet-900/30">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-lg shadow-violet-200">
            <ToyBrick className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-violet-900 dark:text-violet-100">Trocar senha</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Primeiro acesso — defina uma nova senha para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Senha atual</label>
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200 px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              placeholder="Digite sua senha atual"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nova senha</label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200 px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Confirmar nova senha
            </label>
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200 px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              placeholder="Repita a nova senha"
              minLength={6}
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
          >
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
