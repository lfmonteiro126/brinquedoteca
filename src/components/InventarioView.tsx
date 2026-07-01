"use client";

import { useEffect, useRef, useState } from "react";
import { Barcode, CheckCircle } from "lucide-react";
import type { Produto } from "@/lib/types";

interface CountItem {
  produto: Produto;
  contado: number;
}

export function InventarioView() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [counts, setCounts] = useState<Map<number, number>>(new Map());
  const [barcode, setBarcode] = useState("");
  const [observacao, setObservacao] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/produtos")
      .then((r) => r.json())
      .then((d) => setProdutos(d.produtos || []));
    inputRef.current?.focus();
  }, []);

  function handleScan(code: string) {
    const produto = produtos.find((p) => p.codigo_barras === code);
    if (!produto) {
      setMessage({ type: "err", text: "Produto não encontrado" });
      return;
    }
    setCounts((prev) => {
      const next = new Map(prev);
      next.set(produto.id, (next.get(produto.id) || 0) + 1);
      return next;
    });
    setBarcode("");
    setMessage(null);
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

  async function finalizarInventario() {
    if (countedItems.length === 0) return;
    setLoading(true);

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
    fetch("/api/produtos")
      .then((r) => r.json())
      .then((d) => setProdutos(d.produtos || []));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-violet-900">Inventário físico</h1>
        <p className="text-slate-500">
          Conte os produtos e compare com o sistema — detecta desvios de mercadoria
        </p>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-white p-6">
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
          className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-mono outline-none focus:border-amber-400"
          placeholder="Escaneie cada unidade..."
        />
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      {countedItems.length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">
            Itens contados ({countedItems.length})
            {divergencias.length > 0 && (
              <span className="ml-2 text-sm font-normal text-amber-600">
                · {divergencias.length} divergência(s)
              </span>
            )}
          </h2>
          <ul className="space-y-2">
            {countedItems.map(({ produto, contado }) => {
              const diff = contado - produto.estoque;
              return (
                <li
                  key={produto.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                    diff !== 0 ? "bg-amber-50" : "bg-slate-50"
                  }`}
                >
                  <div>
                    <p className="font-medium">{produto.nome}</p>
                    <p className="text-xs text-slate-500">
                      Sistema: {produto.estoque} · Contado: {contado}
                      {diff !== 0 && (
                        <span className="ml-2 font-bold text-amber-700">
                          ({diff > 0 ? "+" : ""}
                          {diff})
                        </span>
                      )}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={contado}
                    onChange={(e) => setManualCount(produto.id, parseInt(e.target.value, 10) || 0)}
                    className="w-20 rounded-lg border px-2 py-1 text-center"
                  />
                </li>
              );
            })}
          </ul>

          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Observações do inventário (opcional)"
            className="mt-4 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-violet-400"
            rows={2}
          />

          <button
            onClick={finalizarInventario}
            disabled={loading}
            className="mt-4 flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            <CheckCircle className="h-5 w-5" />
            {loading ? "Finalizando..." : "Finalizar inventário e ajustar estoque"}
          </button>
        </div>
      )}
    </div>
  );
}
