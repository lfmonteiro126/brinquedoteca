import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { CodigoBarrasView } from "@/components/CodigoBarrasView";

export const metadata: Metadata = {
  title: "Códigos de Barras | Brinquedoteca",
};

export default function CodigosDeBarraPage() {
  return (
    <AppShell allowedRoles={["admin"]}>
      <CodigoBarrasView
        breadcrumbs={[
          { label: "Brinquedos", href: "/produtos" },
          { label: "Códigos de Barras" },
        ]}
      />
    </AppShell>
  );
}
