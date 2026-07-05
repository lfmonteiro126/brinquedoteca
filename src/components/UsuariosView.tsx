"use client";

import { useEffect, useState } from "react";
import { Edit, Plus, Shield, UserX, X } from "lucide-react";
import type { User } from "@/lib/types";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SkeletonTable } from "@/components/Skeleton";

interface FormData {
  nome: string;
  email: string;
  senha: string;
  role: "admin" | "vendedor";
}

const emptyForm: FormData = { nome: "", email: "", senha: "", role: "vendedor" };

export function UsuariosView() {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<User | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/usuarios")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setUsuarios(data.usuarios || []);
      })
      .catch(() => {
        if (!cancelled) setUsuarios([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEdit(u: User) {
    setEditing(u);
    setForm({ nome: u.nome, email: u.email, senha: "", role: u.role });
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      if (editing) {
        const body: Record<string, unknown> = {
          nome: form.nome,
          email: form.email,
          role: form.role,
        };
        if (form.senha) body.senha = form.senha;

        const res = await fetch(`/api/usuarios/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error);
          setSaving(false);
          return;
        }
      } else {
        if (!form.senha) {
          setError("Senha é obrigatória para novo usuário");
          setSaving(false);
          return;
        }
        const res = await fetch("/api/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error);
          setSaving(false);
          return;
        }
      }
    } catch {
      setError("Erro de conexão");
      setSaving(false);
      return;
    }

    setSaving(false);
    closeForm();
    setReloadKey((k) => k + 1);
  }

  async function deactivateUser() {
    if (!confirmDeactivate) return;
    try {
      await fetch(`/api/usuarios/${confirmDeactivate.id}`, { method: "DELETE" });
    } catch {
      // silently handle network error
    }
    setConfirmDeactivate(null);
    setReloadKey((k) => k + 1);
  }

  const ativos = usuarios.filter((u) => u.ativo);
  const inativos = usuarios.filter((u) => !u.ativo);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-violet-900 dark:text-violet-300">Usuários</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerenciar vendedores e administradores</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          Novo usuário
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white dark:bg-[var(--card-bg)] shadow-sm">
        {loading ? (
          <SkeletonTable rows={4} cols={5} />
        ) : ativos.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">Nenhum usuário cadastrado</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-violet-50 dark:bg-violet-900/20 text-left text-violet-800 dark:text-violet-300">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3 hidden sm:table-cell">Email</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3 hidden md:table-cell">Criado em</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ativos.map((u) => (
                <tr key={u.id} className="border-t border-slate-50 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{u.nome}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === "admin"
                          ? "bg-violet-100 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {u.role === "admin" && <Shield className="h-3 w-3" />}
                      {u.role === "admin" ? "Admin" : "Vendedor"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                    {new Date(u.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="rounded-lg p-1.5 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeactivate(u)}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Desativar"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {inativos.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-800 dark:text-slate-200">
            Inativos ({inativos.length})
          </h2>
          <ul className="space-y-2">
            {inativos.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-2"
              >
                <div>
                  <span className="font-medium text-slate-600 dark:text-slate-400">{u.nome}</span>
                  <span className="ml-2 text-sm text-slate-400 dark:text-slate-500">{u.email}</span>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await fetch(`/api/usuarios/${u.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ativo: true }),
                      });
                    } catch {
                      // silently handle network error
                    }
                    setReloadKey((k) => k + 1);
                  }}
                  className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
                >
                  Reativar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-[var(--card-bg)] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {editing ? "Editar usuário" : "Novo usuário"}
              </h3>
              <button onClick={closeForm} className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nome</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200 px-4 py-2.5 outline-none focus:border-violet-400"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200 px-4 py-2.5 outline-none focus:border-violet-400"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {editing ? "Nova senha (deixe vazio para manter)" : "Senha"}
                </label>
                <input
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200 px-4 py-2.5 outline-none focus:border-violet-400"
                  minLength={6}
                  {...(!editing ? { required: true } : {})}
                />
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Mínimo de 6 caracteres</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Perfil</label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as "admin" | "vendedor" })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200 px-4 py-2.5 outline-none focus:border-violet-400"
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-[var(--card-border)] py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeactivate}
        title="Desativar usuário?"
        message={`"${confirmDeactivate?.nome}" não poderá mais acessar o sistema.`}
        confirmLabel="Desativar"
        danger
        onConfirm={deactivateUser}
        onCancel={() => setConfirmDeactivate(null)}
      />
    </div>
  );
}
