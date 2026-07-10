"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Rotas críticas que devem ser pré-carregadas
const CRITICAL_ROUTES = [
  { href: "/vendas", priority: "high" as const },
  { href: "/produtos", priority: "high" as const },
  { href: "/vendas/historico", priority: "medium" as const },
];

export function RoutePreloader() {
  const pathname = usePathname();

  useEffect(() => {
    // Pré-carregar rotas críticas após 2 segundos
    const timer = setTimeout(() => {
      CRITICAL_ROUTES.forEach(({ href, priority }) => {
        // Não pré-carregar a rota atual
        if (pathname === href) return;

        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = href;
        link.as = "document";
        document.head.appendChild(link);
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [pathname]);

  // Pré-carregar rotas ao hover no menu
  useEffect(() => {
    const navLinks = document.querySelectorAll("nav a[href]");

    function handleMouseEnter(e: Event) {
      const target = e.currentTarget as HTMLAnchorElement;
      const href = target.getAttribute("href");
      if (href && href.startsWith("/") && href !== pathname) {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = href;
        link.as = "document";
        document.head.appendChild(link);
      }
    }

    navLinks.forEach((link) => {
      link.addEventListener("mouseenter", handleMouseEnter);
    });

    return () => {
      navLinks.forEach((link) => {
        link.removeEventListener("mouseenter", handleMouseEnter);
      });
    };
  }, [pathname]);

  return null;
}
