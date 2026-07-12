"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardList,
  Shield,
  LogOut,
  ToyBrick,
  Menu,
  X,
  Users,
  BarChart3,
  UserCircle,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import type { User } from "@/lib/types";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, adminOnly: true },
  { href: "/vendas", label: "PDV / Vendas", icon: ShoppingCart },
  { href: "/produtos", label: "Brinquedos", icon: Package, adminOnly: true },
  { href: "/vendas/historico", label: "Histórico", icon: ClipboardList, adminOnly: true },
  { href: "/inventario", label: "Inventário", icon: ClipboardList, adminOnly: true },
  { href: "/auditoria", label: "Auditoria", icon: Shield, adminOnly: true },
  { href: "/usuarios", label: "Usuários", icon: Users, adminOnly: true },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3, adminOnly: true },
];

export function Nav({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (deltaX < -80 && deltaY < 50) {
      setMobileOpen(false);
    }
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const filteredLinks = links.filter((l) => !l.adminOnly || user.role === "admin");

  function navContent() {
    return (
      <>
        <div className="shrink-0 flex items-center gap-3 border-b border-violet-100 dark:border-[var(--sidebar-border)] px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-white">
            <ToyBrick className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-violet-900 dark:text-violet-200 truncate">Ateliê Angels Kids</p>
            <p className="text-xs text-violet-500 dark:text-violet-400">Loja Praia Grande</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 lg:hidden active:scale-[0.98] transition-transform"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 min-h-0 space-y-1 p-3 overflow-y-auto">
          {filteredLinks.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-violet-600 dark:bg-violet-400" />
                )}
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-violet-100 dark:border-[var(--sidebar-border)] p-4 space-y-1">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300 active:scale-[0.98] transition-all"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Tema claro" : "Tema escuro"}
          </button>
          <Link
            href="/perfil"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300 active:scale-[0.98] transition-all"
          >
            <UserCircle className="h-4 w-4" />
            Meu Perfil
          </Link>
          <div className="border-t border-violet-100 dark:border-[var(--sidebar-border)] pt-2">
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{user.nome}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 active:scale-[0.98] transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Barra superior no mobile */}
      <header className="fixed top-0 left-0 right-0 z-30 h-16 flex items-center justify-between px-4 border-b border-slate-200/60 bg-white/95 backdrop-blur-md dark:border-[var(--card-border)] dark:bg-[var(--card-bg)]/95 lg:hidden shadow-xs transition-colors">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-650 hover:bg-slate-50 dark:border-slate-800 dark:bg-transparent dark:text-slate-450 dark:hover:bg-slate-800 active:scale-[0.97] transition-all cursor-pointer"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500 text-white shadow-xs">
              <ToyBrick className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm text-slate-850 dark:text-slate-100">Angels Kids</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-transparent dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.97] transition-all cursor-pointer"
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            href="/perfil"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-transparent dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.97] transition-all"
            title="Meu Perfil"
          >
            <UserCircle className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden animate-fade-in-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-violet-100 dark:border-[var(--sidebar-border)] bg-white dark:bg-[var(--sidebar-bg)] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {navContent()}
      </aside>
    </>
  );
}
