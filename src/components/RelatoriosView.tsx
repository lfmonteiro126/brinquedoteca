"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BarChart3,
  Download,
  DollarSign,
  FileText,
  Package,
  TrendingUp,
  Users,
  Tag,
  Receipt,
  ShoppingBag,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";
import { SkeletonTable } from "@/components/Skeleton";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Tab = "resumo" | "periodo" | "categoria" | "funcionario" | "produtos" | "margem";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "resumo", label: "Resumo", icon: DollarSign },
  { key: "periodo", label: "Por período", icon: BarChart3 },
  { key: "categoria", label: "Por categoria", icon: Package },
  { key: "funcionario", label: "Por funcionário", icon: Users },
  { key: "produtos", label: "Produtos", icon: TrendingUp },
  { key: "margem", label: "Margem", icon: DollarSign },
];

const COLORS = [
  "#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626",
  "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
];

interface CustomChartTooltipProps {
  active?: boolean;
  payload?: {
    name: string;
    value: number;
    color?: string;
    fill?: string;
  }[];
  label?: string | number;
  formatter?: (value: number, name?: string) => string;
}

// Glassmorphism tooltip for Recharts
function CustomChartTooltip({ active, payload, label, formatter }: CustomChartTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200/50 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 shadow-md">
        {label && <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">{label}</p>}
        {payload.map((item, i) => (
          <p key={i} className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display tabular-nums flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
            <span>{item.name}:</span>
            <span className="text-violet-650 dark:text-violet-400">{formatter ? formatter(item.value, item.name) : item.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function EmptyState() {
  return (
    <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-12 text-center shadow-sm">
      <Package className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-500" />
      <p className="text-slate-500 dark:text-slate-400">Nenhum dado disponível para o período selecionado</p>
    </div>
  );
}

function TableRenderer({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/60 dark:border-[var(--card-border)] text-left text-slate-500 dark:text-slate-400">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[var(--card-border)]">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                {row.map((cell, j) => {
                  const cellStr = cell !== undefined && cell !== null ? String(cell) : "";
                  const isNumber = cellStr.includes("R$") || cellStr.includes("%") || /^\d+$/.test(cellStr) || cellStr.includes("-R$");
                  const isFirst = j === 0;
                  return (
                    <td
                      key={j}
                      className={`px-5 py-3.5 ${isFirst ? "font-semibold text-slate-850 dark:text-slate-100 font-display" : "text-slate-600 dark:text-slate-350"} ${
                        isNumber ? "font-display tabular-nums" : ""
                      }`}
                    >
                      {cellStr}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExportButtons({
  data,
  filename,
  onExportCSV,
  onExportPDF,
  exportingPdf,
}: {
  data: object[];
  filename: string;
  onExportCSV: (d: object[], f: string) => void;
  onExportPDF: () => void;
  exportingPdf?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2">
      <button
        onClick={() => onExportCSV(data, filename)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[var(--card-bg)] hover:bg-slate-50 dark:hover:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 active:scale-[0.97] transition-all shadow-2xs"
      >
        <Download className="h-4 w-4 text-slate-500" /> CSV
      </button>
      <button
        onClick={onExportPDF}
        disabled={exportingPdf}
        className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[var(--card-bg)] hover:bg-slate-50 dark:hover:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 active:scale-[0.97] transition-all shadow-2xs disabled:opacity-60"
      >
        <FileText className="h-4 w-4 text-slate-500" />
        {exportingPdf ? "Gerando PDF..." : "PDF completo"}
      </button>
    </div>
  );
}

interface ResumoData {
  totalVendas: number;
  valorTotal: number;
  ticketMedio: number;
  totalItens: number;
  totalDescontos: number;
}

interface PeriodoData { periodo: string; vendas: number; valor: number; }
interface CategoriaData { categoria: string; vendas: number; valor: number; quantidade: number; }
interface FuncionarioData { funcionario: string; vendas: number; valor: number; ticket_medio: number; }
interface ProdutoData {
  produto: string; categoria: string; preco_custo: number; preco_venda: number;
  quantidade_vendida: number; receita_total: number;
}
interface MargemData extends ProdutoData { custo_total: number; lucro: number; margem: number; }

function ResumoTab({
  dados,
  onExportPDF,
  exportingPdf,
}: {
  dados: ResumoData | null;
  onExportPDF: () => void;
  exportingPdf?: boolean;
}) {
  if (!dados) return null;
  const cards = [
    { label: "Total de vendas", value: String(dados.totalVendas), icon: ShoppingBag, color: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400" },
    { label: "Valor total", value: formatCurrency(dados.valorTotal), icon: DollarSign, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" },
    { label: "Ticket médio", value: formatCurrency(dados.ticketMedio), icon: Receipt, color: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" },
    { label: "Itens vendidos", value: String(dados.totalItens), icon: Package, color: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" },
    { label: "Descontos", value: formatCurrency(dados.totalDescontos), icon: Tag, color: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onExportPDF}
          disabled={exportingPdf}
          className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[var(--card-bg)] hover:bg-slate-50 dark:hover:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 active:scale-[0.97] transition-all shadow-2xs disabled:opacity-60"
        >
          <FileText className="h-4 w-4 text-slate-500" />
          {exportingPdf ? "Gerando PDF..." : "PDF completo"}
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="group rounded-2xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-5 shadow-xs transition-all duration-200 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{c.label}</p>
                  <p className="mt-1.5 text-2xl font-bold font-display tabular-nums text-slate-900 dark:text-slate-100 group-hover:text-violet-650 dark:group-hover:text-violet-400 transition-colors">{c.value}</p>
                </div>
                <div className={`rounded-xl p-2.5 shrink-0 ${c.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PeriodoTab({
  dados,
  onExportCSV,
  onExportPDF,
  exportingPdf,
}: {
  dados: PeriodoData[];
  onExportCSV: (d: object[], f: string) => void;
  onExportPDF: () => void;
  exportingPdf?: boolean;
}) {
  if (!dados?.length) return <EmptyState />;
  return (
    <div className="space-y-4">
      <ExportButtons data={dados} filename="vendas_por_periodo" onExportCSV={onExportCSV} onExportPDF={onExportPDF} exportingPdf={exportingPdf} />
      <div className="rounded-2xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-5 shadow-xs">
        <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">Vendas por período</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={dados}>
            <defs>
              <linearGradient id="colorPeriodo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.15}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="opacity-50" />
            <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomChartTooltip formatter={formatCurrency} />} />
            <Bar dataKey="valor" fill="url(#colorPeriodo)" radius={[4, 4, 0, 0]} name="Valor" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableRenderer headers={["Período", "Vendas", "Valor"]} rows={dados.map((d) => [d.periodo, String(d.vendas), formatCurrency(d.valor)])} />
    </div>
  );
}

function CategoriaTab({
  dados,
  onExportCSV,
  onExportPDF,
  exportingPdf,
}: {
  dados: CategoriaData[];
  onExportCSV: (d: object[], f: string) => void;
  onExportPDF: () => void;
  exportingPdf?: boolean;
}) {
  if (!dados?.length) return <EmptyState />;
  return (
    <div className="space-y-4">
      <ExportButtons data={dados} filename="vendas_por_categoria" onExportCSV={onExportCSV} onExportPDF={onExportPDF} exportingPdf={exportingPdf} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-5 shadow-xs">
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">Receita por categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={dados} cx="50%" cy="50%" outerRadius={100} dataKey="valor" nameKey="categoria"
                label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}>
                {dados.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomChartTooltip formatter={formatCurrency} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-5 shadow-xs">
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">Quantidade por categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dados} layout="vertical">
              <defs>
                <linearGradient id="colorCategoriaQtd" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.15}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="opacity-50" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="categoria" type="category" width={120} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomChartTooltip />} />
              <Bar dataKey="quantidade" fill="url(#colorCategoriaQtd)" radius={[0, 4, 4, 0]} name="Qtd" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <TableRenderer headers={["Categoria", "Vendas", "Qtd", "Valor"]} rows={dados.map((d) => [d.categoria, String(d.vendas), String(d.quantidade), formatCurrency(d.valor)])} />
    </div>
  );
}

function FuncionarioTab({
  dados,
  onExportCSV,
  onExportPDF,
  exportingPdf,
}: {
  dados: FuncionarioData[];
  onExportCSV: (d: object[], f: string) => void;
  onExportPDF: () => void;
  exportingPdf?: boolean;
}) {
  if (!dados?.length) return <EmptyState />;
  return (
    <div className="space-y-4">
      <ExportButtons data={dados} filename="vendas_por_funcionario" onExportCSV={onExportCSV} onExportPDF={onExportPDF} exportingPdf={exportingPdf} />
      <div className="rounded-2xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-5 shadow-xs">
        <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">Vendas por funcionário</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dados}>
            <defs>
              <linearGradient id="colorFuncionario" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.15}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="opacity-50" />
            <XAxis dataKey="funcionario" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomChartTooltip formatter={formatCurrency} />} />
            <Bar dataKey="valor" fill="url(#colorFuncionario)" radius={[4, 4, 0, 0]} name="Valor" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableRenderer headers={["Funcionário", "Vendas", "Ticket médio", "Valor total"]} rows={dados.map((d) => [d.funcionario, String(d.vendas), formatCurrency(d.ticket_medio), formatCurrency(d.valor)])} />
    </div>
  );
}

function ProdutosTab({
  dados,
  onExportCSV,
  onExportPDF,
  exportingPdf,
}: {
  dados: ProdutoData[];
  onExportCSV: (d: object[], f: string) => void;
  onExportPDF: () => void;
  exportingPdf?: boolean;
}) {
  if (!dados?.length) return <EmptyState />;
  const top10 = dados.slice(0, 10);
  const bottom10 = [...dados].reverse().filter((d) => d.quantidade_vendida > 0).slice(0, 10);

  return (
    <div className="space-y-6">
      <ExportButtons data={dados} filename="produtos_vendidos" onExportCSV={onExportCSV} onExportPDF={onExportPDF} exportingPdf={exportingPdf} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-5 shadow-xs">
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">Mais vendidos</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={top10}>
              <defs>
                <linearGradient id="colorTopProdutos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.15}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="opacity-50" />
              <XAxis dataKey="produto" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomChartTooltip />} />
              <Bar dataKey="quantidade_vendida" fill="url(#colorTopProdutos)" radius={[4, 4, 0, 0]} name="Qtd" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {bottom10.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-5 shadow-xs">
            <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">Menos vendidos</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={bottom10}>
                <defs>
                  <linearGradient id="colorBottomProdutos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0.15}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="opacity-50" />
                <XAxis dataKey="produto" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar dataKey="quantidade_vendida" fill="url(#colorBottomProdutos)" radius={[4, 4, 0, 0]} name="Qtd" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <TableRenderer
        headers={["Produto", "Categoria", "Preço venda", "Qtd vendida", "Receita"]}
        rows={dados.map((d) => [d.produto, d.categoria || "—", formatCurrency(d.preco_venda), String(d.quantidade_vendida), formatCurrency(d.receita_total)])}
      />
    </div>
  );
}

function MargemTab({
  dados,
  onExportCSV,
  onExportPDF,
  exportingPdf,
}: {
  dados: MargemData[];
  onExportCSV: (d: object[], f: string) => void;
  onExportPDF: () => void;
  exportingPdf?: boolean;
}) {
  if (!dados?.length) return <EmptyState />;
  const comMargem = dados.filter((d) => d.receita_total > 0);

  return (
    <div className="space-y-4">
      <ExportButtons data={comMargem} filename="margem_lucro" onExportCSV={onExportCSV} onExportPDF={onExportPDF} exportingPdf={exportingPdf} />
      <div className="rounded-2xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-5 shadow-xs">
        <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">Margem de lucro por produto</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={comMargem.slice(0, 15)}>
            <defs>
              <linearGradient id="colorMargemLucro" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#059669" stopOpacity={0.15}/>
              </linearGradient>
              <linearGradient id="colorMargemCusto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0.15}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="opacity-50" />
            <XAxis dataKey="produto" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomChartTooltip formatter={(value, name) => name === "margem" ? `${Number(value).toFixed(1)}%` : formatCurrency(Number(value))} />} />
            <Bar dataKey="lucro" fill="url(#colorMargemLucro)" radius={[4, 4, 0, 0]} name="Lucro" />
            <Bar dataKey="custo_total" fill="url(#colorMargemCusto)" radius={[4, 4, 0, 0]} name="Custo" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableRenderer
        headers={["Produto", "Categoria", "Custo unit.", "Venda unit.", "Qtd", "Receita", "Custo total", "Lucro", "Margem"]}
        rows={comMargem.map((d) => [
          d.produto, d.categoria || "—", formatCurrency(d.preco_custo), formatCurrency(d.preco_venda),
          String(d.quantidade_vendida), formatCurrency(d.receita_total), formatCurrency(d.custo_total),
          formatCurrency(d.lucro), `${(d.margem ?? 0).toFixed(1)}%`,
        ])}
      />
    </div>
  );
}

export function RelatoriosView({ breadcrumbs }: { breadcrumbs?: BreadcrumbItem[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("resumo");
  const [desde, setDesde] = useState("");
  const [ate, setAte] = useState("");
  const [agrupar, setAgrupar] = useState("dia");
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<unknown>(null);
  const [appliedDesde, setAppliedDesde] = useState("");
  const [appliedAte, setAppliedAte] = useState("");
  const [hasFetched, setHasFetched] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  useEffect(() => {
    if (!hasFetched) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      const TAB_TO_TIPO: Record<Tab, string> = {
        resumo: "resumo",
        periodo: "vendas_periodo",
        categoria: "vendas_categoria",
        funcionario: "vendas_funcionario",
        produtos: "produtos_mais_vendidos",
        margem: "margem_lucro",
      };
      params.set("tipo", TAB_TO_TIPO[activeTab]);
      if (appliedDesde) params.set("desde", appliedDesde);
      if (appliedAte) params.set("ate", appliedAte);
      if (activeTab === "periodo") params.set("agrupar", agrupar);

      try {
        const r = await fetch(`/api/relatorios?${params}`);
        const json = await r.json();
        if (!cancelled) {
          setDados(json.dados || null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setDados(null);
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeTab, appliedDesde, appliedAte, agrupar, hasFetched]);

  function exportCSV(data: object[], filename: string) {
    if (!data.length) return;
    const first = data[0] as Record<string, unknown>;
    const headers = Object.keys(first);
    const csv = [
      headers.join(","),
      ...data.map((row) => {
        const r = row as Record<string, unknown>;
        return headers.map((h) => {
          const val = r[h];
          return typeof val === "string" && val.includes(",") ? `"${val}"` : String(val ?? "");
        }).join(",");
      }),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function fetchRelatorio(tipo: string, extra?: Record<string, string>) {
    const params = new URLSearchParams({ tipo });
    if (appliedDesde) params.set("desde", appliedDesde);
    if (appliedAte) params.set("ate", appliedAte);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) params.set(k, v);
    }
    const r = await fetch(`/api/relatorios?${params}`);
    const json = await r.json();
    return json.dados ?? null;
  }

  function periodoLabel() {
    if (appliedDesde && appliedAte) return `${appliedDesde} a ${appliedAte}`;
    if (appliedDesde) return `desde ${appliedDesde}`;
    if (appliedAte) return `até ${appliedAte}`;
    return "todo o período";
  }

  function addSectionTitle(
    doc: jsPDF,
    title: string,
    startY: number,
    opts?: { newPage?: boolean }
  ) {
    let y = startY;
    if (opts?.newPage || y > 180) {
      doc.addPage();
      y = 20;
    } else if (y > 28) {
      y += 10;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(124, 58, 237);
    doc.text(title, 14, y);
    doc.setTextColor(0, 0, 0);
    return y + 6;
  }

  function addEmptyNote(doc: jsPDF, y: number) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Nenhum dado disponível nesta seção.", 14, y + 4);
    doc.setTextColor(0);
    return y + 12;
  }

  async function exportCompletePDF() {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      const [resumo, periodo, categoria, funcionario, produtos, margem] = await Promise.all([
        fetchRelatorio("resumo") as Promise<ResumoData | null>,
        fetchRelatorio("vendas_periodo", { agrupar }) as Promise<PeriodoData[] | null>,
        fetchRelatorio("vendas_categoria") as Promise<CategoriaData[] | null>,
        fetchRelatorio("vendas_funcionario") as Promise<FuncionarioData[] | null>,
        fetchRelatorio("produtos_mais_vendidos") as Promise<ProdutoData[] | null>,
        fetchRelatorio("margem_lucro") as Promise<MargemData[] | null>,
      ]);

      const doc = new jsPDF({ orientation: "landscape" });
      const dateStr = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Ateliê Angels Kids", 14, 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text("Relatório completo de vendas", 14, 26);
      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(`Período: ${periodoLabel()}  |  Gerado em: ${dateStr}`, 14, 33);
      doc.setTextColor(0);

      let y = 42;

      // —— Resumo ——
      y = addSectionTitle(doc, "1. Resumo", y);
      if (resumo) {
        autoTable(doc, {
          startY: y,
          head: [["Indicador", "Valor"]],
          body: [
            ["Total de vendas", String(resumo.totalVendas)],
            ["Valor total", formatCurrency(resumo.valorTotal)],
            ["Ticket médio", formatCurrency(resumo.ticketMedio)],
            ["Itens vendidos", String(resumo.totalItens)],
            ["Descontos", formatCurrency(resumo.totalDescontos)],
          ],
          styles: { fontSize: 9 },
          headStyles: { fillColor: [124, 58, 237] },
          columnStyles: { 1: { halign: "right" } },
        });
        y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
      } else {
        y = addEmptyNote(doc, y);
      }

      // —— Por período ——
      y = addSectionTitle(doc, "2. Por período", y);
      if (periodo?.length) {
        autoTable(doc, {
          startY: y,
          head: [["Período", "Vendas", "Valor"]],
          body: periodo.map((d) => [d.periodo, String(d.vendas), formatCurrency(d.valor)]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [124, 58, 237] },
          columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
        });
        y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
      } else {
        y = addEmptyNote(doc, y);
      }

      // —— Por categoria ——
      y = addSectionTitle(doc, "3. Por categoria", y);
      if (categoria?.length) {
        autoTable(doc, {
          startY: y,
          head: [["Categoria", "Vendas", "Qtd", "Valor"]],
          body: categoria.map((d) => [
            d.categoria,
            String(d.vendas),
            String(d.quantidade),
            formatCurrency(d.valor),
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [124, 58, 237] },
          columnStyles: {
            1: { halign: "right" },
            2: { halign: "right" },
            3: { halign: "right" },
          },
        });
        y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
      } else {
        y = addEmptyNote(doc, y);
      }

      // —— Por funcionário ——
      y = addSectionTitle(doc, "4. Por funcionário", y);
      if (funcionario?.length) {
        autoTable(doc, {
          startY: y,
          head: [["Funcionário", "Vendas", "Ticket médio", "Valor total"]],
          body: funcionario.map((d) => [
            d.funcionario,
            String(d.vendas),
            formatCurrency(d.ticket_medio),
            formatCurrency(d.valor),
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [124, 58, 237] },
          columnStyles: {
            1: { halign: "right" },
            2: { halign: "right" },
            3: { halign: "right" },
          },
        });
        y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
      } else {
        y = addEmptyNote(doc, y);
      }

      // —— Produtos ——
      y = addSectionTitle(doc, "5. Produtos", y);
      if (produtos?.length) {
        autoTable(doc, {
          startY: y,
          head: [["Produto", "Categoria", "Preço venda", "Qtd vendida", "Receita"]],
          body: produtos.map((d) => [
            d.produto,
            d.categoria || "—",
            formatCurrency(d.preco_venda),
            String(d.quantidade_vendida),
            formatCurrency(d.receita_total),
          ]),
          styles: { fontSize: 7 },
          headStyles: { fillColor: [124, 58, 237] },
          columnStyles: {
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
          },
        });
        y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
      } else {
        y = addEmptyNote(doc, y);
      }

      // —— Margem ——
      const comMargem = (margem ?? []).filter((d) => d.receita_total > 0);
      y = addSectionTitle(doc, "6. Margem", y);
      if (comMargem.length) {
        autoTable(doc, {
          startY: y,
          head: [
            [
              "Produto",
              "Categoria",
              "Custo unit.",
              "Venda unit.",
              "Qtd",
              "Receita",
              "Custo total",
              "Lucro",
              "Margem",
            ],
          ],
          body: comMargem.map((d) => [
            d.produto,
            d.categoria || "—",
            formatCurrency(d.preco_custo),
            formatCurrency(d.preco_venda),
            String(d.quantidade_vendida),
            formatCurrency(d.receita_total),
            formatCurrency(d.custo_total),
            formatCurrency(d.lucro),
            `${(d.margem ?? 0).toFixed(1)}%`,
          ]),
          styles: { fontSize: 7 },
          headStyles: { fillColor: [124, 58, 237] },
          columnStyles: {
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
            5: { halign: "right" },
            6: { halign: "right" },
            7: { halign: "right" },
            8: { halign: "right" },
          },
        });
      } else {
        addEmptyNote(doc, y);
      }

      const stamp = new Date().toISOString().slice(0, 10);
      doc.save(`relatorio_completo_${stamp}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF completo:", err);
      alert("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setExportingPdf(false);
    }
  }

  function formatDateInput(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function aplicarPeriodo(novoDesde: string, novoAte: string) {
    setDesde(novoDesde);
    setAte(novoAte);
    setAppliedDesde(novoDesde);
    setAppliedAte(novoAte);
    setHasFetched(true);
  }

  function ultimosSeteDias() {
    const hoje = new Date();
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(hoje.getDate() - 6);
    aplicarPeriodo(formatDateInput(seteDiasAtras), formatDateInput(hoje));
  }

  return (
    <div className="space-y-6">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-violet-900 dark:text-violet-300">Relatórios</h1>
        <p className="text-slate-500 dark:text-slate-400">Análise de vendas e desempenho</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-5 shadow-xs">
        <div className="flex-1 min-w-[160px] sm:flex-initial">
          <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="w-full rounded-xl border border-slate-250/60 dark:border-slate-800 bg-white px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:text-slate-200 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-800/30"
          />
        </div>
        <div className="flex-1 min-w-[160px] sm:flex-initial">
          <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Até</label>
          <input
            type="date"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
            className="w-full rounded-xl border border-slate-250/60 dark:border-slate-800 bg-white px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:text-slate-200 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-800/30"
          />
        </div>
        {activeTab === "periodo" && (
          <div className="flex-1 min-w-[120px] sm:flex-initial">
            <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Agrupar</label>
            <select
              value={agrupar}
              onChange={(e) => setAgrupar(e.target.value)}
              className="w-full rounded-xl border border-slate-250/60 dark:border-slate-800 bg-white px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:text-slate-200 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-800/30"
            >
              <option value="dia">Dia</option>
              <option value="semana">Semana</option>
              <option value="mes">Mês</option>
            </select>
          </div>
        )}
        <button
          type="button"
          onClick={ultimosSeteDias}
          className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100 active:scale-[0.98] transition-all dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/40"
        >
          Últimos 7 dias
        </button>
        <div className="flex items-end gap-2 w-full sm:w-auto">
          <button
            onClick={() => aplicarPeriodo(desde, ate)}
            className="flex-1 sm:flex-initial rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-750 active:scale-[0.98] transition-all"
          >
            Aplicar
          </button>
          <button
            onClick={() => { setDesde(""); setAte(""); setAppliedDesde(""); setAppliedAte(""); setDados(null); setHasFetched(false); }}
            className="flex-1 sm:flex-initial rounded-xl border border-slate-200 dark:border-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition-all"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/50 p-1.5 border border-slate-200/50 dark:border-slate-800/40 shadow-2xs">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === key
                ? "bg-white dark:bg-slate-800 text-violet-750 dark:text-violet-300 font-semibold shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/40"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {!hasFetched ? (
        <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-12 text-center shadow-sm">
          <p className="text-slate-400 dark:text-slate-500">
            Selecione um período e clique em <strong>Aplicar</strong>, ou use <strong>Últimos 7 dias</strong> para gerar na hora.
          </p>
        </div>
      ) : loading ? (
        <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-6 shadow-sm"><SkeletonTable rows={4} cols={4} /></div>
      ) : (
        <>
          {activeTab === "resumo" && (
            <ResumoTab dados={dados as ResumoData} onExportPDF={exportCompletePDF} exportingPdf={exportingPdf} />
          )}
          {activeTab === "periodo" && (
            <PeriodoTab
              dados={dados as PeriodoData[]}
              onExportCSV={exportCSV}
              onExportPDF={exportCompletePDF}
              exportingPdf={exportingPdf}
            />
          )}
          {activeTab === "categoria" && (
            <CategoriaTab
              dados={dados as CategoriaData[]}
              onExportCSV={exportCSV}
              onExportPDF={exportCompletePDF}
              exportingPdf={exportingPdf}
            />
          )}
          {activeTab === "funcionario" && (
            <FuncionarioTab
              dados={dados as FuncionarioData[]}
              onExportCSV={exportCSV}
              onExportPDF={exportCompletePDF}
              exportingPdf={exportingPdf}
            />
          )}
          {activeTab === "produtos" && (
            <ProdutosTab
              dados={dados as ProdutoData[]}
              onExportCSV={exportCSV}
              onExportPDF={exportCompletePDF}
              exportingPdf={exportingPdf}
            />
          )}
          {activeTab === "margem" && (
            <MargemTab
              dados={dados as MargemData[]}
              onExportCSV={exportCSV}
              onExportPDF={exportCompletePDF}
              exportingPdf={exportingPdf}
            />
          )}
        </>
      )}
    </div>
  );
}
