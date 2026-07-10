import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { IdleTimer } from "@/components/IdleTimer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GlobalSearch } from "@/components/GlobalSearch";
import { RoutePreloader } from "@/components/RoutePreloader";
import type { UserRole } from "@/lib/types";

export async function AppShell({
  children,
  allowedRoles = ["admin", "vendedor"],
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.primeiro_login) redirect("/trocar-senha");
  if (!allowedRoles.includes(user.role)) {
    redirect(user.role === "admin" ? "/" : "/vendas");
  }

  return (
    <ThemeProvider>
      <div className="min-h-dvh overflow-x-hidden bg-gradient-to-br from-violet-50 via-white to-amber-50 dark:from-[var(--background)] dark:via-[var(--background)] dark:to-[var(--background)]">
        <Nav user={user} />
        <main id="main-content" tabIndex={-1} className="min-h-dvh p-4 pt-16 overflow-x-hidden min-w-0 lg:pl-72 lg:pr-8 lg:pb-8 lg:pt-8 animate-fade-in">
          {children}
        </main>
        <GlobalSearch />
        <RoutePreloader />
        <IdleTimer />
      </div>
    </ThemeProvider>
  );
}
