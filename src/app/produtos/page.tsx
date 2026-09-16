import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ProdutosView } from "@/components/ProdutosView";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Brinquedos | Brinquedoteca",
};

type Props = {
  searchParams: Promise<{ estoque_baixo?: string }>;
};

export default async function ProdutosPage({ searchParams }: Props) {
  const user = await getSessionUser();
  const { estoque_baixo } = await searchParams;

  return (
    <AppShell allowedRoles={["admin"]}>
      <ProdutosView
        isAdmin={user?.role === "admin"}
        breadcrumbs={[{ label: "Brinquedos" }]}
        initialStockFilter={estoque_baixo === "1" ? "low" : "all"}
      />
    </AppShell>
  );
}
