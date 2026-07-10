"use client";

import { useState, useEffect } from "react";
import { X, Plus, Minus } from "lucide-react";
import { useToast } from "@/components/Toast";

const MOTIVOS_PREDEFINIDOS = [
  "Devolução de cliente",
  "Ajuste de inventário",
  "Produto danificado",
  "Perda / extravio",
  "Fornecimento / reposição",
  "Transferência entre filiais",
  "Amostra / presente",
  "Correção de erro",
];

interface StockAdjustModalProps {
  open: boolean;
  onClose: () => void;
  produto: {
    id: number;
    nome: string;
    estoque: number;
    imagem_url?: string | null;
  };
  tipo: "entrada" | "saida";
  onConfirm: (novoEstoque: number) => void;
}

export function StockAdjustModal({ open, onClose, produto, tipo, onConfirm }: StockAdjustModalProps) {
  const [quantidade, setQuantidade] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [customMotivo, setCustomMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

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

  if (!open) return null;

  const motivoFinal = customMotivo.trim() || motivo;
  const estoqueNovo = tipo === "entrada" ? produto.estoque + quantidade : produto.estoque - quantidade;
  const isValid = quantidade > 0 && motivoFinal.length >= 3 && estoqueNovo >= 0;

  async function handleConfirm() {
    if (!isValid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/produtos/${produto.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ajuste_estoque: true,
          ajuste_tipo: tipo,
          ajuste_quantidade: quantidade,
          ajuste_motivo: motivoFinal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao ajustar estoque");
      showToast("success", `Estoque ${tipo === "entrada" ? "aumentado" : "reduzido"} com sucesso`);
      onConfirm(estoqueNovo);
      onClose();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Erro ao ajustar estoque");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[var(--card-bg)] shadow-2xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[var(--card-border)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tipo === "entrada" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
              {tipo === "entrada" ? (
                <Plus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Minus className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">
                {tipo === "entrada" ? "Adicionar" : "Remover"} estoque
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{produto.nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.98] transition-transform">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Estoque atual */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">Estoque atual</span>
            <span className="font-bold text-lg text-slate-800 dark:text-slate-200">{produto.estoque}</span>
          </div>

          {/* Quantidade */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Quantidade</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-all"
              >
                <Minus className="h-5 w-5" />
              </button>
              <input
                type="number"
                min={1}
                value={quantidade}
                onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--input-bg)] px-4 py-2.5 text-center text-lg font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-800"
              />
              <button
                onClick={() => setQuantidade(quantidade + 1)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-all"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Preview do novo estoque */}
          <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${estoqueNovo < 0 ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" : "bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800"}`}>
            <span className="text-sm text-slate-600 dark:text-slate-400">Novo estoque</span>
            <span className={`font-bold text-lg ${estoqueNovo < 0 ? "text-red-600 dark:text-red-400" : "text-violet-700 dark:text-violet-300"}`}>
              {estoqueNovo}
            </span>
          </div>
          {estoqueNovo < 0 && (
            <p className="text-xs text-red-500 dark:text-red-400">Estoque não pode ficar negativo</p>
          )}

          {/* Motivo */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Motivo *</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--input-bg)] px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-800"
            >
              <option value="">Selecione um motivo...</option>
              {MOTIVOS_PREDEFINIDOS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
              <option value="__custom">Outro motivo...</option>
            </select>
          </div>

          {/* Motivo customizado */}
          {motivo === "__custom" && (
            <div>
              <input
                type="text"
                value={customMotivo}
                onChange={(e) => setCustomMotivo(e.target.value)}
                placeholder="Digite o motivo..."
                maxLength={200}
                className="w-full rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--input-bg)] px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-800"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-slate-200 dark:border-[var(--card-border)] px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 dark:border-[var(--card-border)] px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid || loading}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
              tipo === "entrada"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {loading ? "Ajustando..." : tipo === "entrada" ? "Adicionar" : "Remover"}
          </button>
        </div>
      </div>
    </div>
  );
}
