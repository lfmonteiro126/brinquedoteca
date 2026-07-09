import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { PerfilClient } from "./PerfilClient";

export const metadata: Metadata = {
  title: "Meu Perfil | Brinquedoteca",
};

export default function PerfilPage() {
  return (
    <AppShell allowedRoles={["admin", "vendedor"]}>
      <PerfilClient breadcrumbs={[{ label: "Meu Perfil" }]} />
    </AppShell>
  );
}
