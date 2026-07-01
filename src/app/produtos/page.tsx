import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ProdutosView } from "@/components/ProdutosView";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Brinquedos | Brinquedoteca",
};

export default async function ProdutosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShell>
      <ProdutosView isAdmin={user.role === "admin"} />
    </AppShell>
  );
}
