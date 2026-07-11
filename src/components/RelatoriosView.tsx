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
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { SkeletonTable } from "@/components/Skeleton";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";
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
    <div className="overflow-x-auto rounded-2xl bg-white dark:bg-[var(--card-bg)] shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-700 text-left text-slate-600 dark:text-slate-400">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-50 dark:border-[var(--card-border)]">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExportButtons({ data, filename, onExportCSV, onExportPDF }: { data: object[]; filename: string; onExportCSV: (d: object[], f: string) => void; onExportPDF: (d: object[], f: string) => void }) {
  return (
    <div className="flex justify-end gap-2">
      <button onClick={() => onExportCSV(data, filename)} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
        <Download className="h-4 w-4" /> CSV
      </button>
      <button onClick={() => onExportPDF(data, filename)} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
        <FileText className="h-4 w-4" /> PDF
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

function ResumoTab({ dados, onExportPDF }: { dados: ResumoData | null; onExportPDF: (d: object[], f: string) => void }) {
  if (!dados) return null;
  const cards = [
    { label: "Total de vendas", value: String(dados.totalVendas) },
    { label: "Valor total", value: formatCurrency(dados.valorTotal) },
    { label: "Ticket médio", value: formatCurrency(dados.ticketMedio) },
    { label: "Itens vendidos", value: String(dados.totalItens) },
    { label: "Descontos", value: formatCurrency(dados.totalDescontos) },
  ];
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => onExportPDF([{ ...dados }], "resumo")} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
          <FileText className="h-4 w-4" /> PDF
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-5 shadow-sm">
            <p className="text-sm text-slate-500 dark:text-slate-400">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PeriodoTab({ dados, onExportCSV, onExportPDF }: { dados: PeriodoData[]; onExportCSV: (d: object[], f: string) => void; onExportPDF: (d: object[], f: string) => void }) {
  if (!dados?.length) return <EmptyState />;
  return (
    <div className="space-y-4">
      <ExportButtons data={dados} filename="vendas_por_periodo" onExportCSV={onExportCSV} onExportPDF={onExportPDF} />
      <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">Vendas por período</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={dados}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Bar dataKey="valor" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Valor" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableRenderer headers={["Período", "Vendas", "Valor"]} rows={dados.map((d) => [d.periodo, String(d.vendas), formatCurrency(d.valor)])} />
    </div>
  );
}

function CategoriaTab({ dados, onExportCSV, onExportPDF }: { dados: CategoriaData[]; onExportCSV: (d: object[], f: string) => void; onExportPDF: (d: object[], f: string) => void }) {
  if (!dados?.length) return <EmptyState />;
  return (
    <div className="space-y-4">
      <ExportButtons data={dados} filename="vendas_por_categoria" onExportCSV={onExportCSV} onExportPDF={onExportPDF} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">Receita por categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={dados} cx="50%" cy="50%" outerRadius={100} dataKey="valor" nameKey="categoria"
                label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}>
                {dados.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">Quantidade por categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dados} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="categoria" type="category" width={120} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="quantidade" fill="#2563eb" radius={[0, 4, 4, 0]} name="Qtd" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <TableRenderer headers={["Categoria", "Vendas", "Qtd", "Valor"]} rows={dados.map((d) => [d.categoria, String(d.vendas), String(d.quantidade), formatCurrency(d.valor)])} />
    </div>
  );
}

function FuncionarioTab({ dados, onExportCSV, onExportPDF }: { dados: FuncionarioData[]; onExportCSV: (d: object[], f: string) => void; onExportPDF: (d: object[], f: string) => void }) {
  if (!dados?.length) return <EmptyState />;
  return (
    <div className="space-y-4">
      <ExportButtons data={dados} filename="vendas_por_funcionario" onExportCSV={onExportCSV} onExportPDF={onExportPDF} />
      <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">Vendas por funcionário</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dados}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="funcionario" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Bar dataKey="valor" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Valor" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableRenderer headers={["Funcionário", "Vendas", "Ticket médio", "Valor total"]} rows={dados.map((d) => [d.funcionario, String(d.vendas), formatCurrency(d.ticket_medio), formatCurrency(d.valor)])} />
    </div>
  );
}

function ProdutosTab({ dados, onExportCSV, onExportPDF }: { dados: ProdutoData[]; onExportCSV: (d: object[], f: string) => void; onExportPDF: (d: object[], f: string) => void }) {
  if (!dados?.length) return <EmptyState />;
  const top10 = dados.slice(0, 10);
  const bottom10 = [...dados].reverse().filter((d) => d.quantidade_vendida > 0).slice(0, 10);

  return (
    <div className="space-y-6">
      <ExportButtons data={dados} filename="produtos_vendidos" onExportCSV={onExportCSV} onExportPDF={onExportPDF} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">Mais vendidos</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={top10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="produto" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="quantidade_vendida" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Qtd" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {bottom10.length > 0 && (
          <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">Menos vendidos</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={bottom10}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="produto" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="quantidade_vendida" fill="#dc2626" radius={[4, 4, 0, 0]} name="Qtd" />
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

function MargemTab({ dados, onExportCSV, onExportPDF }: { dados: MargemData[]; onExportCSV: (d: object[], f: string) => void; onExportPDF: (d: object[], f: string) => void }) {
  if (!dados?.length) return <EmptyState />;
  const comMargem = dados.filter((d) => d.receita_total > 0);

  return (
    <div className="space-y-4">
      <ExportButtons data={comMargem} filename="margem_lucro" onExportCSV={onExportCSV} onExportPDF={onExportPDF} />
      <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">Margem de lucro por produto</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={comMargem.slice(0, 15)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="produto" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value, name) => name === "margem" ? `${Number(value).toFixed(1)}%` : formatCurrency(Number(value))} />
            <Bar dataKey="lucro" fill="#059669" radius={[4, 4, 0, 0]} name="Lucro" />
            <Bar dataKey="custo_total" fill="#dc2626" radius={[4, 4, 0, 0]} name="Custo" />
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

  function exportPDF(data: object[], filename: string) {
    if (!data.length) return;
    const doc = new jsPDF({ orientation: "landscape" });
    const first = data[0] as Record<string, unknown>;
    const headers = Object.keys(first);
    const rows = data.map((row) => {
      const r = row as Record<string, unknown>;
      return headers.map((h) => String(r[h] ?? ""));
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Ateliê Angels Kids", 14, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const dateStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    doc.text(`Relatório: ${filename.replace(/_/g, " ")}  |  Gerado em: ${dateStr}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [headers.map((h) => h.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [124, 58, 237] },
    });

    doc.save(`${filename}.pdf`);
  }

  return (
    <div className="space-y-6">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-violet-900 dark:text-violet-300">Relatórios</h1>
        <p className="text-slate-500 dark:text-slate-400">Análise de vendas e desempenho</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white dark:bg-[var(--card-bg)] p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded-lg border px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Até</label>
          <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="rounded-lg border px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200" />
        </div>
        {activeTab === "periodo" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Agrupar</label>
            <select value={agrupar} onChange={(e) => setAgrupar(e.target.value)} className="rounded-lg border px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200">
              <option value="dia">Dia</option>
              <option value="semana">Semana</option>
              <option value="mes">Mês</option>
            </select>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={() => { setAppliedDesde(desde); setAppliedAte(ate); setHasFetched(true); }}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Aplicar
          </button>
          <button
            onClick={() => { setDesde(""); setAte(""); setAppliedDesde(""); setAppliedAte(""); setDados(null); setHasFetched(false); }}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-2xl bg-white dark:bg-[var(--card-bg)] p-1 shadow-sm">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${activeTab === key ? "bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {!hasFetched ? (
        <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-12 text-center shadow-sm">
          <p className="text-slate-400 dark:text-slate-500">Selecione um período e clique em <strong>Aplicar</strong> para gerar o relatório.</p>
        </div>
      ) : loading ? (
        <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-6 shadow-sm"><SkeletonTable rows={4} cols={4} /></div>
      ) : (
        <>
          {activeTab === "resumo" && <ResumoTab dados={dados as ResumoData} onExportPDF={exportPDF} />}
          {activeTab === "periodo" && <PeriodoTab dados={dados as PeriodoData[]} onExportCSV={exportCSV} onExportPDF={exportPDF} />}
          {activeTab === "categoria" && <CategoriaTab dados={dados as CategoriaData[]} onExportCSV={exportCSV} onExportPDF={exportPDF} />}
          {activeTab === "funcionario" && <FuncionarioTab dados={dados as FuncionarioData[]} onExportCSV={exportCSV} onExportPDF={exportPDF} />}
          {activeTab === "produtos" && <ProdutosTab dados={dados as ProdutoData[]} onExportCSV={exportCSV} onExportPDF={exportPDF} />}
          {activeTab === "margem" && <MargemTab dados={dados as MargemData[]} onExportCSV={exportCSV} onExportPDF={exportPDF} />}
        </>
      )}
    </div>
  );
}
