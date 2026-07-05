import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { AuditoriaView } from "@/components/AuditoriaView";

export const metadata: Metadata = {
  title: "Auditoria | Brinquedoteca",
};

export default function AuditoriaPage() {
  return (
    <AppShell allowedRoles={["admin"]}>
      <AuditoriaView />
    </AppShell>
  );
}
