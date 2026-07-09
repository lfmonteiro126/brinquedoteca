import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { InventarioView } from "@/components/InventarioView";

export const metadata: Metadata = {
  title: "Inventário | Brinquedoteca",
};

export default function InventarioPage() {
  return (
    <AppShell allowedRoles={["admin"]}>
      <InventarioView breadcrumbs={[{ label: "Inventário" }]} />
    </AppShell>
  );
}
