"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Upload, Trash2, Link as LinkIcon } from "lucide-react";
import { normalizeImageUrl } from "@/lib/format";

function generateBarcode(): string {
  const prefix = "AAK";
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prefix}${timestamp}${random}`;
}

function compressImage(file: File, maxWidth = 400, maxHeight = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Não foi possível obter o contexto 2D do Canvas"));
          return;
        }

        // Preenche o fundo com branco para manter transparências em PNG limpas
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Exporta como JPEG com 80% de qualidade
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Erro ao carregar a imagem"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo"));
    reader.readAsDataURL(file);
  });
}

function getBase64SizeKb(base64: string): number {
  if (!base64 || !base64.startsWith("data:")) return 0;
  const stringLength = base64.split(",")[1]?.length || 0;
  const sizeInBytes = Math.round((stringLength * 3) / 4);
  return Math.round(sizeInBytes / 1024);
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

  // Determinar aba padrão de imagem baseada na inicial
  const isBase64 = initial?.imagem_url?.startsWith("data:image/");
  const isExternalUrl = initial?.imagem_url && !isBase64;
  const [imageTab, setImageTab] = useState<"upload" | "url">(isExternalUrl ? "url" : "upload");
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await processImageFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processImageFile(file);
    }
  };

  async function processImageFile(file: File) {
    try {
      setError("");
      setLoading(true);
      const compressedBase64 = await compressImage(file);
      update("imagem_url", compressedBase64);
    } catch (err) {
      console.error(err);
      setError("Erro ao processar imagem. Tente outro arquivo.");
    } finally {
      setLoading(false);
    }
  }

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
        <label className="mb-2 block text-sm font-medium">Imagem do Produto</label>
        
        {/* Tabs para alternar entre Upload e URL */}
        <div className="mb-3 flex border-b text-sm">
          <button
            type="button"
            onClick={() => setImageTab("upload")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 font-medium transition-colors ${
              imageTab === "upload"
                ? "border-violet-600 text-violet-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Upload className="h-4 w-4" />
            Fazer Upload
          </button>
          <button
            type="button"
            onClick={() => setImageTab("url")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 font-medium transition-colors ${
              imageTab === "url"
                ? "border-violet-600 text-violet-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <LinkIcon className="h-4 w-4" />
            Link da Web
          </button>
        </div>

        {imageTab === "upload" ? (
          <div className="space-y-3">
            {form.imagem_url && form.imagem_url.startsWith("data:image/") ? (
              <div className="relative flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <img
                  src={form.imagem_url}
                  alt="Preview do produto"
                  className="h-20 w-20 rounded-lg object-cover border bg-white shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-slate-700">Imagem otimizada</p>
                  <p className="text-xs text-slate-500">
                    Tamanho aproximado: <span className="font-semibold text-violet-600">{getBase64SizeKb(form.imagem_url)} KB</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => update("imagem_url", "")}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500 transition-colors"
                  title="Remover imagem"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-8 px-4 transition-all cursor-pointer ${
                  isDragging
                    ? "border-violet-400 bg-violet-50/50 text-violet-600 scale-[0.99]"
                    : "border-slate-200 hover:border-violet-300 hover:bg-slate-50/50 text-slate-500"
                }`}
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="mb-2 rounded-full bg-slate-100 p-3 text-slate-600 transition-transform duration-200">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-center">
                  Arraste e solte uma imagem aqui ou clique para selecionar
                </p>
                <p className="mt-1 text-xs text-slate-400 text-center">
                  Imagens pequenas (JPG, PNG ou WEBP). Otimização automática ativa.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <input
              value={form.imagem_url && !form.imagem_url.startsWith("data:image/") ? form.imagem_url : ""}
              onChange={(e) => update("imagem_url", e.target.value)}
              className="w-full rounded-xl border px-4 py-2.5 outline-none focus:border-violet-400 text-sm"
              placeholder="https://exemplo.com/imagem.jpg"
            />
            {form.imagem_url && !form.imagem_url.startsWith("data:image/") && (
              <div className="mt-2">
                {normalizeImageUrl(form.imagem_url) ? (
                  <div className="relative flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <img
                      src={normalizeImageUrl(form.imagem_url)}
                      alt="Preview"
                      className="h-20 w-20 rounded-lg object-cover border bg-white shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-slate-700">Link Externo</p>
                      <p className="text-xs text-slate-500 truncate">{form.imagem_url}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => update("imagem_url", "")}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500 transition-colors"
                      title="Remover imagem"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600">
                    Link de álbum do Imgur não pode ser exibido diretamente. Use o link direto da imagem (i.imgur.com/xxx.jpg).
                  </p>
                )}
              </div>
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
