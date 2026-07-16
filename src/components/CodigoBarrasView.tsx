"use client";

import { useEffect, useState } from "react";
import { Search, Barcode, Package, Check, Printer } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { LabelPrinter } from "@/components/LabelPrinter";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";
import type { Produto } from "@/lib/types";

export function CodigoBarrasView({ breadcrumbs }: { breadcrumbs?: BreadcrumbItem[] }) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showLabelPrinter, setShowLabelPrinter] = useState(false);
  const [selectedProdutos, setSelectedProdutos] = useState<Produto[]>([]);

  const PAGE_SIZE = 20;

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

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === produtos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(produtos.map((p) => p.id)));
    }
  }

  function handlePrint() {
    const selected = produtos.filter((p) => selectedIds.has(p.id));
    setSelectedProdutos(selected);
    setShowLabelPrinter(true);
  }

  return (
    <div className="space-y-6">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-violet-900 dark:text-violet-300">
            Códigos de Barras
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {total} produto{total !== 1 ? "s" : ""} com código de barras
          </p>
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Imprimir ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Barra de busca */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-[var(--card-bg)] dark:border-[var(--card-border)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={q}
            onChange={handleSearchChange}
            placeholder="Pesquise por nome ou código de barras..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-violet-400 dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200"
          />
        </div>
      </div>

      {/* Lista de produtos */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-[var(--card-bg)] dark:border-[var(--card-border)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-slate-100 dark:border-[var(--card-border)] py-4 last:border-0">
              <div className="h-5 w-5 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="h-8 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      ) : produtos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 dark:bg-[var(--card-bg)] dark:border-[var(--card-border)]">
          <Barcode className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-400 dark:text-slate-500">Nenhum produto encontrado</p>
        </div>
      ) : (
        <>
          {/* Seleção rápida */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedIds.size === produtos.length}
                onChange={toggleSelectAll}
                className="rounded"
              />
              Selecionar todos ({produtos.length})
            </label>
            {selectedIds.size > 0 && (
              <span className="text-sm text-violet-600 dark:text-violet-400">
                {selectedIds.size} selecionado(s)
              </span>
            )}
          </div>

          {/* Tabela */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/60 dark:border-[var(--card-border)] text-left text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider w-10"></th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider">Produto</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider">Categoria</th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider">Código de Barras</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider">Preço</th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[var(--card-border)]">
                  {produtos.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => toggleSelect(p.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedIds.has(p.id)
                          ? "bg-violet-50 dark:bg-violet-900/20"
                          : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center">
                          {selectedIds.has(p.id) ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-violet-600">
                              <Check className="h-3.5 w-3.5 text-white" />
                            </div>
                          ) : (
                            <div className="h-5 w-5 rounded border border-slate-300 dark:border-slate-600" />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {p.imagem_url ? (
                            <img src={p.imagem_url} alt={p.nome} className="h-10 w-10 rounded-xl object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                              <Package className="h-5 w-5 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{p.nome}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                        {p.categoria || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs dark:bg-slate-700">
                          {p.codigo_barras || "Sem código"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        R$ {p.preco_venda.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {p.codigo_barras ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            <Barcode className="h-3 w-3" />
                            Válido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                            Sem código
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginação */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-40 dark:bg-[var(--card-bg)] dark:border-[var(--card-border)] dark:text-slate-400 dark:hover:bg-slate-700 transition-transform"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Página {page} de {Math.ceil(total / PAGE_SIZE)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / PAGE_SIZE)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-40 dark:bg-[var(--card-bg)] dark:border-[var(--card-border)] dark:text-slate-400 dark:hover:bg-slate-700 transition-transform"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de impressão */}
      {showLabelPrinter && (
        <LabelPrinter
          produtos={selectedProdutos}
          open={showLabelPrinter}
          onClose={() => {
            setShowLabelPrinter(false);
            setSelectedProdutos([]);
          }}
        />
      )}
    </div>
  );
}
