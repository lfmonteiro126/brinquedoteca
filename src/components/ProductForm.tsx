"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { normalizeImageUrl } from "@/lib/format";

function generateBarcode(): string {
  const prefix = "AAK";
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prefix}${timestamp}${random}`;
}

interface ProductFormProps {
  initial?: {
    id?: number;
    nome: string;
    descricao?: string;
    imagem_url?: string;
    codigo_barras: string;
    categoria: string;
    preco_custo: number;
    preco_venda: number;
    estoque: number;
    estoque_minimo: number;
  };
  isEdit?: boolean;
}

export function ProductForm({ initial, isEdit }: ProductFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    nome: initial?.nome || "",
    descricao: initial?.descricao || "",
    imagem_url: initial?.imagem_url || "",
    codigo_barras: initial?.codigo_barras || "",
    categoria: initial?.categoria || "",
    preco_custo: initial?.preco_custo ?? 0,
    preco_venda: initial?.preco_venda ?? 0,
    estoque: initial?.estoque ?? 0,
    estoque_minimo: initial?.estoque_minimo ?? 5,
    ajuste_motivo: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleGenerateBarcode() {
    update("codigo_barras", generateBarcode());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = isEdit ? `/api/produtos/${initial?.id}` : "/api/produtos";
    const method = isEdit ? "PUT" : "POST";

    const body = isEdit
      ? {
          ...form,
          imagem_url: normalizeImageUrl(form.imagem_url),
          ajuste_estoque: form.estoque !== initial?.estoque,
          ajuste_quantidade: Math.abs(form.estoque - (initial?.estoque ?? 0)),
          ajuste_tipo: form.estoque >= (initial?.estoque ?? 0) ? "entrada" : "saida",
        }
      : { ...form, imagem_url: normalizeImageUrl(form.imagem_url) };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    router.push("/produtos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-sm">
      <div>
        <label className="mb-1 block text-sm font-medium">Nome *</label>
        <input
          required
          value={form.nome}
          onChange={(e) => update("nome", e.target.value)}
          className="w-full rounded-xl border px-4 py-2.5 outline-none focus:border-violet-400"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Descrição</label>
        <textarea
          value={form.descricao}
          onChange={(e) => update("descricao", e.target.value)}
          className="w-full rounded-xl border px-4 py-2.5 outline-none focus:border-violet-400"
          placeholder="Detalhes do brinquedo para catálogo"
          rows={3}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">URL da Imagem</label>
        <input
          value={form.imagem_url}
          onChange={(e) => update("imagem_url", e.target.value)}
          className="w-full rounded-xl border px-4 py-2.5 outline-none focus:border-violet-400"
          placeholder="https://exemplo.com/imagem.jpg"
        />
        {form.imagem_url && (
          <div className="mt-2">
            {normalizeImageUrl(form.imagem_url) ? (
              <img
                src={normalizeImageUrl(form.imagem_url)}
                alt="Preview"
                className="h-24 w-24 rounded-xl object-cover border border-slate-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <p className="text-xs text-amber-600">
                Link de álbum do Imgur não pode ser exibido diretamente. Use o link direto da imagem (i.imgur.com/xxx.jpg).
              </p>
            )}
          </div>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Código de barras</label>
        <div className="flex gap-2">
          <input
            value={form.codigo_barras}
            onChange={(e) => update("codigo_barras", e.target.value)}
            className="w-full rounded-xl border px-4 py-2.5 font-mono outline-none focus:border-violet-400"
            placeholder="Escaneie, digite ou gere um código"
          />
          <button
            type="button"
            onClick={handleGenerateBarcode}
            className="shrink-0 flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-100"
            title="Gerar código automaticamente"
          >
            <RefreshCw className="h-4 w-4" />
            Gerar
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-400">Código único para impressão de etiquetas e busca</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Categoria</label>
        <input
          value={form.categoria}
          onChange={(e) => update("categoria", e.target.value)}
          className="w-full rounded-xl border px-4 py-2.5 outline-none focus:border-violet-400"
          placeholder="Ex: Bonecas, Carrinhos, Educativos"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Preço de custo (R$)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.preco_custo}
            onChange={(e) => update("preco_custo", parseFloat(e.target.value) || 0)}
            className="w-full rounded-xl border px-4 py-2.5 outline-none focus:border-violet-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Preço de venda (R$)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={form.preco_venda}
            onChange={(e) => update("preco_venda", parseFloat(e.target.value) || 0)}
            className="w-full rounded-xl border px-4 py-2.5 outline-none focus:border-violet-400"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            {isEdit ? "Estoque atual" : "Quantidade inicial"}
          </label>
          <input
            type="number"
            min={0}
            value={form.estoque}
            onChange={(e) => update("estoque", parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-xl border px-4 py-2.5 outline-none focus:border-violet-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Estoque mínimo (alerta)</label>
          <input
            type="number"
            min={0}
            value={form.estoque_minimo}
            onChange={(e) => update("estoque_minimo", parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-xl border px-4 py-2.5 outline-none focus:border-violet-400"
          />
        </div>
      </div>
      {isEdit && form.estoque !== initial?.estoque && (
        <div>
          <label className="mb-1 block text-sm font-medium text-amber-700">
            Motivo do ajuste de estoque *
          </label>
          <input
            required
            value={form.ajuste_motivo}
            onChange={(e) => update("ajuste_motivo", e.target.value)}
            className="w-full rounded-xl border border-amber-200 px-4 py-2.5 outline-none focus:border-amber-400"
            placeholder="Ex: reposição de fornecedor, produto danificado"
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-violet-600 px-6 py-2.5 font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {loading ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border px-6 py-2.5 text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
