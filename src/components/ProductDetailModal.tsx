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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-[var(--card-bg)] shadow-lg animate-slide-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com imagem */}
        <div className="relative">
          {p.imagem_url && normalizeImageUrl(p.imagem_url) ? (
            <img
              src={normalizeImageUrl(p.imagem_url)}
              alt={p.nome}
              className="h-56 w-full object-cover"
            />
          ) : (
            <div className="flex h-56 w-full items-center justify-center bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/20 dark:to-violet-800/10">
              <Package className="h-16 w-16 text-violet-300 dark:text-violet-600" />
            </div>
          )}

          {/* Badge de status */}
          <div className="absolute left-3 top-3">
            {semEstoque ? (
              <span className="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-white shadow-sm">
                SEM ESTOQUE
              </span>
            ) : baixo ? (
              <span className="flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                <AlertTriangle className="h-3 w-3" />
                ESTOQUE BAIXO
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                ESTOQUE OK
              </span>
            )}
          </div>

          {/* Botao fechar */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 active:scale-[0.98] transition-transform"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Conteudo */}
        <div className="p-5">
          {/* Nome e categoria */}
          <div className="mb-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400">
              {p.categoria || "Sem categoria"}
            </p>
            <h2 className="text-xl font-bold leading-tight text-slate-800 dark:text-slate-200">
              {p.nome}
            </h2>
          </div>

          {/* Descricao */}
          {p.descricao && (
            <p className="mb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {p.descricao}
            </p>
          )}

          {/* Grid de info */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            {/* Preco de venda */}
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                Preço Venda
              </p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(p.preco_venda)}
              </p>
            </div>

            {/* Preco de custo */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Preço Custo
              </p>
              <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
                {formatCurrency(p.preco_custo)}
              </p>
            </div>

            {/* Margem */}
            {margem && (
              <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                  Margem
                </p>
                <p className="text-lg font-bold text-violet-700 dark:text-violet-300">
                  {margem}%
                </p>
              </div>
            )}

            {/* Estoque */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Estoque
              </p>
              <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
                {p.estoque} <span className="text-xs font-normal text-slate-500">/ min: {p.estoque_minimo}</span>
              </p>
            </div>
          </div>

          {/* Detalhes */}
          <div className="mb-5 space-y-2 text-sm">
            {p.codigo_barras && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Tag className="h-4 w-4 text-slate-400" />
                <span className="font-mono text-xs">{p.codigo_barras}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span className="text-xs">
                Criado em {new Date(p.created_at).toLocaleDateString("pt-BR")}
                {p.updated_at !== p.created_at && (
                  <> · Atualizado em {new Date(p.updated_at).toLocaleDateString("pt-BR")}</>
                )}
              </span>
            </div>
          </div>

          {/* Botoes de acao */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={onAddToCart}
              disabled={semEstoque}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="h-4 w-4" />
              Adicionar ao PDV
            </button>

            {isAdmin && (
              <button
                onClick={onEdit}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-transparent px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98]"
              >
                <Edit className="h-4 w-4" />
                Editar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
