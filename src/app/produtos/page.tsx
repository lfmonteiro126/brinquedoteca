import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ProdutosView } from "@/components/ProdutosView";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Brinquedos | Brinquedoteca",
};

export default async function ProdutosPage() {
  const user = await getSessionUser();

  return (
    <AppShell allowedRoles={["admin", "vendedor"]}>
      <ProdutosView isAdmin={user?.role === "admin"} breadcrumbs={[{ label: "Brinquedos" }]} />
    </AppShell>
  );
}
