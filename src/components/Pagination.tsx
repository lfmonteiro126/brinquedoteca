"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, total, pageSize, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <p className="text-slate-500">
        {total} registro{total !== 1 ? "s" : ""} · Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-1" role="navigation" aria-label="Paginação">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-1 text-slate-400">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-label={`Página ${p}`}
              aria-current={p === page ? "page" : undefined}
              className={`min-w-[32px] rounded-lg px-2 py-1 text-sm font-medium ${
                p === page
                  ? "bg-violet-100 text-violet-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Próxima página"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
