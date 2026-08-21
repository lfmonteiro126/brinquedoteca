"use client";

import { Fragment, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  Undo2,
  Pencil,
  X,
  CreditCard,
  Wallet,
  Banknote,
  Coins,
  Percent,
  Calendar,
  Receipt,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Pagination } from "@/components/Pagination";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditSaleModal } from "@/components/EditSaleModal";
import { useToast } from "@/components/Toast";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";
import type { Venda } from "@/lib/types";

const PAGE_SIZE = 20;

function getInitials(name: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getPaymentIcon(metodo: string) {
  switch (metodo) {
    case "pix":
      return <Coins className="h-3.5 w-3.5 text-emerald-500" />;
    case "debito":
      return <CreditCard className="h-3.5 w-3.5 text-blue-500" />;
    case "credito":
      return <CreditCard className="h-3.5 w-3.5 text-indigo-500" />;
    case "dinheiro":
      return <Banknote className="h-3.5 w-3.5 text-amber-500" />;
    default:
      return <Wallet className="h-3.5 w-3.5 text-slate-400" />;
  }
}

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
  const [editVenda, setEditVenda] = useState<Venda | null>(null);
  const { showToast } = useToast();

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
        showToast("success", data.message || "Venda estornada. Estoque devolvido.");
        setReloadKey((k) => k + 1);
      } else {
        showToast("error", data.error || "Erro ao estornar venda");
      }
    } catch {
      showToast("error", "Erro de conexão ao estornar venda");
    }
    setEstornando(null);
  }

  return (
    <div className="space-y-6">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-violet-900 dark:text-violet-300">Histórico de vendas</h1>
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
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-800 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Vendedor</label>
              <input
                value={vendedor}
                onChange={(e) => setVendedor(e.target.value)}
                placeholder="Nome do vendedor..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-800 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Pagamento</label>
              <select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-800 outline-none"
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
                className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-[var(--card-border)] px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98]"
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
        ) : vendas.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] border border-slate-200 dark:border-[var(--card-border)] px-4 py-12 text-center text-slate-400 dark:text-slate-500 shadow-sm">
            Nenhuma venda encontrada
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {vendas.map((v) => {
                const isExpanded = expanded === v.id;
                const estornada = Boolean(v.estornada);
                return (
                  <div
                    key={v.id}
                    className={`group rounded-2xl border bg-white dark:bg-[var(--card-bg)] shadow-xs transition-all duration-200 ${
                      estornada
                        ? "border-rose-200 dark:border-rose-900/40 opacity-90"
                        : `border-slate-200 dark:border-[var(--card-border)] hover:shadow-md hover:border-violet-200 dark:hover:border-violet-800/80 ${
                            isExpanded ? "border-violet-300 dark:border-violet-700 ring-2 ring-violet-50 dark:ring-violet-950/20" : ""
                          }`
                    }`}
                  >
                    {/* Linha Principal do Card */}
                    <div
                      onClick={() => setExpanded(isExpanded ? null : v.id)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Avatar do Vendedor */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-950/50 text-xs font-bold text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-900/40">
                          {getInitials(v.usuario_nome || "")}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-100 font-display">
                              Venda #{v.numero}
                            </span>
                            {estornada && (
                              <span className="inline-flex items-center rounded-full bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400 border border-rose-200/70 dark:border-rose-900/40">
                                Estornada
                              </span>
                            )}
                            {v.desconto > 0 && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 dark:bg-amber-955/40 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/40">
                                <Percent className="h-2.5 w-2.5" />
                                -{formatCurrency(v.desconto)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span>Vendido por <span className="font-semibold text-slate-600 dark:text-slate-300">{v.usuario_nome}</span></span>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(v.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Informações à direita */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-4 sm:gap-6">
                        <div className="flex items-center gap-4">
                          {/* Método de Pagamento */}
                          <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-850">
                            {getPaymentIcon(v.metodo_pagamento)}
                            <span className="font-medium">
                              {metodoLabels[v.metodo_pagamento] || v.metodo_pagamento}
                              {v.metodo_pagamento === "credito" && v.parcelas > 1 ? ` (${v.parcelas}x)` : ""}
                            </span>
                          </div>

                          {/* Valor Total */}
                          <div className="text-right min-w-[70px]">
                            <p className={`text-lg font-bold font-display tabular-nums ${
                              estornada
                                ? "text-slate-400 dark:text-slate-500 line-through"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}>
                              {formatCurrency(v.total)}
                            </p>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-1.5">
                          {isAdmin && !estornada && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditVenda(v);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-900/20 active:scale-[0.96] transition-transform"
                                title="Corrigir pagamento, quantidade, preço ou desconto"
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="hidden sm:inline">Corrigir</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmEstorno(v);
                                }}
                                disabled={estornando === v.id}
                                className="rounded-xl p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 active:scale-[0.96] transition-transform"
                                title="Estornar venda"
                              >
                                <Undo2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <div className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            {isExpanded ? (
                              <ChevronDown className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
                            ) : (
                              <ChevronRight className="h-4.5 w-4.5 group-hover:translate-x-0.5 transition-transform" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Área Expandida (Detalhes/Recibo) */}
                    {isExpanded && v.itens && (
                      <div className="border-t border-dashed border-slate-200 dark:border-[var(--card-border)] bg-slate-50/50 dark:bg-slate-800/10 p-5 sm:px-6">
                        <div className="max-w-md rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 sm:p-5 shadow-xs relative overflow-hidden">
                          {/* Receipt Header */}
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                            <Receipt className="h-4 w-4 text-violet-500" />
                            <span>Itens do Recibo</span>
                          </div>
                          
                          <ul className="divide-y divide-dashed divide-slate-200 dark:divide-slate-850 space-y-2.5 pb-3">
                            {v.itens.map((item) => (
                              <li key={item.id} className="flex justify-between text-sm pt-2.5 first:pt-0">
                                <div className="pr-4">
                                  <p className="font-semibold text-slate-700 dark:text-slate-300">{item.produto_nome}</p>
                                  <p className="text-xs text-slate-400 mt-0.5">Qtd: {item.quantidade}</p>
                                </div>
                                <span className="font-semibold font-display tabular-nums text-slate-800 dark:text-slate-200">
                                  {formatCurrency(item.subtotal)}
                                </span>
                              </li>
                            ))}
                          </ul>

                          {/* Receipt Summary Footer */}
                          <div className="border-t border-double border-slate-200 dark:border-slate-800 pt-3 mt-1 flex flex-col gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            {v.desconto > 0 && (
                              <>
                                <div className="flex justify-between">
                                  <span>Desconto total</span>
                                  <span className="font-semibold text-amber-600 dark:text-amber-400 font-display tabular-nums">-{formatCurrency(v.desconto)}</span>
                                </div>
                                {v.desconto_autorizado_por && (
                                  <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500 italic mt-0.5">
                                    <span>Autorizado por</span>
                                    <span>{v.desconto_autorizado_por}</span>
                                  </div>
                                )}
                              </>
                            )}
                            <div className="flex justify-between text-sm font-bold text-slate-800 dark:text-slate-200 pt-1.5">
                              <span>Total Final</span>
                              <span className="font-display tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(v.total)}</span>
                            </div>
                            {estornada && (
                              <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50/80 px-3 py-2 text-[11px] text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
                                <p className="font-semibold">Venda estornada — estoque devolvido</p>
                                {(v.estornada_por_nome || v.estornada_em) && (
                                  <p className="mt-1 text-rose-500 dark:text-rose-400">
                                    {v.estornada_por_nome ? `Por ${v.estornada_por_nome}` : ""}
                                    {v.estornada_por_nome && v.estornada_em ? " · " : ""}
                                    {v.estornada_em ? formatDate(v.estornada_em) : ""}
                                  </p>
                                )}
                              </div>
                            )}
                            {v.correcao_justificativa && (
                              <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/80 px-3 py-2 text-[11px] text-violet-800 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-300">
                                <p className="font-semibold">Correção administrativa</p>
                                <p className="mt-0.5 italic">{v.correcao_justificativa}</p>
                                {(v.corrigido_por_nome || v.corrigido_em) && (
                                  <p className="mt-1 text-violet-500 dark:text-violet-400 not-italic">
                                    {v.corrigido_por_nome ? `Por ${v.corrigido_por_nome}` : ""}
                                    {v.corrigido_por_nome && v.corrigido_em ? " · " : ""}
                                    {v.corrigido_em ? formatDate(v.corrigido_em) : ""}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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

      <ConfirmDialog
        open={!!confirmEstorno}
        title="Estornar venda?"
        message={`A venda #${confirmEstorno?.numero} será cancelada e o estoque será devolvido. Esta ação não pode ser desfeita.`}
        confirmLabel="Sim, estornar"
        danger
        onConfirm={handleEstorno}
        onCancel={() => setConfirmEstorno(null)}
      />

      <EditSaleModal
        open={!!editVenda}
        venda={editVenda}
        onClose={() => setEditVenda(null)}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
