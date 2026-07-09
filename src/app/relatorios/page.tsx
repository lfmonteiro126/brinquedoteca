import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { RelatoriosView } from "@/components/RelatoriosView";

export const metadata: Metadata = {
  title: "Relatórios — Brinquedoteca",
};

export default function RelatoriosPage() {
  return (
    <AppShell allowedRoles={["admin"]}>
      <RelatoriosView breadcrumbs={[{ label: "Relatórios" }]} />
    </AppShell>
  );
}
