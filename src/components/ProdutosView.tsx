"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  Grid3X3,
  List,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  Package,
  X,
} from "lucide-react";
import { formatCurrency, normalizeImageUrl } from "@/lib/format";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/components/Toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StockAdjustModal } from "@/components/StockAdjustModal";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";
import type { Produto } from "@/lib/types";

const PAGE_SIZE = 20;

type ViewMode = "grid" | "list";
type StockFilter = "all" | "low" | "out" | "ok";

export function ProdutosView({ isAdmin, breadcrumbs }: { isAdmin: boolean; breadcrumbs?: BreadcrumbItem[] }) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Produto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState("nome");
  const [stockAdjust, setStockAdjust] = useState<{ produto: Produto; tipo: "entrada" | "saida" } | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  const categorias = [...new Set(produtos.map((p) => p.categoria).filter(Boolean))] as string[];

  const debouncedSearch = useDebounce((value: string) => {
    setSearch(value);
    setPage(1);
  }, 300);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (search) params.set("q", search);
      try {
        const res = await fetch(`/api/produtos?${params}`);
        const data = await res.json();
        if (!cancelled) {
          setProdutos(data.produtos || []);
          setTotal(data.total || 0);
        }
      } catch {
        if (!cancelled) {
          setProdutos([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page, search]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQ(e.target.value);
    debouncedSearch(e.target.value);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/produtos/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setProdutos((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setTotal((prev) => prev - 1);
        setDeleteTarget(null);
        showToast("success", "Produto excluído com sucesso");
      }
    } finally {
      setDeleting(false);
    }
  }

  function addToCart(produto: Produto) {
    const savedCart = JSON.parse(localStorage.getItem("pos_cart") || "[]");
    const existing = savedCart.find((item: { produto: { id: number } }) => item.produto.id === produto.id);

    if (existing) {
      if (existing.quantidade >= produto.estoque) {
        showToast("error", "Estoque insuficiente");
        return;
      }
      existing.quantidade += 1;
    } else {
      if (produto.estoque < 1) {
        showToast("error", "Produto sem estoque");
        return;
      }
      savedCart.push({ produto, quantidade: 1 });
    }

    localStorage.setItem("pos_cart", JSON.stringify(savedCart));
    showToast("success", `${produto.nome} adicionado ao PDV`);
  }

  // Filtragem local
  const produtosFiltrados = produtos.filter((p) => {
    // Filtro de categoria
    if (categoriaFilter && p.categoria !== categoriaFilter) return false;

    // Filtro de estoque
    if (stockFilter === "low" && p.estoque > p.estoque_minimo) return false;
    if (stockFilter === "out" && p.estoque > 0) return false;
    if (stockFilter === "ok" && p.estoque <= p.estoque_minimo) return false;

    // Filtro de preço
    if (priceMin && p.preco_venda < parseFloat(priceMin)) return false;
    if (priceMax && p.preco_venda > parseFloat(priceMax)) return false;

    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case "preco_asc": return a.preco_venda - b.preco_venda;
      case "preco_desc": return b.preco_venda - a.preco_venda;
      case "estoque_asc": return a.estoque - b.estoque;
      case "estoque_desc": return b.estoque - a.estoque;
      case "nome":
      default: return a.nome.localeCompare(b.nome);
    }
  });

  const hasActiveFilters = stockFilter !== "all" || priceMin || priceMax || sortBy !== "nome";

  function clearFilters() {
    setStockFilter("all");
    setPriceMin("");
    setPriceMax("");
    setSortBy("nome");
    setCategoriaFilter("");
  }

  return (
    <div className="space-y-6">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-violet-900 dark:text-violet-300">Brinquedos</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {total} produto{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/vendas"
            className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Abrir PDV</span>
          </Link>
          {isAdmin && (
            <Link
              href="/produtos/novo"
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Novo brinquedo
            </Link>
          )}
        </div>
      </div>

      {/* Barra de busca e filtros */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-[var(--card-bg)] dark:border-[var(--card-border)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={q}
              onChange={handleSearchChange}
              placeholder="Pesquise por SKU ou Nome..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-violet-400 dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle visualização */}
            <div className="flex rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-slate-50 dark:bg-slate-800 p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors active:scale-[0.98] ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-700 text-violet-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
                title="Visualização em grade"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors active:scale-[0.98] ${
                  viewMode === "list"
                    ? "bg-white dark:bg-slate-700 text-violet-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
                title="Visualização em lista"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Botão filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                showFilters || hasActiveFilters
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-[var(--card-border)] dark:bg-transparent dark:text-slate-400 dark:hover:bg-slate-700"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                  !
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filtros expandidos */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 dark:border-[var(--card-border)] pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Status Estoque</label>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200"
              >
                <option value="all">Todos</option>
                <option value="ok">Estoque OK</option>
                <option value="low">Estoque Baixo</option>
                <option value="out">Sem Estoque</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Categoria</label>
              <select
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200"
              >
                <option value="">Todas</option>
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Faixa de Preço</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Mín"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  placeholder="Máx"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Ordenar por</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:bg-[var(--input-bg)] dark:border-[var(--card-border)] dark:text-slate-200"
              >
                <option value="nome">Nome (A-Z)</option>
                <option value="preco_asc">Preço (menor)</option>
                <option value="preco_desc">Preço (maior)</option>
                <option value="estoque_asc">Estoque (menor)</option>
                <option value="estoque_desc">Estoque (maior)</option>
              </select>
            </div>

            {hasActiveFilters && (
              <div className="sm:col-span-2 lg:col-span-4">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400 hover:underline"
                >
                  <X className="h-3.5 w-3.5" />
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista de produtos */}
      {loading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-[var(--card-bg)] dark:border-[var(--card-border)]">
                <div className="mb-4 h-40 rounded-xl bg-slate-200 dark:bg-slate-700" />
                <div className="mb-2 h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mb-2 h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mb-3 h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-[var(--card-bg)] dark:border-[var(--card-border)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-slate-100 dark:border-[var(--card-border)] py-4 last:border-0">
                <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="h-8 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        )
      ) : produtosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 dark:bg-[var(--card-bg)] dark:border-[var(--card-border)]">
          <Package className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-400 dark:text-slate-500">Nenhum brinquedo encontrado</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-2 text-sm text-violet-600 dark:text-violet-400 hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        // Visualização em grade
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {produtosFiltrados.map((p) => {
            const baixo = p.estoque <= p.estoque_minimo;
            const semEstoque = p.estoque === 0;
            return (
              <div
                key={p.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-violet-200 dark:bg-[var(--card-bg)] dark:border-[var(--card-border)] dark:hover:border-violet-700 cursor-pointer"
              >
                <div onClick={() => setSelectedProduct(p)} className="flex flex-1 flex-col">
                  <div className="relative">
                    {semEstoque ? (
                      <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                        SEM ESTOQUE
                      </span>
                    ) : baixo ? (
                      <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                        <AlertTriangle className="h-3 w-3" />
                        REPOR! QTD: {p.estoque}
                      </span>
                    ) : (
                      <span className="absolute left-3 top-3 z-10 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                        ESTOQUE OK
                      </span>
                    )}
                    {p.imagem_url && normalizeImageUrl(p.imagem_url) ? (
                      <img
                        src={normalizeImageUrl(p.imagem_url)}
                        alt={p.nome}
                        className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/20 dark:to-violet-800/10">
                        <Package className="h-12 w-12 text-violet-300 dark:text-violet-600" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400">
                      {p.categoria || "Sem categoria"}
                    </p>
                    <h3 className="mb-2 text-base font-bold leading-tight text-slate-800 dark:text-slate-200 line-clamp-2">
                      {p.nome}
                    </h3>
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono dark:bg-slate-700">
                        SKU: {p.codigo_barras || "—"}
                      </span>
                      <span>Mín: {p.estoque_minimo}</span>
                    </div>
                    {p.descricao && (
                      <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {p.descricao}
                      </p>
                    )}
                    <div className="mt-auto">
                      <div className="mb-3 flex items-end justify-between">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Preço Venda</p>
                          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(p.preco_venda)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Custo</p>
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                            {formatCurrency(p.preco_custo)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-[var(--card-border)] dark:bg-slate-800/50">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Qtd: <span className="font-bold text-slate-800 dark:text-slate-200">{p.estoque}</span>
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setStockAdjust({ produto: p, tipo: "saida" });
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                      >
                        −
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setStockAdjust({ produto: p, tipo: "entrada" });
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        addToCart(p);
                      }}
                      disabled={semEstoque}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Adicionar ao PDV
                    </button>
                    {isAdmin && (
                      <Link
                        href={`/produtos/${p.id}/editar`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-600 transition-colors hover:bg-slate-50 active:scale-[0.98] dark:border-[var(--card-border)] dark:bg-transparent dark:text-slate-400 dark:hover:bg-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    )}
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(p);
                        }}
                        className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200 active:scale-[0.98] dark:border-[var(--card-border)] dark:bg-transparent dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Visualização em lista
        <>
          {/* Cards no mobile */}
          <div className="sm:hidden space-y-3">
            {produtosFiltrados.map((p) => {
              const baixo = p.estoque <= p.estoque_minimo;
              const semEstoque = p.estoque === 0;
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-[var(--card-bg)] dark:border-[var(--card-border)]"
                >
                  <div className="flex items-start gap-3">
                    {p.imagem_url && normalizeImageUrl(p.imagem_url) ? (
                      <img src={normalizeImageUrl(p.imagem_url)} alt={p.nome} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                        <Package className="h-6 w-6 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <button onClick={() => setSelectedProduct(p)} className="text-left font-medium text-slate-800 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 line-clamp-1">
                        {p.nome}
                      </button>
                      {p.descricao && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.descricao}</p>
                      )}
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{p.categoria || "Sem categoria"}</span>
                        <span>·</span>
                        <span className="font-mono">{p.codigo_barras || "Sem SKU"}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.preco_venda)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Estoque: {p.estoque}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {semEstoque ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Sem estoque
                      </span>
                    ) : baixo ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-3 w-3" />
                        Baixo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        OK
                      </span>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => addToCart(p)}
                        disabled={semEstoque}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white active:scale-[0.98] disabled:opacity-50 transition-transform"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Adicionar
                      </button>
                      {isAdmin && (
                        <Link
                          href={`/produtos/${p.id}/editar`}
                          className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 active:scale-[0.98] dark:border-[var(--card-border)] dark:bg-transparent dark:text-slate-400 transition-transform"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 active:scale-[0.98] hover:text-red-600 dark:border-[var(--card-border)] dark:bg-transparent dark:text-slate-400 transition-transform"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabela no desktop */}
          <div className="hidden sm:block rounded-2xl border border-slate-200 bg-white shadow-sm dark:bg-[var(--card-bg)] dark:border-[var(--card-border)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-[var(--card-border)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Produto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Categoria</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Preço</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estoque</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[var(--card-border)]">
                  {produtosFiltrados.map((p) => {
                    const baixo = p.estoque <= p.estoque_minimo;
                    const semEstoque = p.estoque === 0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {p.imagem_url && normalizeImageUrl(p.imagem_url) ? (
                              <img src={normalizeImageUrl(p.imagem_url)} alt={p.nome} className="h-10 w-10 rounded-xl object-cover" />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                                <Package className="h-5 w-5 text-slate-400" />
                              </div>
                            )}
                            <div>
                              <button onClick={() => setSelectedProduct(p)} className="text-left font-medium text-slate-800 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400">
                                {p.nome}
                              </button>
                              {p.descricao && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{p.descricao}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{p.codigo_barras || "—"}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{p.categoria || "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.preco_venda)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200">{p.estoque}</td>
                        <td className="px-4 py-3 text-center">
                          {semEstoque ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Sem estoque
                            </span>
                          ) : baixo ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
                              <AlertTriangle className="h-3 w-3" />
                              Baixo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              OK
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => addToCart(p)}
                              disabled={semEstoque}
                              className="flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Adicionar ao PDV"
                            >
                              <ShoppingCart className="h-3.5 w-3.5" />
                            </button>
                            {isAdmin && (
                              <Link
                                href={`/produtos/${p.id}/editar`}
                                className="flex items-center justify-center rounded-xl border border-slate-200 dark:border-[var(--card-border)] p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                title="Editar"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Link>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => setDeleteTarget(p)}
                                className="flex items-center justify-center rounded-xl border border-slate-200 dark:border-[var(--card-border)] p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Paginação */}
      {!loading && total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-40 dark:bg-[var(--card-bg)] dark:border-[var(--card-border)] dark:text-slate-400 dark:hover:bg-slate-700 transition-transform"
          >
            Anterior
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Página {page} de {Math.ceil(total / PAGE_SIZE)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / PAGE_SIZE)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-40 dark:bg-[var(--card-bg)] dark:border-[var(--card-border)] dark:text-slate-400 dark:hover:bg-slate-700 transition-transform"
          >
            Próxima
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir brinquedo"
        message={`Tem certeza que deseja excluir "${deleteTarget?.nome}"? Essa ação não pode ser desfeita.`}
        confirmLabel={deleting ? "Excluindo..." : "Excluir"}
        danger
      />

      {stockAdjust && (
        <StockAdjustModal
          key={`${stockAdjust.produto.id}-${stockAdjust.tipo}`}
          open={!!stockAdjust}
          onClose={() => setStockAdjust(null)}
          produto={stockAdjust.produto}
          tipo={stockAdjust.tipo}
          onConfirm={(novoEstoque) => {
            setProdutos((prev) =>
              prev.map((p) =>
                p.id === stockAdjust.produto.id ? { ...p, estoque: novoEstoque } : p
              )
            );
          }}
        />
      )}

      {selectedProduct && (
        <ProductDetailModal
          produto={selectedProduct}
          isAdmin={isAdmin}
          onClose={() => setSelectedProduct(null)}
          onEdit={() => {
            router.push(`/produtos/${selectedProduct.id}/editar`);
          }}
          onAddToCart={() => {
            addToCart(selectedProduct);
            setSelectedProduct(null);
          }}
          onStockAdjust={(tipo) => {
            setStockAdjust({ produto: selectedProduct, tipo });
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}
