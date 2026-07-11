"use client";

import { useEffect, useState } from "react";
import { Filter, X } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Pagination } from "@/components/Pagination";
import { SkeletonTable } from "@/components/Skeleton";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";
import type { Movimentacao } from "@/lib/types";

const PAGE_SIZE = 30;

const tipoLabels: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
  venda: "Venda",
  inventario: "Inventário",
  estorno: "Estorno",
};

const tipoColors: Record<string, string> = {
  entrada: "bg-emerald-100 text-emerald-700",
  saida: "bg-red-100 text-red-700",
  ajuste: "bg-blue-100 text-blue-700",
  venda: "bg-violet-100 text-violet-700",
  inventario: "bg-amber-100 text-amber-700",
  estorno: "bg-rose-100 text-rose-700",
};

export function AuditoriaView({ breadcrumbs }: { breadcrumbs?: BreadcrumbItem[] }) {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [tipo, setTipo] = useState("");
  const [produto, setProduto] = useState("");
  const [desde, setDesde] = useState("");
  const [ate, setAte] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (tipo) params.set("tipo", tipo);
      if (produto) params.set("produto", produto);
      if (desde) params.set("desde", desde);
      if (ate) params.set("ate", ate);

      const res = await fetch(`/api/auditoria?${params}`);
      const data = await res.json();
      if (!cancelled) {
        setMovimentacoes(data.movimentacoes || []);
        setTotal(data.total || 0);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [page, tipo, produto, desde, ate]);

  function handleFilter() {
    setPage(1);
  }

  function clearFilters() {
    setTipo("");
    setProduto("");
    setDesde("");
    setAte("");
    setPage(1);
  }

  const hasFilters = tipo || produto || desde || ate;

  return (
    <div className="space-y-6">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-violet-900 dark:text-violet-300">Auditoria</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Histórico completo de movimentações — quem fez, quando e por quê
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            showFilters || hasFilters
              ? "bg-violet-100 text-violet-700"
              : "bg-white dark:bg-[var(--card-bg)] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[var(--card-border)] hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <Filter className="h-4 w-4" />
          Filtros
          {hasFilters && (
            <span className="ml-1 rounded-full bg-violet-600 px-1.5 py-0.5 text-xs text-white">
              {[tipo, produto, desde, ate].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-800 outline-none"
              >
                <option value="">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
                <option value="ajuste">Ajuste</option>
                <option value="venda">Venda</option>
                <option value="inventario">Inventário</option>
                <option value="estorno">Estorno</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Produto</label>
              <input
                value={produto}
                onChange={(e) => setProduto(e.target.value)}
                placeholder="Nome do produto..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-800 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Desde</label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-800 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Até</label>
              <input
                type="date"
                value={ate}
                onChange={(e) => setAte(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-800 outline-none"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleFilter}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 active:scale-[0.98]"
            >
              Aplicar
            </button>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-[var(--card-border)] px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98]"
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl bg-white dark:bg-[var(--card-bg)] shadow-sm">
        {loading ? (
          <SkeletonTable rows={5} cols={7} />
        ) : movimentacoes.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
            Nenhuma movimentação encontrada
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-[var(--card-border)] text-left text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Produto</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">Qtd</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Estoque</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider">Funcionário</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[var(--card-border)]">
                {movimentacoes.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(m.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium">{m.produto_nome}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${tipoColors[m.tipo]}`}
                      >
                        {tipoLabels[m.tipo]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold hidden sm:table-cell">{m.quantidade}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                      {m.estoque_anterior} &rarr; {m.estoque_novo}
                    </td>
                    <td className="px-4 py-3">{m.usuario_nome}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                      {m.motivo || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
