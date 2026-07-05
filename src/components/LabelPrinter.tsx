"use client";

import { useEffect, useRef, useState } from "react";
import { Printer, X } from "lucide-react";
import JsBarcode from "jsbarcode";
import { formatCurrency } from "@/lib/format";
import type { Produto } from "@/lib/types";

type LabelSize = "small" | "medium" | "large";

interface LabelConfig {
  size: LabelSize;
  showPrice: boolean;
  showBarcode: boolean;
  showCategory: boolean;
  quantity: number;
}

const SIZE_CONFIG: Record<LabelSize, { width: number; height: number; label: string }> = {
  small: { width: 38, height: 25, label: "38×25mm (Jewelry)" },
  medium: { width: 50, height: 30, label: "50×30mm (Folha A4)" },
  large: { width: 70, height: 40, label: "70×40mm (Grande)" },
};

function LabelCard({ produto, config }: { produto: Produto; config: LabelConfig }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const size = SIZE_CONFIG[config.size];

  useEffect(() => {
    if (config.showBarcode && svgRef.current && produto.codigo_barras) {
      try {
        JsBarcode(svgRef.current, produto.codigo_barras, {
          format: "CODE128",
          width: 1.2,
          height: 20,
          displayValue: false,
          margin: 0,
        });
      } catch {
        if (svgRef.current) svgRef.current.innerHTML = "";
      }
    }
  }, [config.showBarcode, produto.codigo_barras]);

  return (
    <div
      className="flex flex-col items-center justify-between border border-dashed border-slate-300 bg-white p-2"
      style={{ width: size.width * 3.78, height: size.height * 3.78 }}
    >
      <div className="w-full text-center">
        <p className="truncate font-bold text-slate-800" style={{ fontSize: config.size === "small" ? 8 : config.size === "medium" ? 9 : 11 }}>
          {produto.nome}
        </p>
        {config.showCategory && produto.categoria && (
          <p className="truncate text-slate-500" style={{ fontSize: config.size === "small" ? 6 : 7 }}>
            {produto.categoria}
          </p>
        )}
      </div>
      {config.showBarcode && (
        <div className="flex justify-center">
          {produto.codigo_barras ? (
            <svg ref={svgRef} />
          ) : (
            <p className="text-[7px] text-slate-400">Sem código</p>
          )}
        </div>
      )}
      {config.showPrice && (
        <p className="font-bold text-emerald-700" style={{ fontSize: config.size === "small" ? 10 : 12 }}>
          {formatCurrency(produto.preco_venda)}
        </p>
      )}
    </div>
  );
}

export function LabelPrinter({
  produtos,
  open,
  onClose,
}: {
  produtos: Produto[];
  open: boolean;
  onClose: () => void;
}) {
  const [config, setConfig] = useState<LabelConfig>({
    size: "medium",
    showPrice: true,
    showBarcode: true,
    showCategory: false,
    quantity: 1,
  });

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  function handlePrint() {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Etiquetas</title>
          <style>
            @page { margin: 5mm; }
            body { margin: 0; font-family: sans-serif; }
            .label-grid {
              display: flex;
              flex-wrap: wrap;
              gap: 4mm;
            }
            .label-item {
              page-break-inside: avoid;
            }
            @media print {
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="padding:10px;text-align:center;border-bottom:1px solid #ddd;">
            <button onclick="window.print()" style="padding:8px 20px;font-size:14px;cursor:pointer;background:#7c3aed;color:white;border:none;border-radius:8px;">
              Imprimir
            </button>
            <button onclick="window.close()" style="padding:8px 20px;font-size:14px;cursor:pointer;margin-left:10px;border:1px solid #ddd;border-radius:8px;">
              Fechar
            </button>
          </div>
          <div id="print-content"></div>
        </body>
      </html>
    `);
    win.document.close();
    const container = win.document.getElementById("print-content");
    if (container) {
      container.innerHTML = content;
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800">Imprimir Etiquetas</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Tamanho</label>
              <select
                value={config.size}
                onChange={(e) => setConfig({ ...config, size: e.target.value as LabelSize })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                {Object.entries(SIZE_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Qtd. por produto</label>
              <input
                type="number"
                min={1}
                max={50}
                value={config.quantity}
                onChange={(e) => setConfig({ ...config, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={config.showPrice} onChange={(e) => setConfig({ ...config, showPrice: e.target.checked })} className="rounded" />
                Preço
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={config.showBarcode} onChange={(e) => setConfig({ ...config, showBarcode: e.target.checked })} className="rounded" />
                Código
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={config.showCategory} onChange={(e) => setConfig({ ...config, showCategory: e.target.checked })} className="rounded" />
                Categoria
              </label>
            </div>
          </div>

          <p className="mb-3 text-xs text-slate-400">{produtos.length} produto(s) · {config.quantity} etiqueta(s) cada · Total: {produtos.length * config.quantity}</p>

          <div ref={printRef}>
            <div className="label-grid">
              {produtos.map((p) =>
                Array.from({ length: config.quantity }).map((_, i) => (
                  <div key={`${p.id}-${i}`} className="label-item">
                    <LabelCard produto={p} config={config} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
