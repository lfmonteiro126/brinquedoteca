import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProductForm } from "@/components/ProductForm";
import { sqlGet } from "@/lib/db";
import type { Produto } from "@/lib/types";

export const metadata = {
  title: "Editar brinquedo | Brinquedoteca",
};

type Props = { params: Promise<{ id: string }> };

export default async function EditarProdutoPage({ params }: Props) {
  const { id } = await params;
  const produto = await sqlGet(
    "SELECT * FROM produtos WHERE id = $1",
    parseInt(id)
  ) as Produto | undefined;

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
            descricao: produto.descricao || "",
            imagem_url: produto.imagem_url || "",
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
