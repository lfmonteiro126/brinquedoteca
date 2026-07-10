"use client";

import Link from "next/link";
import {
  Package,
  ShoppingCart,
  Search,
  AlertTriangle,
  ClipboardList,
  Users,
  BarChart3,
  Inbox,
} from "lucide-react";

interface EmptyStateProps {
  type: "products" | "cart" | "search" | "alerts" | "history" | "users" | "reports" | "generic";
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

const illustrations: Record<EmptyStateProps["type"], { icon: React.ElementType; gradient: string }> = {
  products: { icon: Package, gradient: "from-violet-100 to-violet-50 dark:from-violet-900/30 dark:to-violet-800/20" },
  cart: { icon: ShoppingCart, gradient: "from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/20" },
  search: { icon: Search, gradient: "from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20" },
  alerts: { icon: AlertTriangle, gradient: "from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/20" },
  history: { icon: ClipboardList, gradient: "from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20" },
  users: { icon: Users, gradient: "from-cyan-100 to-cyan-50 dark:from-cyan-900/30 dark:to-cyan-800/20" },
  reports: { icon: BarChart3, gradient: "from-rose-100 to-rose-50 dark:from-rose-900/30 dark:to-rose-800/20" },
  generic: { icon: Inbox, gradient: "from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700" },
};

const defaultTexts: Record<EmptyStateProps["type"], { title: string; description: string }> = {
  products: {
    title: "Nenhum brinquedo cadastrado",
    description: "Comece cadastrando seu primeiro produto para controlar o estoque.",
  },
  cart: {
    title: "Carrinho vazio",
    description: "Escaneie ou busque produtos para adicionar ao carrinho.",
  },
  search: {
    title: "Nenhum resultado encontrado",
    description: "Tente buscar com outros termos ou verifique a ortografia.",
  },
  alerts: {
    title: "Tudo em ordem!",
    description: "Nenhum alerta de estoque no momento.",
  },
  history: {
    title: "Nenhuma venda registrada",
    description: "As vendas realizadas aparecerão aqui.",
  },
  users: {
    title: "Nenhum usuário cadastrado",
    description: "Adicione vendedores e administradores ao sistema.",
  },
  reports: {
    title: "Sem dados para exibir",
    description: "Selecione um período diferente ou aguarde novas vendas.",
  },
  generic: {
    title: "Nada por aqui",
    description: "Parece que não há conteúdo para exibir.",
  },
};

export function EmptyState({
  type,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  const { icon: Icon, gradient } = illustrations[type];
  const defaults = defaultTexts[type];

  const content = (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-[var(--card-bg)] py-12 sm:py-16 px-6">
      <div className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} mb-4`}>
        <Icon className="h-10 w-10 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-slate-700 dark:text-slate-200">
        {title || defaults.title}
      </h3>
      <p className="mb-6 max-w-sm text-center text-sm text-slate-500 dark:text-slate-400">
        {description || defaults.description}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );

  return content;
}
