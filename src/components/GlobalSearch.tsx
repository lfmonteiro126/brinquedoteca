"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Package, ShoppingCart, Users, BarChart3, Clock, ArrowRight } from "lucide-react";
import { formatCurrency, normalizeImageUrl } from "@/lib/format";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { Produto } from "@/lib/types";

interface SearchResult {
  type: "produto" | "page";
  id?: number;
  title: string;
  subtitle?: string;
  href: string;
  icon: React.ReactNode;
  image?: string;
}

const PAGE_LINKS = [
  { href: "/", label: "Dashboard", icon: <BarChart3 className="h-4 w-4" /> },
  { href: "/vendas", label: "PDV / Vendas", icon: <ShoppingCart className="h-4 w-4" /> },
  { href: "/produtos", label: "Brinquedos", icon: <Package className="h-4 w-4" /> },
  { href: "/vendas/historico", label: "Histórico", icon: <Clock className="h-4 w-4" /> },
  { href: "/usuarios", label: "Usuários", icon: <Users className="h-4 w-4" /> },
];

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const openSearch = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setResults([]);
    setSelectedIndex(0);
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
  }, []);

  useKeyboardShortcuts([
    {
      key: "k",
      ctrl: true,
      description: "Busca global",
      action: openSearch,
    },
    {
      key: "/",
      description: "Busca global",
      action: openSearch,
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Handler global para ESC - funciona mesmo quando modal está aberto
  useEffect(() => {
    if (!isOpen) return;

    function handleGlobalEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeSearch();
      }
    }

    window.addEventListener("keydown", handleGlobalEscape, true);
    return () => window.removeEventListener("keydown", handleGlobalEscape, true);
  }, [isOpen, closeSearch]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("q", query.trim());
        params.set("pageSize", "10");
        const res = await fetch(`/api/produtos?${params}`);
        const data = await res.json();
        const produtos = data.produtos || [];

        const searchResults: SearchResult[] = produtos.map((p: Produto) => ({
          type: "produto" as const,
          id: p.id,
          title: p.nome,
          subtitle: `${formatCurrency(p.preco_venda)} · Estoque: ${p.estoque}`,
          href: `/produtos/${p.id}/editar`,
          icon: <Package className="h-4 w-4" />,
          image: p.imagem_url ? normalizeImageUrl(p.imagem_url) : undefined,
        }));

        const filteredPages = PAGE_LINKS.filter((p) =>
          p.label.toLowerCase().includes(query.toLowerCase())
        ).map((p) => ({
          type: "page" as const,
          title: p.label,
          href: p.href,
          icon: p.icon,
        }));

        setResults([...filteredPages, ...searchResults]);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      navigateTo(results[selectedIndex]);
    } else if (e.key === "Escape") {
      closeSearch();
    }
  }

  function navigateTo(result: SearchResult) {
    router.push(result.href);
    closeSearch();
  }

  return (
    <>
      <button
        onClick={openSearch}
        className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:border-violet-300 dark:hover:border-violet-600 transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500">
          <span className="text-xs">Ctrl</span>
          <span>K</span>
        </kbd>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 pt-[10vh]" onClick={closeSearch}>
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-[var(--card-bg)] shadow-2xl overflow-hidden animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-[var(--card-border)] px-4 py-3">
              <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar produtos, páginas..."
                className="flex-1 bg-transparent text-base text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <button onClick={closeSearch} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading && (
                <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  Buscando...
                </div>
              )}

              {!loading && query.trim().length >= 2 && results.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  Nenhum resultado para &ldquo;{query}&rdquo;
                </div>
              )}

              {!loading && query.trim().length < 2 && (
                <div className="px-4 py-4">
                  <p className="mb-2 text-xs font-medium text-slate-400 dark:text-slate-500">Páginas</p>
                  {PAGE_LINKS.map((page) => (
                    <button
                      key={page.href}
                      onClick={() => {
                        router.push(page.href);
                        closeSearch();
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                    >
                      <span className="text-slate-500 dark:text-slate-400">{page.icon}</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{page.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {results.length > 0 && (
                <ul className="py-2">
                  {results.map((result, i) => (
                    <li key={`${result.type}-${result.href}`}>
                      <button
                        onClick={() => navigateTo(result)}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                          i === selectedIndex
                            ? "bg-violet-50 dark:bg-violet-900/20"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {result.image ? (
                          <img
                            src={result.image}
                            alt={result.title}
                            className="h-10 w-10 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                            {result.icon}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                            {result.title}
                          </p>
                          {result.subtitle && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-[var(--card-border)] px-4 py-2 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
              <span>Navegar com <kbd className="rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-1 py-0.5 font-mono">↑↓</kbd></span>
              <span>Selecionar com <kbd className="rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-1 py-0.5 font-mono">Enter</kbd></span>
              <span>Fechar com <kbd className="rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-1 py-0.5 font-mono">Esc</kbd></span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
