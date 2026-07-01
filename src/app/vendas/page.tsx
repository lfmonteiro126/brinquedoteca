import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { POSView } from "@/components/POSView";

export const metadata: Metadata = {
  title: "PDV | Brinquedoteca",
};

export default function VendasPage() {
  return (
    <AppShell>
      <POSView />
    </AppShell>
  );
}
