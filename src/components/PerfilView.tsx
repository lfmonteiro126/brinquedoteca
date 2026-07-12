"use client";

import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { usePreferences } from "@/hooks/usePreferences";
import { User, Moon, Sun, Save } from "lucide-react";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";
import type { User as UserType } from "@/lib/types";

export function PerfilView({ user, breadcrumbs }: { user: UserType; breadcrumbs?: BreadcrumbItem[] }) {
  const { resolvedTheme: theme, toggleTheme } = useTheme();
  const { prefs, updatePreferences } = usePreferences();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

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

    setSuccess("Senha alterada com sucesso!");
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmar("");
  }

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    vendedor: "Vendedor",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>

      {/* Dados pessoais */}
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500 text-white">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{user.nome}</h2>
            <p className="text-sm text-secondary">{user.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted">Função</span>
            <p className="font-medium text-foreground">{roleLabels[user.role] || user.role}</p>
          </div>
          <div>
            <span className="text-muted">Membro desde</span>
            <p className="font-medium text-foreground">
              {new Date(user.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
      </div>

      {/* Preferências */}
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Preferências</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Tema escuro</p>
              <p className="text-sm text-secondary">Alternar entre tema claro e escuro</p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-card-border bg-surface-hover text-foreground transition hover:bg-violet-100 dark:hover:bg-violet-900/30"
            >
              {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Itens por página</p>
              <p className="text-sm text-secondary">Quantidade padrão de itens nas listas</p>
            </div>
            <select
              value={prefs.pageSize}
              onChange={(e) => updatePreferences({ pageSize: Number(e.target.value) })}
              className="rounded-xl border border-card-border bg-input-bg px-3 py-2 text-sm text-foreground outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trocar senha */}
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Trocar senha</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Senha atual</label>
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className="w-full rounded-xl border border-card-border bg-input-bg px-4 py-3 text-foreground outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30"
              placeholder="Digite sua senha atual"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Nova senha</label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="w-full rounded-xl border border-card-border bg-input-bg px-4 py-3 text-foreground outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Confirmar nova senha
            </label>
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className="w-full rounded-xl border border-card-border bg-input-bg px-4 py-3 text-foreground outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30"
              placeholder="Repita a nova senha"
              minLength={6}
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
