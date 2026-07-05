"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckSquare, Plus, Printer, Search, Square } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useDebounce } from "@/hooks/useDebounce";
import { Pagination } from "@/components/Pagination";
import { SkeletonTable } from "@/components/Skeleton";
import { LabelPrinter } from "@/components/LabelPrinter";
import type { Produto } from "@/lib/types";

const PAGE_SIZE = 20;

export function ProdutosView({ isAdmin }: { isAdmin: boolean }) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [labelOpen, setLabelOpen] = useState(false);

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
          setSelected(new Set());
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
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === produtos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(produtos.map((p) => p.id)));
    }
  }

  const selectedProdutos = produtos.filter((p) => selected.has(p.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-violet-900 dark:text-violet-300">Brinquedos</h1>
          <p className="text-slate-500 dark:text-slate-400">Cadastro e controle de estoque</p>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <button
              onClick={() => setLabelOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 dark:bg-[var(--card-bg)] dark:border-[var(--card-border)] dark:hover:bg-slate-700"
            >
              <Printer className="h-4 w-4" />
              Imprimir etiquetas ({selected.size})
            </button>
          )}
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
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          value={q}
          onChange={handleSearchChange}
          placeholder="Buscar por nome, código de barras ou categoria..."
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none focus:border-violet-400 dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-[var(--card-bg)]">
        {loading ? (
          <SkeletonTable rows={5} cols={isAdmin ? 7 : 6} />
        ) : produtos.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">Nenhum produto encontrado</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-left text-violet-800 dark:bg-violet-900/20">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleAll} className="text-violet-500 hover:text-violet-700">
                      {selected.size === produtos.length && produtos.length > 0 ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Código</th>
                  <th className="px-4 py-3 hidden md:table-cell">Categoria</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3">Estoque</th>
                  {isAdmin && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {produtos.map((p) => {
                  const baixo = p.estoque <= p.estoque_minimo;
                  const isSelected = selected.has(p.id);
                  return (
                    <tr key={p.id} className={`border-t border-slate-50 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 ${isSelected ? "bg-violet-50/50" : ""}`}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleSelect(p.id)} className="text-violet-500 hover:text-violet-700">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{p.nome}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                        {p.codigo_barras || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                        {p.categoria || "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.preco_venda)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            baixo ? "text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {baixo && <AlertTriangle className="h-3.5 w-3.5" />}
                          {p.estoque}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/produtos/${p.id}/editar`}
                            className="text-violet-600 dark:text-violet-400 hover:underline"
                          >
                            Editar
                          </Link>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </>
        )}
      </div>

      <LabelPrinter
        produtos={selectedProdutos}
        open={labelOpen}
        onClose={() => setLabelOpen(false)}
      />
    </div>
  );
}
