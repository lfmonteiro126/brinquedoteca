"use client";

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
} from "lucide-react";
import type { User } from "@/lib/types";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendas", label: "PDV / Vendas", icon: ShoppingCart },
  { href: "/produtos", label: "Brinquedos", icon: Package },
  { href: "/vendas/historico", label: "Histórico", icon: ClipboardList },
  { href: "/inventario", label: "Inventário", icon: ClipboardList, adminOnly: true },
  { href: "/auditoria", label: "Auditoria", icon: Shield, adminOnly: true },
];

export function Nav({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-violet-100 bg-white">
      <div className="flex items-center gap-3 border-b border-violet-100 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-white">
          <ToyBrick className="h-5 w-5" />
        </div>
        <div>
          <p className="font-bold text-violet-900">Brinquedoteca</p>
          <p className="text-xs text-violet-500">Gestão da loja</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {links
          .filter((l) => !l.adminOnly || user.role === "admin")
          .map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-violet-100 text-violet-800"
                    : "text-slate-600 hover:bg-violet-50 hover:text-violet-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-violet-100 p-4">
        <p className="truncate text-sm font-medium text-slate-800">{user.nome}</p>
        <p className="text-xs text-slate-500 capitalize">{user.role}</p>
        <button
          onClick={logout}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
