"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Barcode,
  Check,
  ImageOff,
  Minus,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
  ShoppingCart,
  Percent,
  CreditCard,
  Keyboard,
} from "lucide-react";
import { formatCurrency, normalizeImageUrl } from "@/lib/format";
import { escapeHtml } from "@/lib/sanitize";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { useKeyboardShortcuts, getShortcutLabel } from "@/hooks/useKeyboardShortcuts";
import { ShortcutHelp } from "@/components/ShortcutHelp";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/Breadcrumbs";
import type { Produto, User } from "@/lib/types";

interface CartItem {
  produto: Produto;
  quantidade: number;
}

interface VendaFinalizada {
  numero: number;
  total: number;
  metodo_pagamento: string;
  parcelas: number;
  itens: { nome: string; quantidade: number; subtotal: number }[];
  data: string;
}

const RECENT_KEY = "pos_recent_searches";
const MAX_RECENT = 8;

function loadRecent(): Produto[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(produto: Produto) {
  const recent = loadRecent().filter((p) => p.id !== produto.id);
  recent.unshift(produto);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export function POSView({ breadcrumbs }: { breadcrumbs?: BreadcrumbItem[] }) {
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [desconto, setDesconto] = useState(0);
  const [descontoInput, setDescontoInput] = useState<string>("0");
  const [descontoAutorizado, setDescontoAutorizado] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingDesconto, setPendingDesconto] = useState(0);
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [verifyingAuth, setVerifyingAuth] = useState(false);
  const [authSuccessCallback, setAuthSuccessCallback] = useState<(() => void) | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState("dinheiro");
  const [parcelas, setParcelas] = useState(1);
  const [vendaFinalizada, setVendaFinalizada] = useState<VendaFinalizada | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Produto[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState<Produto[]>(() => loadRecent());
  const [showRecent, setShowRecent] = useState(false);
  const [modalProdutos, setModalProdutos] = useState<Produto[] | null>(null);
  const [produtoDetalhe, setProdutoDetalhe] = useState<Produto | null>(null);
  const [addedItemId, setAddedItemId] = useState<number | null>(null);
  const cartTotalItems = cart.reduce((acc, item) => acc + item.quantidade, 0);
  const [animateCart, setAnimateCart] = useState(false);

  useEffect(() => {
    if (cartTotalItems > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnimateCart(true);
      const timer = setTimeout(() => setAnimateCart(false), 300);
      return () => clearTimeout(timer);
    }
  }, [cartTotalItems]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});

    // Limpa chave legada de carrinho global para não deixar lixo no navegador
    try {
      localStorage.removeItem("pos_cart");
    } catch {}
  }, []);

  // Carrega o carrinho específico do usuário
  useEffect(() => {
    if (currentUser) {
      const saved = localStorage.getItem(`pos_cart_${currentUser.id}`);
      if (saved) {
        try {
          setCart(JSON.parse(saved));
        } catch {
          setCart([]);
        }
      } else {
        setCart([]);
      }
      setCartLoaded(true);
    } else {
      setCartLoaded(false);
    }
  }, [currentUser]);

  const isAdmin = currentUser?.role === "admin";

  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descontoRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  const focusDesconto = useCallback(() => {
    descontoRef.current?.focus();
    descontoRef.current?.select();
  }, []);

  const handleDescontoChange = (valStr: string) => {
    setDescontoInput(valStr);
  };

  const processarDesconto = useCallback((onSuccess?: () => void) => {
    const val = Math.max(0, parseFloat(descontoInput) || 0);

    if (val === 0) {
      setDesconto(0);
      setDescontoInput("0");
      setDescontoAutorizado(false);
      onSuccess?.();
      return true;
    }

    if (val === desconto) {
      onSuccess?.();
      return true;
    }

    if (isAdmin) {
      setDesconto(val);
      setDescontoInput(val.toString());
      setDescontoAutorizado(true);
      onSuccess?.();
      return true;
    }

    setPendingDesconto(val);
    setAuthPassword("");
    setAuthError("");
    setShowAuthModal(true);
    setAuthSuccessCallback(() => onSuccess || null);
    return false;
  }, [descontoInput, desconto, isAdmin]);

  const handleCancelAuth = () => {
    setShowAuthModal(false);
    setDescontoInput(desconto > 0 ? desconto.toString() : "0");
    setAuthSuccessCallback(null);
  };

  const handleConfirmAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!authPassword) return;

    setVerifyingAuth(true);
    setAuthError("");

    try {
      const res = await fetch("/api/auth/autorizar-desconto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: authPassword }),
      });
      const data = await res.json();

      if (res.ok && data.authorized) {
        setDesconto(pendingDesconto);
        setDescontoInput(pendingDesconto.toString());
        setDescontoAutorizado(true);
        setShowAuthModal(false);
        showToast("success", `Desconto de ${formatCurrency(pendingDesconto)} autorizado!`);
        if (authSuccessCallback) {
          authSuccessCallback();
          setAuthSuccessCallback(null);
        }
      } else {
        setAuthError(data.error || "Senha incorreta.");
      }
    } catch {
      setAuthError("Erro ao validar autorização.");
    } finally {
      setVerifyingAuth(false);
    }
  };

  const clearCart = useCallback(() => {
    if (cart.length > 0) {
      setCart([]);
      if (currentUser) {
        localStorage.removeItem(`pos_cart_${currentUser.id}`);
      }
      setDesconto(0);
      setDescontoInput("0");
      setDescontoAutorizado(false);
      showToast("info", "Carrinho limpo");
    }
  }, [cart.length, showToast, currentUser]);

  const triggerFinalizar = useCallback(() => {
    if (cart.length === 0) return;
    const ok = processarDesconto(() => setConfirmOpen(true));
    if (ok) {
      setConfirmOpen(true);
    }
  }, [cart.length, processarDesconto]);

  // Handler global para ESC - funciona mesmo quando modais estão abertos
  useEffect(() => {
    function handleGlobalEscape(e: KeyboardEvent) {
      if (e.key !== "Escape") return;

      // Prioridade: fechar modais na ordem correta
      if (modalProdutos) {
        e.preventDefault();
        e.stopPropagation();
        setModalProdutos(null);
        setSearchQuery("");
      } else if (vendaFinalizada) {
        e.preventDefault();
        e.stopPropagation();
        setVendaFinalizada(null);
        showToast("success", "Venda finalizada com sucesso!");
      } else if (produtoDetalhe) {
        e.preventDefault();
        e.stopPropagation();
        setProdutoDetalhe(null);
      }
    }

    window.addEventListener("keydown", handleGlobalEscape, true);
    return () => window.removeEventListener("keydown", handleGlobalEscape, true);
  }, [modalProdutos, vendaFinalizada, produtoDetalhe, showToast]);

  // Atalhos de teclado
  const shortcuts = [
    {
      key: "F2",
      description: "Foco no campo de desconto",
      action: focusDesconto,
    },
    {
      key: "F3",
      description: "Foco na busca de produtos",
      action: focusSearch,
    },
    {
      key: "F4",
      description: "Finalizar venda",
      action: triggerFinalizar,
    },
    {
      key: "F5",
      description: "Limpar carrinho",
      action: clearCart,
    },
    {
      key: "Escape",
      description: "Fechar modais / Limpar busca",
      action: () => {
        if (modalProdutos) {
          setModalProdutos(null);
          setSearchQuery("");
        } else if (vendaFinalizada) {
          setVendaFinalizada(null);
        } else if (produtoDetalhe) {
          setProdutoDetalhe(null);
        } else {
          setSearchQuery("");
          setShowResults(false);
          setShowRecent(false);
          focusInput();
        }
      },
    },
  ];

  useKeyboardShortcuts(shortcuts);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  useEffect(() => {
    if (currentUser && cartLoaded) {
      localStorage.setItem(`pos_cart_${currentUser.id}`, JSON.stringify(cart));
    }
  }, [cart, currentUser, cartLoaded]);

  async function buscarPorCodigo(code: string) {
    const res = await fetch(`/api/produtos/barcode/${encodeURIComponent(code)}`);
    const data = await res.json();

    if (!res.ok) {
      showToast("error", data.error || "Produto não encontrado");
      return;
    }

    adicionarAoCarrinho(data.produto);
    setBarcode("");
  }

  function adicionarAoCarrinho(produto: Produto) {
    let added = false;
    setCart((prev) => {
      const existing = prev.find((i) => i.produto.id === produto.id);
      if (existing) {
        if (existing.quantidade >= produto.estoque) {
          showToast("error", "Estoque insuficiente");
          return prev;
        }
        added = true;
        return prev.map((i) =>
          i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i
        );
      }
      if (produto.estoque < 1) {
        showToast("error", "Produto sem estoque");
        return prev;
      }
      added = true;
      return [...prev, { produto, quantidade: 1 }];
    });

    if (added) {
      saveRecent(produto);
      setRecentSearches(loadRecent());
      setShowResults(false);
      setShowRecent(false);
      setSearchQuery("");
      setAddedItemId(produto.id);
      setTimeout(() => setAddedItemId(null), 500);
      focusInput();
    }
  }

  function handleBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && barcode.trim()) {
      e.preventDefault();
      buscarPorCodigo(barcode.trim());
    }
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      setShowRecent(true);
      return;
    }

    setShowRecent(false);
    setShowResults(true);

    searchTimerRef.current = setTimeout(async () => {
      const params = new URLSearchParams();
      params.set("q", value.trim());
      params.set("pageSize", "20");
      const res = await fetch(`/api/produtos?${params}`);
      const data = await res.json();
      const results = data.produtos || [];
      setSearchResults(results);
    }, 300);
  }

  function handleSearchFocus() {
    if (searchQuery.trim().length >= 2) {
      setShowResults(true);
      setShowRecent(false);
    } else {
      setShowResults(false);
      setShowRecent(true);
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setShowResults(false);
      setShowRecent(false);
      setModalProdutos(null);
      searchRef.current?.blur();
      return;
    }

    if (e.key === "Enter" && searchQuery.trim()) {
      e.preventDefault();

      if (searchResults.length === 1) {
        adicionarAoCarrinho(searchResults[0]);
        setSearchQuery("");
        setShowResults(false);
        return;
      }

      if (searchResults.length > 1) {
        setModalProdutos(searchResults);
        return;
      }

      buscarPorCodigo(searchQuery.trim());
      setSearchQuery("");
      setShowResults(false);
    }
  }

  function selecionarDoModal(produto: Produto) {
    adicionarAoCarrinho(produto);
    setModalProdutos(null);
    setSearchQuery("");
  }

  function updateQty(produtoId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.produto.id !== produtoId) return i;
          const q = i.quantidade + delta;
          if (q < 1 || q > i.produto.estoque) return i;
          return { ...i, quantidade: q };
        })
        .filter((i) => i.quantidade > 0)
    );
  }

  function removeItem(produtoId: number) {
    setCart((prev) => prev.filter((i) => i.produto.id !== produtoId));
    showToast("info", "Item removido do carrinho");
  }

  const subtotal = cart.reduce((s, i) => s + i.produto.preco_venda * i.quantidade, 0);
  const total = Math.max(0, subtotal - desconto);

  function handleFinalizar() {
    if (cart.length === 0) return;
    const ok = processarDesconto(() => setConfirmOpen(true));
    if (ok) {
      setConfirmOpen(true);
    }
  }

  async function finalizarVenda() {
    setConfirmOpen(false);
    if (cart.length === 0) return;
    setLoading(true);

    const itensParaEnvio = cart.map((i) => ({
      produto_id: i.produto.id,
      quantidade: i.quantidade,
    }));

    const itensSnapshot = cart.map((i) => ({
      nome: i.produto.nome,
      quantidade: i.quantidade,
      subtotal: i.produto.preco_venda * i.quantidade,
    }));

    const metodoLabel: Record<string, string> = {
      pix: "PIX",
      debito: "Cartão de débito",
      credito: `Cartão de crédito (${parcelas}x)`,
      dinheiro: "Dinheiro",
    };

    const res = await fetch("/api/vendas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itens: itensParaEnvio,
        desconto,
        metodo_pagamento: metodoPagamento,
        parcelas: metodoPagamento === "credito" ? parcelas : 1,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      showToast("error", data.error);
      return;
    }

    setVendaFinalizada({
      numero: data.numero,
      total: data.total,
      metodo_pagamento: metodoLabel[metodoPagamento] || metodoPagamento,
      parcelas: metodoPagamento === "credito" ? parcelas : 1,
      itens: itensSnapshot,
      data: new Date().toLocaleString("pt-BR"),
    });

    setCart([]);
    if (currentUser) {
      localStorage.removeItem(`pos_cart_${currentUser.id}`);
    }
    setDesconto(0);
    setDescontoInput("0");
    setDescontoAutorizado(false);
    setMetodoPagamento("dinheiro");
    setParcelas(1);
    focusInput();
  }

  function imprimirCupom() {
    if (!vendaFinalizada) return;

    const itensTexto = vendaFinalizada.itens
      .map(
        (i) =>
          `${i.nome}\n  ${i.quantidade}x ${formatCurrency(i.subtotal / i.quantidade)}  ${formatCurrency(i.subtotal)}`
      )
      .join("\n");

    const cupom = `
╔══════════════════════════════════╗
║     ATELÊ ANGELS KIDS            ║
║     Loja Praia Grande             ║
╠══════════════════════════════════╣
║  Venda #${String(vendaFinalizada.numero).padStart(4, "0")}
║  Data: ${vendaFinalizada.data}
╠══════════════════════════════════╣
${itensTexto}
╠══════════════════════════════════╣
║  TOTAL: ${formatCurrency(vendaFinalizada.total)}
║  Pagamento: ${vendaFinalizada.metodo_pagamento}
╚══════════════════════════════════╝
    `.trim();

    const printWindow = window.open("", "_blank", "width=320,height=500");
    if (printWindow) {
      printWindow.document.write(
        `<pre style="font-family:monospace;font-size:13px;margin:0;">${escapeHtml(cupom)}</pre>`
      );
      printWindow.document.close();
      printWindow.print();
    }

    setVendaFinalizada(null);
    showToast("success", "Cupom enviado para impressão");
  }

  function fecharModal() {
    setVendaFinalizada(null);
    showToast("success", "Venda finalizada com sucesso!");
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-violet-900 dark:text-violet-300">
            PDV — Ponto de Venda
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Escaneie o código de barras ou busque pelo nome do produto
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-violet-100 dark:bg-violet-900/30 px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-300">
            <Keyboard className="h-3.5 w-3.5" />
            F3 Buscar
          </span>
        </div>
      </div>

      {/* Scanner de código de barras */}
      <div className="rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-700 bg-white dark:bg-[var(--card-bg)] p-4 sm:p-6">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">
          <Barcode className="h-4 w-4" />
          Leitor de código de barras
        </label>
        <input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={handleBarcodeKeyDown}
          placeholder="Aponte o leitor aqui..."
          className="w-full rounded-xl border border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-[var(--input-bg)] dark:text-slate-200 px-4 py-3 sm:py-4 text-base sm:text-lg font-mono outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-800"
          autoComplete="off"
        />
      </div>

      {/* Busca de produtos */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          ref={searchRef}
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          onFocus={handleSearchFocus}
          onBlur={() =>
            setTimeout(() => {
              setShowResults(false);
              setShowRecent(false);
            }, 200)
          }
          placeholder="Buscar por nome ou código de barras..."
          className="w-full rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--input-bg)] dark:text-slate-200 py-3 pl-11 pr-12 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-800"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1.5 pointer-events-none">
          <kbd className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 dark:text-slate-500 shadow-2xs font-semibold">F3</kbd>
        </div>
        {showResults && searchResults.length > 0 && (
          <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] shadow-lg">
            {searchResults.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => adicionarAoCarrinho(p)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-violet-50 dark:hover:bg-violet-900/20 active:bg-violet-100 dark:active:bg-violet-900/40"
                >
                  {p.imagem_url && normalizeImageUrl(p.imagem_url) ? (
                    <img
                      src={normalizeImageUrl(p.imagem_url)}
                      alt={p.nome}
                      className="h-12 w-12 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                      <ImageOff className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {p.nome}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {p.codigo_barras || "Sem código"} · {p.categoria || "Sem categoria"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.preco_venda)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Estoque: {p.estoque}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        {showRecent && !showResults && recentSearches.length > 0 && (
          <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--card-border)] px-4 py-2">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                Buscas recentes
              </span>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  localStorage.removeItem(RECENT_KEY);
                  setRecentSearches([]);
                  setShowRecent(false);
                }}
                className="rounded-xl px-2 py-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-red-500 active:scale-[0.98] transition-transform"
              >
                Limpar
              </button>
            </div>
            <ul className="max-h-64 overflow-y-auto">
              {recentSearches.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => adicionarAoCarrinho(p)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-violet-50 dark:hover:bg-violet-900/20 active:bg-violet-100 dark:active:bg-violet-900/40"
                  >
                    {p.imagem_url && normalizeImageUrl(p.imagem_url) ? (
                      <img
                        src={normalizeImageUrl(p.imagem_url)}
                        alt={p.nome}
                        className="h-10 w-10 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                        <ImageOff className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-800 dark:text-slate-200">
                        {p.nome}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {p.codigo_barras || "Sem código"}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.preco_venda)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Layout principal: Carrinho + Resumo */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Carrinho */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-4 sm:p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <ShoppingCart className={`h-5 w-5 text-violet-500 transition-transform duration-200 ${animateCart ? "scale-125 text-violet-600 animate-bounce-subtle" : ""}`} />
                <span>Itens da venda</span>
                <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/60 px-1.5 text-xs font-bold text-violet-800 dark:text-violet-200 transition-all ${animateCart ? "scale-110 bg-violet-200 dark:bg-violet-800" : ""}`}>
                  {cartTotalItems}
                </span>
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-[0.98] transition-transform"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Limpar</span>
                  <kbd className="hidden sm:inline-block rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-1 py-0.5 font-mono text-[9px] text-red-500 dark:text-red-400 font-semibold shadow-2xs ml-0.5">F5</kbd>
                </button>
              )}
            </div>
            {cart.length === 0 ? (
              <div className="py-8 sm:py-12 text-center">
                <ShoppingCart className="mx-auto mb-3 h-10 sm:h-12 w-10 sm:w-12 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Escaneie ou busque produtos para adicionar ao carrinho
                </p>
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                  Pressione <kbd className="rounded border border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-slate-700 px-1.5 py-0.5 font-mono">F3</kbd> para buscar
                </p>
              </div>
            ) : (
              <ul className="space-y-2 sm:space-y-3">
                {cart.map((item) => (
                  <li
                    key={item.produto.id}
                    className={`flex items-center gap-2 sm:gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 sm:px-4 py-3 overflow-hidden min-w-0 transition-all duration-200 ${
                      addedItemId === item.produto.id ? "animate-flash-success ring-2 ring-emerald-400" : ""
                    }`}
                  >
                    {/* Imagem - menor no mobile */}
                    {item.produto.imagem_url && normalizeImageUrl(item.produto.imagem_url) ? (
                      <img
                        src={normalizeImageUrl(item.produto.imagem_url)}
                        alt={item.produto.nome}
                        className="h-10 w-10 sm:h-14 sm:w-14 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700">
                        <ImageOff className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                    )}

                    {/* Info do produto */}
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setProdutoDetalhe(item.produto)}
                        className="font-medium text-violet-600 hover:text-violet-800 hover:underline dark:text-violet-400 dark:hover:text-violet-300 truncate block text-left text-sm sm:text-base"
                      >
                        {item.produto.nome}
                      </button>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {formatCurrency(item.produto.preco_venda)}
                      </p>
                    </div>

                    {/* Controles de quantidade - maiores no mobile */}
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      <button
                        onClick={() => updateQty(item.produto.id, -1)}
                        aria-label="Diminuir quantidade"
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white dark:bg-[var(--card-bg)] shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.98] transition-transform"
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                      <span className="w-8 text-center font-bold text-base">
                        {item.quantidade}
                      </span>
                      <button
                        onClick={() => updateQty(item.produto.id, 1)}
                        disabled={item.quantidade >= item.produto.estoque}
                        aria-label="Aumentar quantidade"
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white dark:bg-[var(--card-bg)] shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <span className="w-16 sm:w-20 text-right font-semibold text-violet-700 dark:text-violet-300 text-sm sm:text-base">
                      {formatCurrency(item.produto.preco_venda * item.quantidade)}
                    </span>

                    {/* Botão remover */}
                    <button
                      onClick={() => removeItem(item.produto.id)}
                      aria-label={`Remover ${item.produto.nome} do carrinho`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 active:scale-[0.98] transition-transform"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Resumo */}
        <div className="rounded-2xl bg-white dark:bg-[var(--card-bg)] p-4 sm:p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
          <h2 className="mb-4 font-semibold text-slate-800 dark:text-slate-200">Resumo</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>

            {/* Desconto - com ícone e atalho */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5" />
                Desconto
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  ref={descontoRef}
                  type="number"
                  min={0}
                  step={0.01}
                  value={descontoInput}
                  onChange={(e) => handleDescontoChange(e.target.value)}
                  onBlur={() => processarDesconto()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      descontoRef.current?.blur();
                    }
                  }}
                  placeholder="0,00"
                  className="w-24 rounded-xl border border-slate-200 dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200 px-2 py-1.5 text-right text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-800"
                />
                <kbd className="hidden sm:inline-block rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 dark:text-slate-500 shadow-2xs font-semibold">F2</kbd>
              </div>
            </div>

            {/* Método de pagamento */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  Pagamento
                </span>
                <select
                  value={metodoPagamento}
                  onChange={(e) => {
                    setMetodoPagamento(e.target.value);
                    if (e.target.value !== "credito") setParcelas(1);
                  }}
                  className="rounded-xl border dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200 px-2 py-1.5 text-sm"
                >
                  <option value="pix">PIX</option>
                  <option value="debito">Cartão de débito</option>
                  <option value="credito">Cartão de crédito</option>
                  <option value="dinheiro">Dinheiro</option>
                </select>
              </div>
              {metodoPagamento === "credito" && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Parcelas</span>
                  <select
                    value={parcelas}
                    onChange={(e) => setParcelas(parseInt(e.target.value))}
                  className="rounded-xl border border-slate-200 dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200 px-2 py-1.5 text-sm outline-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}x
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="border-t border-slate-200 dark:border-[var(--card-border)] pt-3 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          {/* Botão finalizar - sticky no mobile */}
          <div className="sticky bottom-0 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 mt-6 border-t border-slate-200 dark:border-[var(--card-border)] bg-white dark:bg-[var(--card-bg)] p-4 sm:p-5 sm:rounded-b-2xl">
            <button
              onClick={handleFinalizar}
              disabled={cart.length === 0 || loading}
              aria-label="Finalizar venda"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 sm:py-4 font-semibold text-white hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              <Check className="h-5 w-5" />
              {loading ? "Processando..." : "Finalizar venda"}
              <kbd className="hidden sm:inline-block rounded border border-emerald-500 bg-emerald-500/30 px-1.5 py-0.5 font-mono text-[10px] text-white shadow-2xs font-semibold ml-1">F4</kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Diálogo de confirmação */}
      <ConfirmDialog
        open={confirmOpen}
        title="Finalizar venda?"
        message={`Total: ${formatCurrency(total)}. Esta ação irá baixar o estoque dos itens.`}
        confirmLabel="Sim, finalizar"
        onConfirm={finalizarVenda}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Modal de Autorização de Desconto */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[var(--card-bg)] p-6 shadow-xl border border-slate-200/60 dark:border-[var(--card-border)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <Percent className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                Autorização de Desconto
              </h3>
              <button
                onClick={handleCancelAuth}
                className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-slate-655 dark:text-slate-400 mb-4">
              Esta operação requer privilégios de administrador. Insira a senha de um administrador para aplicar o desconto de <strong className="text-slate-850 dark:text-slate-100">{formatCurrency(pendingDesconto)}</strong>.
            </p>

            <form onSubmit={handleConfirmAuth} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Senha Admin</label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Digite a senha..."
                  className="w-full rounded-xl border border-slate-200 dark:border-[var(--card-border)] dark:bg-[var(--input-bg)] dark:text-slate-200 px-4 py-2.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-800"
                />
              </div>

              {authError && (
                <p className="text-xs font-medium text-red-655 dark:text-red-450 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-lg">
                  {authError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelAuth}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-[var(--card-border)] py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={verifyingAuth}
                  className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {verifyingAuth ? "Verificando..." : "Autorizar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de seleção de produto - Bottom Sheet no mobile */}
      {modalProdutos && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[var(--card-bg)] p-4 sm:p-6 shadow-lg animate-slide-up sm:animate-slide-in max-h-[85vh] flex flex-col">
            {/* Handle bar - apenas mobile */}
            <div className="mb-3 flex justify-center sm:hidden">
              <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                Selecione o produto
              </h3>
              <button
                onClick={() => {
                  setModalProdutos(null);
                  setSearchQuery("");
                }}
                aria-label="Fechar modal de seleção"
                className="rounded-xl p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              {modalProdutos.length} resultados para &ldquo;{searchQuery}&rdquo;
            </p>
            <ul className="flex-1 overflow-y-auto max-h-80 space-y-2">
              {modalProdutos.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => selecionarDoModal(p)}
                    aria-label={`Adicionar ${p.nome} ao carrinho`}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-100 dark:border-[var(--card-border)] px-4 py-3 text-left transition hover:border-violet-200 hover:bg-violet-50 dark:hover:bg-violet-900/20 active:bg-violet-100 dark:active:bg-violet-900/40"
                  >
                    {p.imagem_url && normalizeImageUrl(p.imagem_url) ? (
                      <img
                        src={normalizeImageUrl(p.imagem_url)}
                        alt={p.nome}
                        className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                        <ImageOff className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{p.nome}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {p.codigo_barras || "Sem código"} · {p.categoria || "Sem categoria"}
                      </p>
                    </div>
                    <div className="shrink-0 pl-4 text-right">
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.preco_venda)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Estoque: {p.estoque}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Modal de venda finalizada */}
      {vendaFinalizada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[var(--card-bg)] p-6 shadow-lg animate-slide-in">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                Venda finalizada!
              </h3>
              <button
                onClick={fecharModal}
                aria-label="Fechar modal de venda finalizada"
                className="rounded-xl p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-6 space-y-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4 text-sm">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                Venda #{String(vendaFinalizada.numero).padStart(4, "0")}
              </p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(vendaFinalizada.total)}
              </p>
              <p className="text-emerald-600 dark:text-emerald-400">
                {vendaFinalizada.metodo_pagamento}
              </p>
            </div>
            <p className="mb-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Deseja imprimir o cupom informativo?
            </p>
            <div className="flex gap-3">
              <button
                onClick={fecharModal}
                className="flex-1 rounded-xl border border-slate-200 dark:border-[var(--card-border)] py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-transform"
              >
                Não
              </button>
              <button
                onClick={imprimirCupom}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 active:scale-[0.98] transition-transform"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes do produto */}
      {produtoDetalhe && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setProdutoDetalhe(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[var(--card-bg)] p-6 shadow-lg animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                Detalhes do produto
              </h3>
              <button
                onClick={() => setProdutoDetalhe(null)}
                aria-label="Fechar detalhes do produto"
                className="rounded-xl p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-4">
              {produtoDetalhe.imagem_url && normalizeImageUrl(produtoDetalhe.imagem_url) ? (
                <img
                  src={normalizeImageUrl(produtoDetalhe.imagem_url)}
                  alt={produtoDetalhe.nome}
                  className="h-40 w-40 sm:h-48 sm:w-48 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-40 w-40 sm:h-48 sm:w-48 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
                  <ImageOff className="h-12 w-12 text-slate-400 dark:text-slate-500" />
                </div>
              )}
              <div className="w-full text-center">
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {produtoDetalhe.nome}
                </p>
                {produtoDetalhe.descricao && (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {produtoDetalhe.descricao}
                  </p>
                )}
                <p className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(produtoDetalhe.preco_venda)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setProdutoDetalhe(null)}
              className="mt-6 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 active:scale-[0.98] transition-transform"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Botão flutuante de atalhos */}
      <ShortcutHelp shortcuts={shortcuts} />
    </div>
  );
}
