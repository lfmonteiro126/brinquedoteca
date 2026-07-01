import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { VendasHistoricoView } from "@/components/VendasHistoricoView";

export const metadata: Metadata = {
  title: "Histórico | Brinquedoteca",
};

export default function HistoricoPage() {
  return (
    <AppShell>
      <VendasHistoricoView />
    </AppShell>
  );
}
