"use client";

import { useEffect, useState, useCallback, startTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  Clock,
  DollarSign,
  Minus,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  X,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { SkeletonCard } from "@/components/Skeleton";
import type { DashboardData } from "@/lib/types";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  href,
  onClick,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; label: string };
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="group rounded-2xl border border-white/60 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-violet-200 dark:hover:border-violet-700 cursor-pointer">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
            {value}
          </p>
          {subtitle && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
          {trend && (
            <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${
              trend.value > 0 ? "text-emerald-600" : trend.value < 0 ? "text-red-500" : "text-slate-400"
            }`}>
              {trend.value > 0 ? <ArrowUp className="h-3 w-3" /> : trend.value < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              <span>{Math.abs(trend.value).toFixed(1)}% vs período anterior</span>
            </div>
          )}
        </div>
        <div className={`rounded-xl p-3 transition-transform group-hover:scale-110 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  if (onClick) {
    return <button onClick={onClick} className="text-left w-full">{content}</button>;
  }
  return content;
}

function NotificationBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-5 py-3 shadow-sm">
      <Bell className="h-5 w-5 shrink-0 text-amber-500" />
      <p className="flex-1 text-sm text-amber-800 dark:text-amber-300">
        <strong>Atenção:</strong> existem produtos com estoque abaixo do mínimo. Verifique a seção de alertas.
      </p>
      <button onClick={onDismiss} className="shrink-0 rounded-lg p-1 text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-800/30">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function HeatmapChart({ data }: { data: DashboardData["vendasPorHora"] }) {
  if (!data.length) return <p className="text-sm text-slate-500">Nenhum dado disponível</p>;

  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const hours = Array.from({ length: 24 }, (_, i) => {
    const found = data.find((d) => d.hora === i);
    return { hora: i, total: found?.total || 0, quantidade: found?.quantidade || 0 };
  });

  return (
    <div className="scroll-snap-x flex items-end gap-1 overflow-x-auto pb-2" style={{ height: 120 }}>
      {hours.map(({ hora, total, quantidade }) => {
        const pct = maxVal > 0 ? (total / maxVal) * 100 : 0;
        const intensity = pct > 66 ? "bg-violet-600" : pct > 33 ? "bg-violet-400" : pct > 0 ? "bg-violet-200 dark:bg-violet-800" : "bg-slate-100 dark:bg-slate-700";
        return (
          <div key={hora} className="group relative flex flex-col items-center gap-1 shrink-0 w-8 sm:w-auto sm:flex-1">
            <div className="absolute -top-8 hidden group-hover:block z-10 rounded-lg bg-slate-800 dark:bg-slate-600 px-2 py-1 text-xs text-white whitespace-nowrap">
              {String(hora).padStart(2, "0")}h — {quantidade} venda(s) — {formatCurrency(total)}
            </div>
            <div className={`w-full rounded-t transition-all duration-200 hover:opacity-80 ${intensity}`} style={{ height: `${Math.max(pct, 2)}%` }} />
            <span className="text-[9px] text-slate-400 dark:text-slate-500">{hora}</span>
          </div>
        );
      })}
    </div>
  );
}

function AutoRefreshIndicator({ isRefreshing, lastUpdated, onRefresh }: {
  isRefreshing: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-all"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">Atualizar</span>
      </button>
      {lastUpdated && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          <span>Atualizado {formatTimeAgo(lastUpdated)}</span>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 10) return "agora";
  if (diff < 60) return `há ${diff}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [periodo, setPeriodo] = useState("7");
  const [retryCount, setRetryCount] = useState(0);
  const [showNotification, setShowNotification] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setIsRefreshing(true);

    try {
      const r = await fetch("/api/dashboard?periodo=" + periodo);
      const json = await r.json();
      setData(json);
      setLastUpdated(new Date());
      setShowNotification(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [periodo]);

  useEffect(() => {
    startTransition(() => { loadData(); });
  }, [periodo, retryCount, loadData]);

  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  function calcTrend(atual: number, anterior: number) {
    if (!anterior || !Number.isFinite(anterior)) return atual > 0 ? 100 : 0;
    const result = ((atual - anterior) / Math.abs(anterior)) * 100;
    return Number.isFinite(result) ? result : 0;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-violet-900 dark:text-violet-300">Dashboard</h1>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-red-400" />
          <p className="text-slate-600 dark:text-slate-400">Erro ao carregar dashboard</p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const trendVendas = calcTrend(data.vendasPeriodo.total, data.periodoAnterior.total);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-violet-900 dark:text-violet-300">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">Ateliê Angels Kids — Loja Praia Grande</p>
        </div>
        <div className="flex items-center gap-3">
          <AutoRefreshIndicator
            isRefreshing={isRefreshing}
            lastUpdated={lastUpdated}
            onRefresh={() => loadData(false)}
          />
          <Link
            href="/vendas"
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            Abrir PDV
          </Link>
        </div>
      </div>

      {showNotification && data.produtosEstoqueBaixo.length > 0 && (
        <NotificationBanner onDismiss={() => setShowNotification(false)} />
      )}

      {/* Cards de estatísticas clicáveis */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Vendas hoje"
          value={formatCurrency(data.vendasHoje.total)}
          subtitle={`${data.vendasHoje.quantidade} venda(s)`}
          icon={DollarSign}
          color="bg-emerald-100 text-emerald-600"
          href="/vendas/historico"
        />
        <StatCard
          title="Vendas no período"
          value={formatCurrency(data.vendasPeriodo.total)}
          subtitle={`${data.vendasPeriodo.quantidade} venda(s)`}
          icon={TrendingUp}
          color="bg-blue-100 text-blue-600"
          trend={{ value: trendVendas, label: "vs anterior" }}
          href="/vendas/historico"
        />
        <StatCard
          title="Produtos em estoque"
          value={String(data.produtosEstoque)}
          subtitle="com quantidade > 0"
          icon={Package}
          color="bg-violet-100 text-violet-600"
          href="/produtos"
        />
        <StatCard
          title="Alertas de estoque"
          value={String(data.produtosEstoqueBaixo.length)}
          subtitle="abaixo do mínimo"
          icon={AlertTriangle}
          color="bg-amber-100 text-amber-600"
          href="/produtos"
        />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/60 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Ticket médio</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(data.kpis.ticketMedio)}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">por venda</p>
        </div>
        <div className="rounded-2xl border border-white/60 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-blue-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Itens por venda</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{data.kpis.itensPorVenda.toFixed(1)}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">média no período</p>
        </div>
        <div className="rounded-2xl border border-white/60 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-red-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Taxa de devolução</p>
          </div>
          <p className={`mt-2 text-2xl font-bold ${data.kpis.taxaDevolucao > 5 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"}`}>
            {data.kpis.taxaDevolucao.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">estornos / total</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/60 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-500 dark:text-slate-400">Período:</label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="rounded-lg border border-card-border dark:border-[var(--card-border)] bg-input-bg dark:bg-[var(--input-bg)] px-3 py-1.5 text-sm text-foreground dark:text-slate-200"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="15">Últimos 15 dias</option>
            <option value="30">Últimos 30 dias</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-600 text-violet-600 focus:ring-violet-500"
          />
          Auto-refresh (30s)
        </label>
      </div>

      {/* Gráfico de vendas por hora */}
      <div className="rounded-2xl border border-white/60 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-violet-500" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">Vendas por hora</h2>
        </div>
        <HeatmapChart data={data.vendasPorHora} />
      </div>

      {/* Estoque baixo e Mais vendidos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/60 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-200">Estoque baixo</h2>
            </div>
            {data.produtosEstoqueBaixo.length > 0 && (
              <Link href="/produtos" className="rounded-lg px-2 py-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline">
                Ver todos →
              </Link>
            )}
          </div>
          {data.produtosEstoqueBaixo.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum alerta no momento</p>
          ) : (
            <ul className="space-y-2">
              {data.produtosEstoqueBaixo.slice(0, 5).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-300">{p.nome}</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">
                    {p.estoque} / min. {p.estoque_minimo}
                  </span>
                </li>
              ))}
              {data.produtosEstoqueBaixo.length > 5 && (
                <li className="text-center text-xs text-slate-400 dark:text-slate-500">
                  +{data.produtosEstoqueBaixo.length - 5} mais
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-white/60 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-violet-500" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-200">Mais vendidos</h2>
            </div>
            {data.topProdutos.length > 0 && (
              <Link href="/relatorios" className="rounded-lg px-2 py-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline">
                Ver relatório →
              </Link>
            )}
          </div>
          {data.topProdutos.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma venda registrada ainda</p>
          ) : (
            <ul className="space-y-2">
              {data.topProdutos.slice(0, 5).map((p, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-violet-50 dark:bg-violet-900/20 px-3 py-2 text-sm hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-200 dark:bg-violet-800 text-xs font-bold text-violet-700 dark:text-violet-300">
                      {i + 1}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{p.produto_nome}</span>
                  </div>
                  <span className="font-bold text-violet-700 dark:text-violet-400">{p.total_vendido} un.</span>
                </li>
              ))}
              {data.topProdutos.length > 5 && (
                <li className="text-center text-xs text-slate-400 dark:text-slate-500">
                  +{data.topProdutos.length - 5} mais
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Vendas recentes */}
      <div className="rounded-2xl border border-white/60 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">Vendas recentes</h2>
          {data.vendasRecentes.length > 0 && (
            <Link href="/vendas/historico" className="rounded-lg px-2 py-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline">
              Ver histórico →
            </Link>
          )}
        </div>
        {data.vendasRecentes.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma venda ainda</p>
        ) : (
          <>
            {/* Cards no mobile */}
            <div className="sm:hidden space-y-2">
              {data.vendasRecentes.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
                  <div>
                    <span className="font-medium text-foreground dark:text-slate-200">#{v.numero}</span>
                    <span className="ml-2 text-sm text-foreground dark:text-slate-200">{v.usuario_nome}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(v.total)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(v.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabela no desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[var(--card-border)] text-left text-slate-500 dark:text-slate-400">
                    <th className="pb-2 pr-4">#</th>
                    <th className="pb-2 pr-4">Vendedor</th>
                    <th className="pb-2 pr-4">Total</th>
                    <th className="pb-2">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vendasRecentes.map((v) => (
                    <tr key={v.id} className="border-b border-slate-50 dark:border-[var(--card-border)] hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-foreground dark:text-slate-200">#{v.numero}</td>
                      <td className="py-2.5 pr-4 text-foreground dark:text-slate-200">{v.usuario_nome}</td>
                      <td className="py-2.5 pr-4 font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(v.total)}
                      </td>
                      <td className="py-2.5 text-slate-500 dark:text-slate-400">{formatDate(v.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
