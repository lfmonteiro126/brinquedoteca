import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProductForm } from "@/components/ProductForm";
import { getDb } from "@/lib/db";
import type { Produto } from "@/lib/types";

export const metadata: Metadata = {
  title: "Editar brinquedo | Brinquedoteca",
};

type Props = { params: Promise<{ id: string }> };

export default async function EditarProdutoPage({ params }: Props) {
  const { id } = await params;
  const db = getDb();
  const produto = db.prepare("SELECT * FROM produtos WHERE id = ?").get(id) as Produto | undefined;

  if (!produto) notFound();

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-violet-900">Editar brinquedo</h1>
          <p className="text-slate-500">{produto.nome}</p>
        </div>
        <ProductForm
          isEdit
          initial={{
            id: produto.id,
            nome: produto.nome,
            codigo_barras: produto.codigo_barras || "",
            categoria: produto.categoria || "",
            preco_custo: produto.preco_custo,
            preco_venda: produto.preco_venda,
            estoque: produto.estoque,
            estoque_minimo: produto.estoque_minimo,
          }}
        />
      </div>
    </AppShell>
  );
}
