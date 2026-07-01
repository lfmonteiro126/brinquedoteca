"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Barcode, Check, Minus, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Produto } from "@/lib/types";

interface CartItem {
  produto: Produto;
  quantidade: number;
}

export function POSView() {
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [desconto, setDesconto] = useState(0);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState("dinheiro");
  const [parcelas, setParcelas] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

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
  }

  function handleBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && barcode.trim()) {
      e.preventDefault();
      buscarPorCodigo(barcode.trim());
    }
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

    async function finalizarVenda() {
      if (cart.length === 0) return;
      setLoading(true);
      setMessage(null);

      const res = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itens: cart.map((i) => ({ produto_id: i.produto.id, quantidade: i.quantidade })),
          desconto,
          metodo_pagamento: metodoPagamento,
          parcelas: metodoPagamento === 'credito' ? parcelas : 1,
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
      text: `Venda #${data.numero} finalizada — ${formatCurrency(data.total)}`,
    });
    setCart([]);
    setDesconto(0);
    focusInput();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-violet-900">PDV — Ponto de Venda</h1>
        <p className="text-slate-500">
          Escaneie o código de barras ou digite e pressione Enter
        </p>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-white p-6">
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
          className="w-full rounded-xl border border-violet-200 bg-violet-50 px-4 py-4 text-lg font-mono outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          autoComplete="off"
        />
        <p className="mt-2 text-xs text-slate-400">
          Leitores USB funcionam como teclado — basta focar este campo e escanear
        </p>
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-800">Itens da venda</h2>
            {cart.length === 0 ? (
              <p className="py-8 text-center text-slate-400">
                Escaneie produtos para adicionar ao carrinho
              </p>
            ) : (
              <ul className="space-y-3">
                {cart.map((item) => (
                  <li
                    key={item.produto.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{item.produto.nome}</p>
                      <p className="text-sm text-slate-500">
                        {formatCurrency(item.produto.preco_venda)} · estoque: {item.produto.estoque}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQty(item.produto.id, -1)}
                        className="rounded-lg bg-white p-1.5 shadow-sm hover:bg-slate-100"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-bold">{item.quantidade}</span>
                      <button
                        onClick={() => updateQty(item.produto.id, 1)}
                        className="rounded-lg bg-white p-1.5 shadow-sm hover:bg-slate-100"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <span className="w-24 text-right font-semibold text-violet-700">
                        {formatCurrency(item.produto.preco_venda * item.quantidade)}
                      </span>
                      <button
                        onClick={() => removeItem(item.produto.id)}
                        className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
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

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-800">Resumo</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Desconto (R$)</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={desconto || ""}
              onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
              className="w-24 rounded-lg border px-2 py-1 text-right"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Pagamento</span>
              <select
                value={metodoPagamento}
                onChange={(e) => {
                  setMetodoPagamento(e.target.value);
                  if (e.target.value !== 'credito') setParcelas(1);
                }}
                className="rounded-lg border px-2 py-1"
              >
                <option value="pix">PIX</option>
                <option value="debito">Cartão de débito</option>
                <option value="credito">Cartão de crédito</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
            </div>
            {metodoPagamento === 'credito' && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Parcelas</span>
                <select
                  value={parcelas}
                  onChange={(e) => setParcelas(parseInt(e.target.value))}
                  className="rounded-lg border px-2 py-1"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}x</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="border-t pt-3 flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-emerald-600">{formatCurrency(total)}</span>
          </div>
        </div>
        <button
          onClick={finalizarVenda}
          disabled={cart.length === 0 || loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Check className="h-5 w-5" />
          {loading ? "Processando..." : "Finalizar venda"}
        </button>
      </div>
      </div>
    </div>
  );
}
