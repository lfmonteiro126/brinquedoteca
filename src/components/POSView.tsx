"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Barcode, Check, ImageOff, Minus, Plus, Printer, Search, Trash2, X } from "lucide-react";
import { formatCurrency, normalizeImageUrl } from "@/lib/format";
import { escapeHtml } from "@/lib/sanitize";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Produto } from "@/lib/types";

interface CartItem {
  produto: Produto;
  quantidade: number;
}

interface VendaFinalizada {
  numero: number;
  total: number;
  metodo_pagamento: string;
  parcelas: number;
  itens: { nome: string; quantidade: number; subtotal: number }[];
  data: string;
}

const RECENT_KEY = "pos_recent_searches";
const MAX_RECENT = 8;

function loadRecent(): Produto[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch { return []; }
}

function saveRecent(produto: Produto) {
  const recent = loadRecent().filter((p) => p.id !== produto.id);
  recent.unshift(produto);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export function POSView() {
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pos_cart");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [desconto, setDesconto] = useState(0);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState("dinheiro");
  const [parcelas, setParcelas] = useState(1);
  const [vendaFinalizada, setVendaFinalizada] = useState<VendaFinalizada | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Produto[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState<Produto[]>(() => loadRecent());
  const [showRecent, setShowRecent] = useState(false);
  const [modalProdutos, setModalProdutos] = useState<Produto[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  useEffect(() => {
    localStorage.setItem("pos_cart", JSON.stringify(cart));
  }, [cart]);

  async function buscarPorCodigo(code: string) {
    const res = await fetch(`/api/produtos/barcode/${encodeURIComponent(code)}`);
    const data = await res.json();

    if (!res.ok) {
      setMessage({ type: "err", text: data.error || "Produto não encontrado" });
      return;
    }

    adicionarAoCarrinho(data.produto);
    setBarcode("");
    setMessage(null);
  }

  function adicionarAoCarrinho(produto: Produto) {
    setCart((prev) => {
      const existing = prev.find((i) => i.produto.id === produto.id);
      if (existing) {
        if (existing.quantidade >= produto.estoque) {
          setMessage({ type: "err", text: "Estoque insuficiente" });
          return prev;
        }
        return prev.map((i) =>
          i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i
        );
      }
      if (produto.estoque < 1) {
        setMessage({ type: "err", text: "Produto sem estoque" });
        return prev;
      }
      return [...prev, { produto, quantidade: 1 }];
    });
    saveRecent(produto);
    setRecentSearches(loadRecent());
    setShowResults(false);
    setShowRecent(false);
    setSearchQuery("");
    setMessage(null);
  }

  function handleBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && barcode.trim()) {
      e.preventDefault();
      buscarPorCodigo(barcode.trim());
    }
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      setShowRecent(true);
      return;
    }

    setShowRecent(false);
    setShowResults(true);

    searchTimerRef.current = setTimeout(async () => {
      const params = new URLSearchParams();
      params.set("q", value.trim());
      params.set("pageSize", "20");
      const res = await fetch(`/api/produtos?${params}`);
      const data = await res.json();
      const results = data.produtos || [];
      setSearchResults(results);
    }, 300);
  }

  function handleSearchFocus() {
    if (searchQuery.trim().length >= 2) {
      setShowResults(true);
      setShowRecent(false);
    } else {
      setShowResults(false);
      setShowRecent(true);
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setShowResults(false);
      setShowRecent(false);
      setModalProdutos(null);
      searchRef.current?.blur();
      return;
    }

    if (e.key === "Enter" && searchQuery.trim()) {
      e.preventDefault();

      if (searchResults.length === 1) {
        adicionarAoCarrinho(searchResults[0]);
        setSearchQuery("");
        setShowResults(false);
        return;
      }

      if (searchResults.length > 1) {
        setModalProdutos(searchResults);
        return;
      }

      buscarPorCodigo(searchQuery.trim());
      setSearchQuery("");
      setShowResults(false);
    }
  }

  function selecionarDoModal(produto: Produto) {
    adicionarAoCarrinho(produto);
    setModalProdutos(null);
    setSearchQuery("");
  }

  function updateQty(produtoId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.produto.id !== produtoId) return i;
          const q = i.quantidade + delta;
          if (q < 1 || q > i.produto.estoque) return i;
          return { ...i, quantidade: q };
        })
        .filter((i) => i.quantidade > 0)
    );
  }

  function removeItem(produtoId: number) {
    setCart((prev) => prev.filter((i) => i.produto.id !== produtoId));
  }

  const subtotal = cart.reduce((s, i) => s + i.produto.preco_venda * i.quantidade, 0);
  const total = Math.max(0, subtotal - desconto);

  function handleFinalizar() {
    if (cart.length === 0) return;
    setConfirmOpen(true);
  }

  async function finalizarVenda() {
    setConfirmOpen(false);
    if (cart.length === 0) return;
    setLoading(true);
    setMessage(null);

    const itensParaEnvio = cart.map((i) => ({
      produto_id: i.produto.id,
      quantidade: i.quantidade,
    }));

    const itensSnapshot = cart.map((i) => ({
      nome: i.produto.nome,
      quantidade: i.quantidade,
      subtotal: i.produto.preco_venda * i.quantidade,
    }));

    const metodoLabel: Record<string, string> = {
      pix: "PIX",
      debito: "Cartão de débito",
      credito: `Cartão de crédito (${parcelas}x)`,
      dinheiro: "Dinheiro",
    };

    const res = await fetch("/api/vendas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itens: itensParaEnvio,
        desconto,
        metodo_pagamento: metodoPagamento,
        parcelas: metodoPagamento === "credito" ? parcelas : 1,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage({ type: "err", text: data.error });
      return;
    }

    setVendaFinalizada({
      numero: data.numero,
      total: data.total,
      metodo_pagamento: metodoLabel[metodoPagamento] || metodoPagamento,
      parcelas: metodoPagamento === "credito" ? parcelas : 1,
      itens: itensSnapshot,
      data: new Date().toLocaleString("pt-BR"),
    });

    setCart([]);
    localStorage.removeItem("pos_cart");
    setDesconto(0);
    setMetodoPagamento("dinheiro");
    setParcelas(1);
    focusInput();
  }

  function imprimirCupom() {
    if (!vendaFinalizada) return;

    const itensTexto = vendaFinalizada.itens
      .map(
        (i) =>
          `${i.nome}\n  ${i.quantidade}x ${formatCurrency(i.subtotal / i.quantidade)}  ${formatCurrency(i.subtotal)}`
      )
      .join("\n");

    const cupom = `
╔══════════════════════════════════╗
║     ATELÊ ANGELS KIDS            ║
║     Loja Praia Grande             ║
╠══════════════════════════════════╣
║  Venda #${String(vendaFinalizada.numero).padStart(4, "0")}
║  Data: ${vendaFinalizada.data}
╠══════════════════════════════════╣
${itensTexto}
╠══════════════════════════════════╣
║  TOTAL: ${formatCurrency(vendaFinalizada.total)}
║  Pagamento: ${vendaFinalizada.metodo_pagamento}
╚══════════════════════════════════╝
    `.trim();

    const printWindow = window.open("", "_blank", "width=320,height=500");
    if (printWindow) {
      printWindow.document.write(
        `<pre style="font-family:monospace;font-size:13px;margin:0;">${escapeHtml(cupom)}</pre>`
      );
      printWindow.document.close();
      printWindow.print();
    }

    setVendaFinalizada(null);
  }

  function fecharModal() {
    setVendaFinalizada(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-violet-900">PDV — Ponto de Venda</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Escaneie o código de barras ou busque pelo nome do produto
        </p>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-white dark:bg-[var(--card-bg)] p-6">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-violet-700">
          <Barcode className="h-4 w-4" />
          Leitor de código de barras
        </label>
        <input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={handleBarcodeKeyDown}
          placeholder="Aponte o leitor aqui..."
          className="w-full rounded-xl border border-violet-200 bg-violet-50 dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200 px-4 py-4 text-lg font-mono outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          autoComplete="off"
        />
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          ref={searchRef}
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          onFocus={handleSearchFocus}
          onBlur={() => setTimeout(() => { setShowResults(false); setShowRecent(false); }, 200)}
          placeholder="Buscar por nome ou código de barras..."
          className="w-full rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--input-bg)] dark:text-slate-200 py-3 pl-11 pr-4 outline-none focus:border-violet-400"
        />
        {showResults && searchResults.length > 0 && (
          <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] shadow-lg">
            {searchResults.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => adicionarAoCarrinho(p)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-violet-50 dark:hover:bg-violet-900/20"
                >
                  {p.imagem_url && normalizeImageUrl(p.imagem_url) ? (
                    <img
                      src={normalizeImageUrl(p.imagem_url)}
                      alt={p.nome}
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                      <ImageOff className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{p.nome}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {p.codigo_barras || "Sem código"} · {p.categoria || "Sem categoria"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.preco_venda)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Estoque: {p.estoque}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        {showRecent && !showResults && recentSearches.length > 0 && (
          <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Buscas recentes</span>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { localStorage.removeItem(RECENT_KEY); setRecentSearches([]); setShowRecent(false); }}
                className="text-xs text-slate-400 dark:text-slate-500 hover:text-red-500"
              >
                Limpar
              </button>
            </div>
            <ul className="max-h-64 overflow-y-auto">
              {recentSearches.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => adicionarAoCarrinho(p)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-violet-50 dark:hover:bg-violet-900/20"
                  >
                    {p.imagem_url && normalizeImageUrl(p.imagem_url) ? (
                      <img
                        src={normalizeImageUrl(p.imagem_url)}
                        alt={p.nome}
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                        <ImageOff className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-800 dark:text-slate-200">{p.nome}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{p.codigo_barras || "Sem código"}</p>
                    </div>
                    <span className="shrink-0 font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.preco_venda)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            message.type === "ok"
              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
              : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">
              Itens da venda ({cart.length})
            </h2>
            {cart.length === 0 ? (
              <p className="py-8 text-center text-slate-400 dark:text-slate-500">
                Escaneie ou busque produtos para adicionar ao carrinho
              </p>
            ) : (
              <ul className="space-y-3">
                {cart.map((item) => (
                  <li
                    key={item.produto.id}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-3"
                  >
                    {item.produto.imagem_url && normalizeImageUrl(item.produto.imagem_url) ? (
                      <img
                        src={normalizeImageUrl(item.produto.imagem_url)}
                        alt={item.produto.nome}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700">
                        <ImageOff className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/produtos/${item.produto.id}/editar`}
                        target="_blank"
                        className="font-medium text-violet-600 hover:text-violet-800 hover:underline dark:text-violet-400 dark:hover:text-violet-300 truncate block"
                      >
                        {item.produto.nome}
                      </Link>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {formatCurrency(item.produto.preco_venda)} · estoque: {item.produto.estoque}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => updateQty(item.produto.id, -1)}
                        className="rounded-lg bg-white dark:bg-[var(--card-bg)] p-1.5 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-bold">{item.quantidade}</span>
                      <button
                        onClick={() => updateQty(item.produto.id, 1)}
                        className="rounded-lg bg-white dark:bg-[var(--card-bg)] p-1.5 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <span className="w-24 text-right font-semibold text-violet-700">
                        {formatCurrency(item.produto.preco_venda * item.quantidade)}
                      </span>
                      <button
                        onClick={() => removeItem(item.produto.id)}
                        className="rounded-lg p-1.5 text-red-400 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">Resumo</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Desconto (R$)</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={desconto || ""}
                onChange={(e) => setDesconto(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 rounded-lg border dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200 px-2 py-1 text-right"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Pagamento</span>
                <select
                  value={metodoPagamento}
                  onChange={(e) => {
                    setMetodoPagamento(e.target.value);
                    if (e.target.value !== "credito") setParcelas(1);
                  }}
                  className="rounded-lg border dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200 px-2 py-1"
                >
                  <option value="pix">PIX</option>
                  <option value="debito">Cartão de débito</option>
                  <option value="credito">Cartão de crédito</option>
                  <option value="dinheiro">Dinheiro</option>
                </select>
              </div>
              {metodoPagamento === "credito" && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Parcelas</span>
                  <select
                    value={parcelas}
                    onChange={(e) => setParcelas(parseInt(e.target.value))}
                    className="rounded-lg border dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200 px-2 py-1"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}x
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="border-t dark:border-[var(--card-border)] pt-3 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(total)}</span>
            </div>
          </div>
          <button
            onClick={handleFinalizar}
            disabled={cart.length === 0 || loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="h-5 w-5" />
            {loading ? "Processando..." : "Finalizar venda"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Finalizar venda?"
        message={`Total: ${formatCurrency(total)}. Esta ação irá baixar o estoque dos itens.`}
        confirmLabel="Sim, finalizar"
        onConfirm={finalizarVenda}
        onCancel={() => setConfirmOpen(false)}
      />

      {modalProdutos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-white dark:bg-[var(--card-bg)] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Selecione o produto</h3>
              <button onClick={() => { setModalProdutos(null); setSearchQuery(""); }} className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{modalProdutos.length} resultados para &ldquo;{searchQuery}&rdquo;</p>
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {modalProdutos.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => selecionarDoModal(p)}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-100 dark:border-[var(--card-border)] px-4 py-3 text-left transition hover:border-violet-200 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                  >
                    {p.imagem_url && normalizeImageUrl(p.imagem_url) ? (
                      <img
                        src={normalizeImageUrl(p.imagem_url)}
                        alt={p.nome}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                        <ImageOff className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{p.nome}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {p.codigo_barras || "Sem código"} · {p.categoria || "Sem categoria"}
                      </p>
                    </div>
                    <div className="shrink-0 pl-4 text-right">
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.preco_venda)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Estoque: {p.estoque}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {vendaFinalizada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-[var(--card-bg)] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Venda finalizada!</h3>
              <button onClick={fecharModal} className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-6 space-y-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4 text-sm">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                Venda #{String(vendaFinalizada.numero).padStart(4, "0")}
              </p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(vendaFinalizada.total)}
              </p>
              <p className="text-emerald-600 dark:text-emerald-400">{vendaFinalizada.metodo_pagamento}</p>
            </div>
            <p className="mb-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Deseja imprimir o cupom informativo?
            </p>
            <div className="flex gap-3">
              <button
                onClick={fecharModal}
                className="flex-1 rounded-xl border border-slate-200 dark:border-[var(--card-border)] py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Não
              </button>
              <button
                onClick={imprimirCupom}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
