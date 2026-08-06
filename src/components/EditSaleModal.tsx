"use client";

import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/Toast";
import type { Venda } from "@/lib/types";

interface EditSaleModalProps {
  open: boolean;
  venda: Venda | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditSaleModal({ open, venda, onClose, onSaved }: EditSaleModalProps) {
  const { showToast } = useToast();
  const [metodo, setMetodo] = useState("dinheiro");
  const [parcelas, setParcelas] = useState(1);
  const [desconto, setDesconto] = useState("0");
  const [precos, setPrecos] = useState<Record<number, string>>({});
  const [quantidades, setQuantidades] = useState<Record<number, string>>({});
  const [justificativa, setJustificativa] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !venda) return;
    setMetodo(venda.metodo_pagamento || "dinheiro");
    setParcelas(venda.parcelas || 1);
    setDesconto(String(venda.desconto ?? 0));
    setJustificativa("");
    const nextPrecos: Record<number, string> = {};
    const nextQtds: Record<number, string> = {};
    for (const item of venda.itens || []) {
      nextPrecos[item.id] = String(item.preco_unitario);
      nextQtds[item.id] = String(item.quantidade);
    }
    setPrecos(nextPrecos);
    setQuantidades(nextQtds);
  }, [open, venda]);

  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleEsc, true);
    return () => window.removeEventListener("keydown", handleEsc, true);
  }, [open, onClose]);

  if (!open || !venda) return null;

  const itens = venda.itens || [];
  const subtotal = itens.reduce((sum, item) => {
    const preco = parseFloat(precos[item.id] ?? String(item.preco_unitario)) || 0;
    const qtd = parseInt(quantidades[item.id] ?? String(item.quantidade), 10) || 0;
    return sum + preco * qtd;
  }, 0);
  const descontoNum = Math.max(0, parseFloat(desconto) || 0);
  const total = Math.max(0, subtotal - descontoNum);
  const justificativaOk = justificativa.trim().length >= 3;
  const descontoOk = descontoNum <= subtotal + 0.001;
  const quantidadesOk = itens.every((item) => {
    const qtd = parseInt(quantidades[item.id] ?? "", 10);
    return Number.isInteger(qtd) && qtd >= 1;
  });
  const isValid = justificativaOk && descontoOk && quantidadesOk && !loading;

  async function handleSave() {
    if (!isValid || !venda) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/vendas/${venda.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metodo_pagamento: metodo,
          parcelas: metodo === "credito" ? parcelas : 1,
          desconto: descontoNum,
          justificativa: justificativa.trim(),
          itens: itens.map((item) => ({
            id: item.id,
            preco_unitario: parseFloat(precos[item.id] ?? String(item.preco_unitario)) || 0,
            quantidade: parseInt(quantidades[item.id] ?? String(item.quantidade), 10),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao editar venda");
      showToast("success", data.message || "Venda atualizada");
      onSaved();
      onClose();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao editar venda");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-sale-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-[var(--card-bg)]">
        <div className="flex items-start gap-3 border-b border-slate-100 p-5 dark:border-[var(--card-border)]">
          <div className="rounded-xl bg-violet-100 p-2 dark:bg-violet-900/30">
            <Pencil className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1">
            <h3 id="edit-sale-title" className="font-semibold text-slate-800 dark:text-slate-200">
              Corrigir venda #{venda.numero}
            </h3>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Admin: altere pagamento, quantidade, preço ou desconto
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Forma de pagamento *
              </label>
              <select
                value={metodo}
                onChange={(e) => {
                  setMetodo(e.target.value);
                  if (e.target.value !== "credito") setParcelas(1);
                }}
                className="w-full rounded-xl border border-violet-200 bg-violet-50/50 px-3 py-2.5 text-sm font-medium outline-none focus:border-violet-400 dark:border-violet-800 dark:bg-violet-950/20 dark:text-slate-200"
              >
                <option value="pix">PIX</option>
                <option value="debito">Cartão de débito</option>
                <option value="credito">Cartão de crédito</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
            </div>
            {metodo === "credito" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Parcelas
                </label>
                <select
                  value={parcelas}
                  onChange={(e) => setParcelas(parseInt(e.target.value, 10))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}x
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className={metodo === "credito" ? "" : "sm:col-span-2"}>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Desconto (R$)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200"
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Itens (quantidade e preço)
            </p>
            {itens.map((item) => {
              const qtd = parseInt(quantidades[item.id] ?? "0", 10) || 0;
              const preco = parseFloat(precos[item.id] ?? "0") || 0;
              return (
                <div
                  key={item.id}
                  className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50"
                >
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {item.produto_nome}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-400">Quantidade</label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={quantidades[item.id] ?? ""}
                        onChange={(e) =>
                          setQuantidades((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-violet-400 dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-400">Preço unit. (R$)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={precos[item.id] ?? ""}
                        onChange={(e) =>
                          setPrecos((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-sm outline-none focus:border-violet-400 dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200"
                      />
                    </div>
                  </div>
                  <p className="mt-1.5 text-right text-xs text-slate-500">
                    Subtotal: {formatCurrency(preco * qtd)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm dark:bg-emerald-950/30">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            {descontoNum > 0 && (
              <div className="mt-1 flex justify-between text-amber-700 dark:text-amber-400">
                <span>Desconto</span>
                <span className="tabular-nums">-{formatCurrency(descontoNum)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-emerald-100 pt-2 font-bold text-emerald-700 dark:border-emerald-900 dark:text-emerald-400">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Justificativa da correção *
            </label>
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={3}
              placeholder="Ex: digitou quantidade errada no PDV"
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200"
            />
            {!justificativaOk && justificativa.length > 0 && (
              <p className="mt-1 text-xs text-amber-600">Mínimo de 3 caracteres</p>
            )}
            {!quantidadesOk && (
              <p className="mt-1 text-xs text-red-600">Quantidade mínima por item: 1</p>
            )}
            {!descontoOk && (
              <p className="mt-1 text-xs text-red-600">Desconto maior que o subtotal</p>
            )}
            <p className="mt-2 text-[11px] text-slate-400">
              Alterar quantidade ajusta o estoque automaticamente (baixa ou devolução).
            </p>
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-100 p-5 dark:border-[var(--card-border)]">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-[var(--card-border)] dark:text-slate-400 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar correção"}
          </button>
        </div>
      </div>
    </div>
  );
}
