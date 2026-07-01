"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Plus, Search } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Produto } from "@/lib/types";

export function ProdutosView({ isAdmin }: { isAdmin: boolean }) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(search = q) {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    const res = await fetch(`/api/produtos?${params}`);
    const data = await res.json();
    setProdutos(data.produtos || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-violet-900">Brinquedos</h1>
          <p className="text-slate-500">Cadastro e controle de estoque</p>
        </div>
        {isAdmin && (
          <Link
            href="/produtos/novo"
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            Novo brinquedo
          </Link>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Buscar por nome, código de barras ou categoria..."
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none focus:border-violet-400"
        />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-violet-50 text-left text-violet-800">
            <tr>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3">Estoque</th>
              {isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            ) : produtos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Nenhum produto encontrado
                </td>
              </tr>
            ) : (
              produtos.map((p) => {
                const baixo = p.estoque <= p.estoque_minimo;
                return (
                  <tr key={p.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">{p.nome}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {p.codigo_barras || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.categoria || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">
                      {formatCurrency(p.preco_venda)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${
                          baixo ? "text-amber-600" : "text-slate-700"
                        }`}
                      >
                        {baixo && <AlertTriangle className="h-3.5 w-3.5" />}
                        {p.estoque}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/produtos/${p.id}/editar`}
                          className="text-violet-600 hover:underline"
                        >
                          Editar
                        </Link>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
