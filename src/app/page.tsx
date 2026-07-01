import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { DashboardView } from "@/components/DashboardView";

export const metadata: Metadata = {
  title: "Dashboard | Brinquedoteca",
};

export default function HomePage() {
  return (
    <AppShell>
      <DashboardView />
    </AppShell>
  );
}
