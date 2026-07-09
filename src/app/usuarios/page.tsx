import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { UsuariosView } from "@/components/UsuariosView";

export const metadata: Metadata = {
  title: "Usuários — Brinquedoteca",
};

export default function UsuariosPage() {
  return (
    <AppShell allowedRoles={["admin"]}>
      <UsuariosView breadcrumbs={[{ label: "Usuários" }]} />
    </AppShell>
  );
}
