"use client";

import { useEffect, useRef, useState } from "react";
import {
  Barcode,
  CheckCircle,
  Download,
  Eye,
  Filter,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useDebounce } from "@/hooks/useDebounce";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";
import type { Produto } from "@/lib/types";

interface CountItem {
  produto: Produto;
  contado: number;
}

interface SessaoHistorico {
  id: number;
  usuario_nome: string;
  observacao: string | null;
  total_itens: number;
  divergencias: number;
  created_at: string;
  finalized_at: string;
}

interface SessaoDetalhe {
  id: number;
  usuario_nome: string;
  observacao: string | null;
  created_at: string;
  finalized_at: string;
  itens: {
    produto_nome: string;
    codigo_barras: string | null;
    categoria: string | null;
    estoque_sistema: number;
    estoque_contado: number;
    diferenca: number;
  }[];
}

type FilterMode = "all" | "counted" | "not_counted" | "divergences";

export function InventarioView({ breadcrumbs }: { breadcrumbs?: BreadcrumbItem[] }) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtosLoaded, setProdutosLoaded] = useState(false);
  const [counts, setCounts] = useState<Map<number, number>>(new Map());
  const [barcode, setBarcode] = useState("");
  const [observacao, setObservacao] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [showNotCounted, setShowNotCounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [historico, setHistorico] = useState<SessaoHistorico[]>([]);
  const [showHistorico, setShowHistorico] = useState(false);
  const [detalheSessao, setDetalheSessao] = useState<SessaoDetalhe | null>(null);

  const debouncedFilter = useDebounce((v: string) => setSearchFilter(v), 300);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/produtos?pageSize=999")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setProdutos(d.produtos || []);
          setProdutosLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProdutosLoaded(true);
        }
      });
    inputRef.current?.focus();
    return () => { cancelled = true; };
  }, []);

  function handleScan(code: string) {
    const produto = produtos.find((p) => p.codigo_barras === code);
    if (!produto) {
      setMessage({ type: "err", text: "Produto não encontrado" });
      return;
    }
    incrementCount(produto.id);
    setBarcode("");
    setMessage(null);
  }

  function incrementCount(produtoId: number) {
    setCounts((prev) => {
      const next = new Map(prev);
      next.set(produtoId, (next.get(produtoId) || 0) + 1);
      return next;
    });
  }

  function decrementCount(produtoId: number) {
    setCounts((prev) => {
      const next = new Map(prev);
      const current = next.get(produtoId) || 0;
      if (current <= 1) next.delete(produtoId);
      else next.set(produtoId, current - 1);
      return next;
    });
  }

  function setManualCount(produtoId: number, value: number) {
    setCounts((prev) => {
      const next = new Map(prev);
      if (value <= 0) next.delete(produtoId);
      else next.set(produtoId, value);
      return next;
    });
  }

  const countedItems: CountItem[] = Array.from(counts.entries()).map(([id, contado]) => ({
    produto: produtos.find((p) => p.id === id)!,
    contado,
  }));

  const divergencias = countedItems.filter((i) => i.contado !== i.produto.estoque);

  const filteredProdutos = searchFilter
    ? produtos.filter(
        (p) =>
          p.nome.toLowerCase().includes(searchFilter.toLowerCase()) ||
          (p.codigo_barras && p.codigo_barras.includes(searchFilter))
      )
    : [];

  const notCounted = produtos.filter((p) => !counts.has(p.id));

  const displayedItems = countedItems.filter((item) => {
    if (filterMode === "counted") return true;
    if (filterMode === "not_counted") return false;
    if (filterMode === "divergences") return item.contado !== item.produto.estoque;
    return true;
  });

  function exportDivergenciasCSV() {
    const data = divergencias.length > 0 ? divergencias : countedItems;
    if (!data.length) return;
    const headers = ["Produto", "Código", "Estoque Sistema", "Contado", "Diferença", "Valor Diferença"];
    const rows = data.map((i) => [
      i.produto.nome,
      i.produto.codigo_barras || "—",
      String(i.produto.estoque),
      String(i.contado),
      String(i.contado - i.produto.estoque),
      formatCurrency((i.contado - i.produto.estoque) * i.produto.preco_custo),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventario_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFinalizar() {
    if (countedItems.length === 0) return;
    setConfirmOpen(true);
  }

  async function finalizarInventario() {
    setConfirmOpen(false);
    if (countedItems.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch("/api/inventario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observacao,
          itens: countedItems.map((i) => ({
            produto_id: i.produto.id,
            estoque_contado: i.contado,
          })),
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setMessage({ type: "err", text: data.error });
        return;
      }

      setMessage({
        type: "ok",
        text: `Inventário finalizado! ${data.divergencias} divergência(s) em ${data.totalItens} itens.`,
      });
      setCounts(new Map());
      setObservacao("");
      fetch("/api/produtos?pageSize=999")
        .then((r) => r.json())
        .then((d) => setProdutos(d.produtos || []))
        .catch(() => {});
    } catch {
      setLoading(false);
      setMessage({ type: "err", text: "Erro de conexão" });
    }
  }

  async function carregarHistorico() {
    try {
      const res = await fetch("/api/inventario");
      const data = await res.json();
      setHistorico(data.sessoes || []);
      setShowHistorico(true);
    } catch {
      setHistorico([]);
      setShowHistorico(true);
    }
  }

  async function verDetalhe(sessaoId: number) {
    try {
      const res = await fetch(`/api/inventario/${sessaoId}`);
      const data = await res.json();
      setDetalheSessao(data);
    } catch {
      setDetalheSessao(null);
    }
  }

  return (
    <div className="space-y-6">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-violet-900 dark:text-violet-300">Inventário físico</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Conte os produtos e compare com o sistema — detecta desvios de mercadoria
        </p>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-white dark:bg-[var(--card-bg)] p-6">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-700">
          <Barcode className="h-4 w-4" />
          Escanear para contar (+1)
        </label>
        <input
          ref={inputRef}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && barcode.trim()) {
              e.preventDefault();
              handleScan(barcode.trim());
            }
          }}
          className="w-full rounded-xl border border-amber-200 bg-amber-50 dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200 px-4 py-3 font-mono outline-none focus:border-amber-400"
          placeholder="Escaneie cada unidade..."
        />
      </div>

      {message && (
        <div
          className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${
            message.type === "ok" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-2 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          onChange={(e) => debouncedFilter(e.target.value)}
          placeholder="Buscar produto para adicionar manualmente..."
          className="w-full rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--input-bg)] dark:text-slate-200 py-3 pl-11 pr-4 outline-none focus:border-violet-400"
        />
        {filteredProdutos.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] shadow-lg">
            {filteredProdutos.slice(0, 10).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    incrementCount(p.id);
                    setSearchFilter("");
                  }}
                  className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-violet-50 dark:hover:bg-violet-900/20"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">{p.nome}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">Estoque: {p.estoque}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {produtosLoaded && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowNotCounted(!showNotCounted)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
              showNotCounted ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700" : "border-slate-200 dark:border-[var(--card-border)] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            <Filter className="h-4 w-4" />
            Não contados ({notCounted.length})
          </button>
          {countedItems.length > 0 && (
            <>
              <button
                onClick={() => setFilterMode(filterMode === "all" ? "divergences" : "all")}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  filterMode === "divergences" ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700" : "border-slate-200 dark:border-[var(--card-border)] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                Divergências ({divergencias.length})
              </button>
              <button
                onClick={exportDivergenciasCSV}
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[var(--card-border)] px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Download className="h-4 w-4" />
                Exportar
              </button>
            </>
          )}
          <button
            onClick={carregarHistorico}
            className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[var(--card-border)] px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Eye className="h-4 w-4" />
            Histórico
          </button>
        </div>
      )}

      {showNotCounted && notCounted.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-amber-700">Produtos não contados ({notCounted.length})</h2>
            <button onClick={() => setShowNotCounted(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="max-h-60 space-y-1 overflow-y-auto">
            {notCounted.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-300">{p.nome}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Estoque: {p.estoque}</span>
                  <button
                    onClick={() => incrementCount(p.id)}
                    className="rounded-lg bg-white dark:bg-[var(--card-bg)] px-2 py-1 text-xs font-medium text-violet-700 dark:text-violet-300 shadow-sm hover:bg-violet-50 dark:hover:bg-violet-900/20"
                  >
                    + Contar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {countedItems.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">
            Itens contados ({displayedItems.length})
            {divergencias.length > 0 && (
              <span className="ml-2 text-sm font-normal text-amber-600 dark:text-amber-400">
                · {divergencias.length} divergência(s)
              </span>
            )}
          </h2>
          <ul className="space-y-2">
            {displayedItems.map(({ produto, contado }) => {
              const diff = contado - produto.estoque;
              return (
                <li
                  key={produto.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                    diff !== 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-slate-50 dark:bg-slate-700"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{produto.nome}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sistema: {produto.estoque} · Contado: {contado}
                      {diff !== 0 && (
                        <span className="ml-2 font-bold text-amber-700 dark:text-amber-400">
                          ({diff > 0 ? "+" : ""}
                          {diff})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => decrementCount(produto.id)}
                      className="rounded-lg bg-white dark:bg-[var(--card-bg)] p-1 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={contado}
                      onChange={(e) =>
                        setManualCount(produto.id, parseInt(e.target.value, 10) || 0)
                      }
                      className="w-16 rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--input-bg)] dark:text-slate-200 px-2 py-1 text-center text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-800"
                    />
                    <button
                      onClick={() => incrementCount(produto.id)}
                      className="rounded-lg bg-white dark:bg-[var(--card-bg)] p-1 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Observações do inventário (opcional)"
            className="mt-4 w-full rounded-xl border dark:border-[var(--card-border)] bg-white dark:bg-[var(--input-bg)] dark:text-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400"
            rows={2}
          />

          <button
            onClick={handleFinalizar}
            disabled={loading}
            className="mt-4 flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            <CheckCircle className="h-5 w-5" />
            {loading ? "Finalizando..." : "Finalizar inventário e ajustar estoque"}
          </button>
        </div>
      )}

      {showHistorico && (
        <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Histórico de inventários</h2>
            <button onClick={() => { setShowHistorico(false); setDetalheSessao(null); }} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
              <X className="h-4 w-4" />
            </button>
          </div>
          {detalheSessao ? (
            <div>
              <button
                onClick={() => setDetalheSessao(null)}
                className="mb-3 text-sm text-violet-600 dark:text-violet-400 hover:underline"
              >
                ← Voltar para lista
              </button>
              <div className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                <p>{detalheSessao.usuario_nome} · {new Date(detalheSessao.finalized_at).toLocaleString("pt-BR")}</p>
                {detalheSessao.observacao && <p className="italic">&ldquo;{detalheSessao.observacao}&rdquo;</p>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700 text-left text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Produto</th>
                      <th className="px-3 py-2">Categoria</th>
                      <th className="px-3 py-2 text-center">Sistema</th>
                      <th className="px-3 py-2 text-center">Contado</th>
                      <th className="px-3 py-2 text-center">Diferença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalheSessao.itens.map((item, i) => (
                      <tr key={i} className={`border-t border-slate-50 dark:border-[var(--card-border)] ${item.diferenca !== 0 ? "bg-amber-50 dark:bg-amber-900/20" : ""}`}>
                        <td className="px-3 py-2 font-medium">{item.produto_nome}</td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{item.categoria || "—"}</td>
                        <td className="px-3 py-2 text-center">{item.estoque_sistema}</td>
                        <td className="px-3 py-2 text-center">{item.estoque_contado}</td>
                        <td className={`px-3 py-2 text-center font-bold ${item.diferenca > 0 ? "text-emerald-600 dark:text-emerald-400" : item.diferenca < 0 ? "text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"}`}>
                          {item.diferenca > 0 ? "+" : ""}{item.diferenca}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : historico.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum inventário finalizado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {historico.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-700 px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      #{s.id} — {s.usuario_nome}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(s.finalized_at).toLocaleString("pt-BR")} · {s.total_itens} itens
                      {s.observacao && <span className="italic"> · &ldquo;{s.observacao}&rdquo;</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.divergencias > 0 && (
                      <span className="rounded-lg bg-amber-100 dark:bg-amber-900/20 px-2 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                        {s.divergencias} divergência(s)
                      </span>
                    )}
                    <button
                      onClick={() => verDetalhe(s.id)}
                      className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      Ver
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Finalizar inventário?"
        message={`Serão ajustados ${countedItems.length} itens. ${
          divergencias.length > 0
            ? `${divergencias.length} divergência(s) será(ão) corrigida(s).`
            : ""
        } Esta ação irá alterar os estoques.`}
        confirmLabel="Sim, finalizar"
        danger
        onConfirm={finalizarInventario}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
