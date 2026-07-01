"use client";

import { Fragment, useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Venda } from "@/lib/types";

export function VendasHistoricoView() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/vendas")
      .then((r) => r.json())
      .then((d) => setVendas(d.vendas || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-violet-900">Histórico de vendas</h1>
        <p className="text-slate-500">Todas as vendas registradas no sistema</p>
      </div>

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-violet-50 text-left text-violet-800">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Desconto</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            ) : vendas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Nenhuma venda registrada
                </td>
              </tr>
            ) : (
              vendas.map((v) => (
                <Fragment key={v.id}>
                  <tr
                    className="border-t border-slate-50 cursor-pointer hover:bg-slate-50/50"
                    onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                  >
                    <td className="px-4 py-3 font-bold">#{v.numero}</td>
                    <td className="px-4 py-3">{v.usuario_nome}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">
                      {formatCurrency(v.total)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {v.desconto > 0 ? formatCurrency(v.desconto) : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(v.created_at)}</td>
                    <td className="px-4 py-3 text-violet-600">
                      {expanded === v.id ? "▲" : "▼"}
                    </td>
                  </tr>
                  {expanded === v.id && v.itens && (
                    <tr>
                      <td colSpan={6} className="bg-violet-50/50 px-8 py-3">
                        <ul className="space-y-1">
                          {v.itens.map((item) => (
                            <li key={item.id} className="flex justify-between text-sm">
                              <span>
                                {item.produto_nome} × {item.quantidade}
                              </span>
                              <span className="font-medium">
                                {formatCurrency(item.subtotal)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
