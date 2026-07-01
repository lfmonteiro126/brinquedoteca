import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { InventarioView } from "@/components/InventarioView";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Inventário | Brinquedoteca",
};

export default async function InventarioPage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/");
  }

  return (
    <AppShell>
      <InventarioView />
    </AppShell>
  );
}
