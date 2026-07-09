"use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Filter, Undo2, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Pagination } from "@/components/Pagination";
import { SkeletonTable } from "@/components/Skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";
import type { Venda } from "@/lib/types";

const PAGE_SIZE = 20;

const metodoLabels: Record<string, string> = {
  pix: "PIX",
  debito: "Débito",
  credito: "Crédito",
  dinheiro: "Dinheiro",
};

export function VendasHistoricoView({ isAdmin, breadcrumbs }: { isAdmin: boolean; breadcrumbs?: BreadcrumbItem[] }) {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [estornando, setEstornando] = useState<number | null>(null);
  const [confirmEstorno, setConfirmEstorno] = useState<Venda | null>(null);

  const [data, setData] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [metodo, setMetodo] = useState("");
  const [desde, setDesde] = useState("");
  const [ate, setAte] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (data) params.set("data", data);
      if (vendedor) params.set("vendedor", vendedor);
      if (metodo) params.set("metodo", metodo);
      if (desde) params.set("desde", desde);
      if (ate) params.set("ate", ate);

      try {
        const res = await fetch(`/api/vendas?${params}`);
        const json = await res.json();
        if (!cancelled) {
          setVendas(json.vendas || []);
          setTotal(json.total || 0);
        }
      } catch {
        if (!cancelled) {
          setVendas([]);
          setTotal(0);
        }
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [page, data, vendedor, metodo, desde, ate, reloadKey]);

  function handleFilter() {
    setPage(1);
  }

  function clearFilters() {
    setData("");
    setVendedor("");
    setMetodo("");
    setDesde("");
    setAte("");
    setPage(1);
  }

  const hasFilters = data || vendedor || metodo || desde || ate;

  async function handleEstorno() {
    if (!confirmEstorno) return;
    setEstornando(confirmEstorno.id);
    setConfirmEstorno(null);
    try {
      const res = await fetch(`/api/vendas/${confirmEstorno.id}/estorno`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setReloadKey((k) => k + 1);
      } else {
        alert(data.error || "Erro ao estornar venda");
      }
    } catch {
      alert("Erro de conexão ao estornar venda");
    }
    setEstornando(null);
  }

  return (
    <div className="space-y-6">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-violet-900 dark:text-violet-300">Histórico de vendas</h1>
          <p className="text-slate-500 dark:text-slate-400">Todas as vendas registradas no sistema</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            showFilters || hasFilters
              ? "bg-violet-100 text-violet-700"
              : "bg-white dark:bg-[var(--card-bg)] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[var(--card-border)] hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <Filter className="h-4 w-4" />
          Filtros
          {hasFilters && (
            <span className="ml-1 rounded-full bg-violet-600 px-1.5 py-0.5 text-xs text-white">
              {[data, vendedor, metodo, desde, ate].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Data específica</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Vendedor</label>
              <input
                value={vendedor}
                onChange={(e) => setVendedor(e.target.value)}
                placeholder="Nome do vendedor..."
                className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Pagamento</label>
              <select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200"
              >
                <option value="">Todos</option>
                <option value="pix">PIX</option>
                <option value="debito">Cartão de débito</option>
                <option value="credito">Cartão de crédito</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Desde</label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Até</label>
              <input
                type="date"
                value={ate}
                onChange={(e) => setAte(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleFilter}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              Aplicar
            </button>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-lg border px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
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
          <SkeletonTable rows={5} cols={6} />
        ) : vendas.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">Nenhuma venda encontrada</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-violet-50 dark:bg-violet-900/20 text-left text-violet-800">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Vendedor</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Pagamento</th>
                  <th className="px-4 py-3 hidden md:table-cell">Desconto</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3 w-10"></th>
                  {isAdmin && <th className="px-4 py-3 w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {vendas.map((v) => (
                  <Fragment key={v.id}>
                    <tr
                      className="border-t border-slate-50 cursor-pointer hover:bg-slate-50/50"
                      onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                    >
                      <td className="px-4 py-3 font-bold">#{v.numero}</td>
                      <td className="px-4 py-3">{v.usuario_nome}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(v.total)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                        {metodoLabels[v.metodo_pagamento] || v.metodo_pagamento}
                        {v.metodo_pagamento === "credito" && v.parcelas > 1
                          ? ` ${v.parcelas}x`
                          : ""}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                        {v.desconto > 0 ? formatCurrency(v.desconto) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(v.created_at)}</td>
                      <td className="px-4 py-3 text-violet-600">
                        {expanded === v.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmEstorno(v);
                            }}
                            disabled={estornando === v.id}
                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                            title="Estornar venda"
                          >
                            <Undo2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                    {expanded === v.id && v.itens && (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7} className="bg-violet-50/50 dark:bg-violet-900/20 px-8 py-3">
                          <ul className="space-y-1">
                            {v.itens.map((item) => (
                              <li key={item.id} className="flex justify-between text-sm">
                                <span>
                                  {item.produto_nome} &times; {item.quantidade}
                                </span>
                                <span className="font-medium">
                                  {formatCurrency(item.subtotal)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmEstorno}
        title="Estornar venda?"
        message={`A venda #${confirmEstorno?.numero} será cancelada e o estoque será devolvido. Esta ação não pode ser desfeita.`}
        confirmLabel="Sim, estornar"
        danger
        onConfirm={handleEstorno}
        onCancel={() => setConfirmEstorno(null)}
      />
    </div>
  );
}
