"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 overflow-x-auto">
      <Link
        href="/"
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 hover:text-violet-600 dark:hover:text-violet-400 transition-colors shrink-0"
      >
        <Home className="h-4 w-4" />
        <span className="hidden sm:inline">Home</span>
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1 shrink-0">
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
          {item.href ? (
            <Link
              href={item.href}
              className="rounded-lg px-2 py-1.5 hover:text-violet-600 dark:hover:text-violet-400 transition-colors truncate max-w-[150px] sm:max-w-none"
            >
              {item.label}
            </Link>
          ) : (
            <span className="rounded-lg px-2 py-1.5 font-medium text-slate-700 dark:text-slate-200 truncate max-w-[150px] sm:max-w-none">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
