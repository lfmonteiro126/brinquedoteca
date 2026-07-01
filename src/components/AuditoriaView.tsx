"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/format";
import type { Movimentacao } from "@/lib/types";

const tipoLabels: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
  venda: "Venda",
  inventario: "Inventário",
};

const tipoColors: Record<string, string> = {
  entrada: "bg-emerald-100 text-emerald-700",
  saida: "bg-red-100 text-red-700",
  ajuste: "bg-blue-100 text-blue-700",
  venda: "bg-violet-100 text-violet-700",
  inventario: "bg-amber-100 text-amber-700",
};

export function AuditoriaView() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auditoria?limit=200")
      .then((r) => r.json())
      .then((d) => setMovimentacoes(d.movimentacoes || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-violet-900">Auditoria</h1>
        <p className="text-slate-500">
          Histórico completo de movimentações — quem fez, quando e por quê
        </p>
      </div>

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Qtd</th>
              <th className="px-4 py-3">Estoque</th>
              <th className="px-4 py-3">Funcionário</th>
              <th className="px-4 py-3">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            ) : movimentacoes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Nenhuma movimentação registrada
                </td>
              </tr>
            ) : (
              movimentacoes.map((m) => (
                <tr key={m.id} className="border-t border-slate-50">
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                    {formatDate(m.created_at)}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{m.produto_nome}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${tipoColors[m.tipo]}`}
                    >
                      {tipoLabels[m.tipo]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-bold">{m.quantidade}</td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {m.estoque_anterior} → {m.estoque_novo}
                  </td>
                  <td className="px-4 py-2.5">{m.usuario_nome}</td>
                  <td className="px-4 py-2.5 text-slate-500">{m.motivo || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
