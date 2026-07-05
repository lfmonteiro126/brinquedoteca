"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[var(--background)]">
      <div className="max-w-md w-full text-center p-8">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
          Página não encontrada
        </h1>
        <p className="text-gray-600 dark:text-slate-400 mb-6">
          O endereço que você procura não existe ou foi movido.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[#ff2d55] text-white rounded-lg font-medium hover:bg-[#e0264c] transition-colors"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
