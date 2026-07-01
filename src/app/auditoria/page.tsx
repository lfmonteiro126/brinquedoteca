import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AuditoriaView } from "@/components/AuditoriaView";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Auditoria | Brinquedoteca",
};

export default async function AuditoriaPage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/");
  }

  return (
    <AppShell>
      <AuditoriaView />
    </AppShell>
  );
}
