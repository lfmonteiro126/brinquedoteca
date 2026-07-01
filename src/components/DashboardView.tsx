"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  DollarSign,
  Package,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { DashboardData } from "@/lib/types";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("7");

  useEffect(() => {
    fetch("/api/dashboard?periodo=" + periodo)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [periodo]);

  if (loading) {
    return <p className="text-slate-500">Carregando dashboard...</p>;
  }

  if (!data) {
    return <p className="text-red-500">Erro ao carregar dashboard</p>;
  }

  return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-violet-900">Dashboard</h1>
            <p className="text-slate-500">Visão geral da sua loja de brinquedos</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-500">Período:</label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="15">Últimos 15 dias</option>
              <option value="30">Últimos 30 dias</option>
            </select>
          </div>
          <Link
            href="/vendas"
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Abrir PDV
          </Link>
        </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Vendas hoje"
          value={formatCurrency(data.vendasHoje.total)}
          subtitle={`${data.vendasHoje.quantidade} venda(s)`}
          icon={DollarSign}
          color="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          title="Vendas no período"
          value={formatCurrency(data.vendasPeriodo.total)}
          subtitle={`${data.vendasPeriodo.quantidade} venda(s)`}
          icon={TrendingUp}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Produtos em estoque"
          value={String(data.produtosEstoque)}
          subtitle="com quantidade > 0"
          icon={Package}
          color="bg-violet-100 text-violet-600"
        />
        <StatCard
          title="Alertas de estoque"
          value={String(data.produtosEstoqueBaixo.length)}
          subtitle="abaixo do mínimo"
          icon={AlertTriangle}
          color="bg-amber-100 text-amber-600"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/60 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold text-slate-800">Estoque baixo</h2>
          </div>
          {data.produtosEstoqueBaixo.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum alerta no momento 🎉</p>
          ) : (
            <ul className="space-y-2">
              {data.produtosEstoqueBaixo.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-700">{p.nome}</span>
                  <span className="font-bold text-amber-700">
                    {p.estoque} / mín. {p.estoque_minimo}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-white/60 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-violet-500" />
            <h2 className="font-semibold text-slate-800">Mais vendidos (30 dias)</h2>
          </div>
          {data.topProdutos.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma venda registrada ainda</p>
          ) : (
            <ul className="space-y-2">
              {data.topProdutos.map((p, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-violet-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-700">{p.produto_nome}</span>
                  <span className="font-bold text-violet-700">{p.total_vendido} un.</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/60 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-800">Vendas recentes</h2>
        {data.vendasRecentes.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma venda ainda</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Vendedor</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {data.vendasRecentes.map((v) => (
                  <tr key={v.id} className="border-b border-slate-50">
                    <td className="py-2.5 pr-4 font-medium">#{v.numero}</td>
                    <td className="py-2.5 pr-4">{v.usuario_nome}</td>
                    <td className="py-2.5 pr-4 font-semibold text-emerald-600">
                      {formatCurrency(v.total)}
                    </td>
                    <td className="py-2.5 text-slate-500">{formatDate(v.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
