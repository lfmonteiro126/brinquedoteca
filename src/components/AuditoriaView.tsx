"use client";

import { useEffect, useState } from "react";
import {
  Filter,
  X,
  Plus,
  Minus,
  Settings,
  ShoppingCart,
  ClipboardList,
  RotateCcw,
  Clock,
  ArrowRight,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";
import type { Movimentacao } from "@/lib/types";

const PAGE_SIZE = 30;

function getTipoStyles(tipo: string) {
  switch (tipo) {
    case "entrada":
      return {
        icon: Plus,
        color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30",
        label: "Entrada",
      };
    case "saida":
      return {
        icon: Minus,
        color: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border-red-100 dark:border-red-900/30",
        label: "Saída",
      };
    case "ajuste":
      return {
        icon: Settings,
        color: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-100 dark:border-blue-900/30",
        label: "Ajuste",
      };
    case "venda":
      return {
        icon: ShoppingCart,
        color: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 border-violet-100 dark:border-violet-900/30",
        label: "Venda",
      };
    case "inventario":
      return {
        icon: ClipboardList,
        color: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-100 dark:border-amber-900/30",
        label: "Inventário",
      };
    case "estorno":
      return {
        icon: RotateCcw,
        color: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-100 dark:border-rose-900/30",
        label: "Estorno",
      };
    default:
      return {
        icon: Settings,
        color: "bg-slate-50 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400 border-slate-100 dark:border-slate-800",
        label: "Ajuste",
      };
  }
}

function renderEventMessage(m: Movimentacao) {
  const user = <span className="font-semibold text-slate-800 dark:text-slate-200">{m.usuario_nome}</span>;
  const product = <span className="font-semibold text-slate-800 dark:text-slate-200">{m.produto_nome}</span>;
  const qty = <span className="font-bold text-slate-950 dark:text-slate-100">{Math.abs(m.quantidade)}</span>;

  switch (m.tipo) {
    case "entrada":
      return (
        <p className="text-sm text-slate-600 dark:text-slate-350">
          {user} adicionou {qty} unidade(s) de {product} ao estoque.
        </p>
      );
    case "saida":
      return (
        <p className="text-sm text-slate-600 dark:text-slate-355">
          {user} retirou {qty} unidade(s) de {product} do estoque.
        </p>
      );
    case "venda":
      return (
        <p className="text-sm text-slate-600 dark:text-slate-355">
          {user} registrou a venda de {qty} unidade(s) de {product}.
        </p>
      );
    case "estorno":
      return (
        <p className="text-sm text-slate-600 dark:text-slate-355">
          {user} estornou a venda de {qty} unidade(s) de {product}, devolvendo-as ao estoque.
        </p>
      );
    case "inventario":
      return (
        <p className="text-sm text-slate-600 dark:text-slate-355">
          {user} atualizou o estoque de {product} via inventário.
        </p>
      );
    case "ajuste":
    default:
      return (
        <p className="text-sm text-slate-600 dark:text-slate-355">
          {user} realizou um ajuste manual no estoque de {product}.
        </p>
      );
  }
}

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

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : movimentacoes.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] border border-slate-200 dark:border-[var(--card-border)] px-4 py-12 text-center text-slate-400 dark:text-slate-500 shadow-xs">
            Nenhuma movimentação encontrada
          </div>
        ) : (
          <>
            {/* Timeline container */}
            <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 sm:ml-6 pl-6 sm:pl-8 space-y-5 py-2">
              {movimentacoes.map((m) => {
                const styles = getTipoStyles(m.tipo);
                const Icon = styles.icon;
                const isPositive = m.quantidade > 0;
                
                return (
                  <div key={m.id} className="relative group">
                    {/* Circle icon marker on the timeline */}
                    <div className={`absolute -left-[37px] sm:-left-[45px] top-2 flex h-6 sm:h-8 w-6 sm:w-8 items-center justify-center rounded-full border bg-white dark:bg-slate-900 shadow-xs transition-transform group-hover:scale-105 ${styles.color}`}>
                      <Icon className="h-3 sm:h-4 w-3 sm:w-4" />
                    </div>

                    {/* Event block card */}
                    <div className="rounded-2xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-4 sm:p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-violet-100 dark:hover:border-violet-850">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          {/* Narrative sentence */}
                          {renderEventMessage(m)}

                          {/* Time details */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatDate(m.created_at)}</span>
                          </div>
                        </div>

                        {/* Stock differences and badges at the right */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0 self-start sm:self-center">
                          {/* Stock diff indicators */}
                          <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-350 border border-slate-100 dark:border-slate-850 font-display tabular-nums">
                            <span>{m.estoque_anterior}</span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{m.estoque_novo}</span>
                          </div>

                          {/* Quantidade diff pill */}
                          <span className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-bold font-display tabular-nums border ${
                            isPositive
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/40"
                              : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200/50 dark:border-red-900/40"
                          }`}>
                            {isPositive ? "+" : ""}{m.quantidade}
                          </span>
                        </div>
                      </div>

                      {/* Motivo description note if it exists */}
                      {m.motivo && (
                        <div className="mt-3 rounded-xl bg-slate-50/55 dark:bg-slate-900/40 px-3 py-2 border-l-2 border-violet-400 dark:border-violet-500 text-xs italic text-slate-500 dark:text-slate-400">
                          &ldquo;{m.motivo}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4">
              <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
