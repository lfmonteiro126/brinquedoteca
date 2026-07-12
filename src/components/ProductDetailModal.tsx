"use client";

import { useEffect } from "react";
import { AlertTriangle, Calendar, Edit, Package, ShoppingCart, Tag, X } from "lucide-react";
import { formatCurrency, normalizeImageUrl } from "@/lib/format";
import type { Produto } from "@/lib/types";

interface ProductDetailModalProps {
  produto: Produto;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAddToCart: () => void;
}

export function ProductDetailModal({
  produto,
  isAdmin,
  onClose,
  onEdit,
  onAddToCart,
}: ProductDetailModalProps) {
  const p = produto;
  const baixo = p.estoque <= p.estoque_minimo;
  const semEstoque = p.estoque === 0;
  const margem = p.preco_custo > 0
    ? ((p.preco_venda - p.preco_custo) / p.preco_custo * 100).toFixed(1)
    : null;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto" 
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[var(--card-bg)] shadow-2xl border border-slate-150/80 dark:border-[var(--card-border)] overflow-hidden max-h-[90dvh] flex flex-col animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner da imagem com fixed height */}
        <div className="relative h-44 sm:h-52 w-full shrink-0 overflow-hidden bg-slate-50 dark:bg-slate-900">
          {p.imagem_url && normalizeImageUrl(p.imagem_url) ? (
            <img
              src={normalizeImageUrl(p.imagem_url)}
              alt={p.nome}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/20 dark:to-violet-800/10">
              <Package className="h-14 w-14 text-violet-300 dark:text-violet-650" />
            </div>
          )}

          {/* Badge de status flutuante */}
          <div className="absolute left-4 top-4 z-10">
            {semEstoque ? (
              <span className="flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-white shadow-md">
                SEM ESTOQUE
              </span>
            ) : baixo ? (
              <span className="flex items-center gap-1 rounded-full bg-red-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-md">
                <AlertTriangle className="h-3 w-3" />
                ESTOQUE BAIXO
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-md">
                ESTOQUE OK
              </span>
            )}
          </div>

          {/* Botão de fechar premium e flutuante */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/60 backdrop-blur-md text-white hover:bg-slate-900/80 active:scale-90 transition-all shadow-sm cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Corpo scrollável do Modal */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 scrollbar-hide">
          {/* Nome e categoria */}
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400">
              {p.categoria || "Sem categoria"}
            </p>
            <h2 className="text-xl font-bold leading-tight text-slate-850 dark:text-slate-100">
              {p.nome}
            </h2>
          </div>

          {/* Descrição */}
          {p.descricao && (
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl p-3 border border-slate-105 dark:border-slate-850/50">
              {p.descricao}
            </p>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 font-display">
            {/* Preço de venda */}
            <div className="rounded-2xl bg-emerald-50/60 border border-emerald-100/50 dark:bg-emerald-950/20 dark:border-emerald-900/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                Preço Venda
              </p>
              <p className="text-base font-bold text-emerald-700 dark:text-emerald-350 tabular-nums">
                {formatCurrency(p.preco_venda)}
              </p>
            </div>

            {/* Preço de custo */}
            <div className="rounded-2xl bg-slate-50/60 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-850 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-450">
                Preço Custo
              </p>
              <p className="text-base font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                {formatCurrency(p.preco_custo)}
              </p>
            </div>

            {/* Margem */}
            {margem && (
              <div className="rounded-2xl bg-violet-50/60 border border-violet-100/50 dark:bg-violet-950/20 dark:border-violet-900/30 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                  Margem
                </p>
                <p className="text-base font-bold text-violet-700 dark:text-violet-355 tabular-nums">
                  {margem}%
                </p>
              </div>
            )}

            {/* Estoque */}
            <div className="rounded-2xl bg-slate-50/60 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-850 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-450">
                Estoque Atual
              </p>
              <p className="text-base font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                {p.estoque} <span className="text-xs font-normal text-slate-400 dark:text-slate-550">/ min: {p.estoque_minimo}</span>
              </p>
            </div>
          </div>

          {/* Datas e SKU */}
          <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-850 pt-4 text-xs text-slate-500 dark:text-slate-450">
            {p.codigo_barras && (
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-mono">{p.codigo_barras}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>
                Criado em {new Date(p.created_at).toLocaleDateString("pt-BR")}
                {p.updated_at !== p.created_at && (
                  <> · Atualizado em {new Date(p.updated_at).toLocaleDateString("pt-BR")}</>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé de Ações - Fixo para garantir clique em mobile */}
        <div className="shrink-0 border-t border-slate-100 dark:border-slate-850 bg-slate-50/45 dark:bg-slate-900/20 p-4 sm:px-6 flex items-center justify-end gap-2.5">
          {isAdmin && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 px-4 text-xs font-semibold text-slate-700 dark:border-slate-850 dark:bg-transparent dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all shadow-2xs"
            >
              <Edit className="h-3.5 w-3.5 text-slate-500" />
              Editar
            </button>
          )}

          <button
            onClick={onAddToCart}
            disabled={semEstoque}
            className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-emerald-650 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-755 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Adicionar ao PDV
          </button>
        </div>
      </div>
    </div>
  );
}
