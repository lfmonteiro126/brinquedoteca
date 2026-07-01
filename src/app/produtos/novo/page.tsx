import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProductForm } from "@/components/ProductForm";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Novo brinquedo | Brinquedoteca",
};

export default async function NovoProdutoPage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/produtos");
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-violet-900">Novo brinquedo</h1>
          <p className="text-slate-500">Cadastre um produto com código de barras</p>
        </div>
        <ProductForm />
      </div>
    </AppShell>
  );
}
