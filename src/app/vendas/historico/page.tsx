import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { VendasHistoricoView } from "@/components/VendasHistoricoView";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Histórico | Brinquedoteca",
};

export default async function HistoricoPage() {
  const user = await getSessionUser();
  const isAdmin = user?.role === "admin";

  return (
    <AppShell allowedRoles={["admin", "vendedor"]}>
      <VendasHistoricoView isAdmin={isAdmin} breadcrumbs={[{ label: "Histórico" }]} />
    </AppShell>
  );
}
