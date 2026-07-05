"use client";

import { useState } from "react";
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
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendas", label: "PDV / Vendas", icon: ShoppingCart },
  { href: "/produtos", label: "Brinquedos", icon: Package },
  { href: "/vendas/historico", label: "Histórico", icon: ClipboardList },
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

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

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
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 lg:hidden"
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
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300"
                    : "text-slate-600 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-violet-100 dark:border-[var(--sidebar-border)] p-4 space-y-2">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Tema claro" : "Tema escuro"}
          </button>
          <Link
            href="/perfil"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300"
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
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
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
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-xl bg-white dark:bg-[var(--card-bg)] p-2.5 shadow-lg shadow-slate-200/50 dark:shadow-black/20 border border-slate-100 dark:border-[var(--card-border)] lg:hidden"
      >
        <Menu className="h-5 w-5 text-violet-700 dark:text-violet-400" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-violet-100 dark:border-[var(--sidebar-border)] bg-white dark:bg-[var(--sidebar-bg)] transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {navContent()}
      </aside>
    </>
  );
}
