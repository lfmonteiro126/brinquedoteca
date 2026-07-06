"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, Pencil, Plus, Search, Trash2, Package } from "lucide-react";
import { formatCurrency, normalizeImageUrl } from "@/lib/format";
import { useDebounce } from "@/hooks/useDebounce";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Produto } from "@/lib/types";

const PAGE_SIZE = 20;

export function ProdutosView({ isAdmin }: { isAdmin: boolean }) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Produto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const categorias = [...new Set(produtos.map((p) => p.categoria).filter(Boolean))] as string[];

  const debouncedSearch = useDebounce((value: string) => {
    setSearch(value);
    setPage(1);
  }, 300);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (search) params.set("q", search);
      try {
        const res = await fetch(`/api/produtos?${params}`);
        const data = await res.json();
        if (!cancelled) {
          setProdutos(data.produtos || []);
          setTotal(data.total || 0);
        }
      } catch {
        if (!cancelled) {
          setProdutos([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page, search]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQ(e.target.value);
    debouncedSearch(e.target.value);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/produtos/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setProdutos((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setTotal((prev) => prev - 1);
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  }

  const produtosFiltrados = categoriaFilter
    ? produtos.filter((p) => p.categoria === categoriaFilter)
    : produtos;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-violet-900 dark:text-violet-300">Brinquedos</h1>
          <p className="text-slate-500 dark:text-slate-400">Cadastro e controle de estoque</p>
        </div>
        {isAdmin && (
          <Link
            href="/produtos/novo"
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            Novo brinquedo
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-[var(--card-bg)] dark:border-[var(--card-border)]">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={q}
            onChange={handleSearchChange}
            placeholder="Pesquise brinquedos por SKU ou Nome..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-violet-400 dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Categoria:</span>
          <div className="relative">
            <select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm outline-none focus:border-violet-400 dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200"
            >
              <option value="">Todos</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
        <button
          onClick={() => setCategoriaFilter("")}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            !categoriaFilter
              ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => {
            setSearch("");
            setQ("");
            setPage(1);
          }}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-[var(--card-border)] dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Baixo Estoque
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-[var(--card-bg)] dark:border-[var(--card-border)]">
              <div className="mb-4 h-40 rounded-xl bg-slate-200 dark:bg-slate-700" />
              <div className="mb-2 h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mb-2 h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mb-3 h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mb-4 h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mb-4 flex gap-4">
                <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="mb-4 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
              <div className="flex gap-2">
                <div className="h-9 flex-1 rounded-xl bg-slate-200 dark:bg-slate-700" />
                <div className="h-9 flex-1 rounded-xl bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      ) : produtosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 dark:bg-[var(--card-bg)] dark:border-[var(--card-border)]">
          <Package className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-400 dark:text-slate-500">Nenhum brinquedo encontrado</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {produtosFiltrados.map((p) => {
              const baixo = p.estoque <= p.estoque_minimo;
              return (
                <div
                  key={p.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-[var(--card-bg)] dark:border-[var(--card-border)]"
                >
                  <Link
                    href={`/produtos/${p.id}/editar`}
                    className="flex flex-1 flex-col"
                  >
                    <div className="relative">
                      {baixo ? (
                        <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                          <AlertTriangle className="h-3 w-3" />
                          REPOR! QTD: {p.estoque}
                        </span>
                      ) : (
                        <span className="absolute left-3 top-3 z-10 rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                          ESTOQUE OK
                        </span>
                      )}
                      {p.imagem_url && normalizeImageUrl(p.imagem_url) ? (
                        <img
                          src={normalizeImageUrl(p.imagem_url)}
                          alt={p.nome}
                          className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent && !parent.querySelector(".fallback-icon")) {
                              const fallback = document.createElement("div");
                              fallback.className = "fallback-icon flex h-44 w-full items-center justify-center bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/20 dark:to-violet-800/10";
                              fallback.innerHTML = '<svg class="h-12 w-12 text-violet-300 dark:text-violet-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>';
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      ) : (
                        <div className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/20 dark:to-violet-800/10">
                          <Package className="h-12 w-12 text-violet-300 dark:text-violet-600" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400">
                        {p.categoria || "Sem categoria"}
                      </p>
                      <h3 className="mb-2 text-base font-bold leading-tight text-slate-800 dark:text-slate-200 line-clamp-2">
                        {p.nome}
                      </h3>
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono dark:bg-slate-700">
                          SKU: {p.codigo_barras || "—"}
                        </span>
                        <span>Mínimo: {p.estoque_minimo} un.</span>
                      </div>
                      {p.descricao && (
                        <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                          {p.descricao}
                        </p>
                      )}

                      <div className="mt-auto">
                        <div className="mb-3 flex items-end justify-between">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Preço Venda</p>
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(p.preco_venda)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Custo Compra</p>
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                              {formatCurrency(p.preco_custo)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="p-4 pt-0">
                      <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-[var(--card-border)] dark:bg-slate-800/50">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          Qtd: <span className="font-bold text-slate-800 dark:text-slate-200">{p.estoque}</span>
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => e.preventDefault()}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                          >
                            −
                          </button>
                          <button
                            onClick={(e) => e.preventDefault()}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {isAdmin && (
                          <Link
                            href={`/produtos/${p.id}/editar`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-[var(--card-border)] dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Link>
                        )}
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(p);
                            }}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:border-[var(--card-border)] dark:bg-transparent dark:text-slate-300 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-800"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>
                </div>
              );
            })}
          </div>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:bg-[var(--card-bg)] dark:border-[var(--card-border)] dark:text-slate-400 dark:hover:bg-slate-700"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Página {page} de {Math.ceil(total / PAGE_SIZE)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / PAGE_SIZE)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:bg-[var(--card-bg)] dark:border-[var(--card-border)] dark:text-slate-400 dark:hover:bg-slate-700"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir brinquedo"
        message={`Tem certeza que deseja excluir "${deleteTarget?.nome}"? Essa ação não pode ser desfeita.`}
        confirmLabel={deleting ? "Excluindo..." : "Excluir"}
        danger
      />
    </div>
  );
}
