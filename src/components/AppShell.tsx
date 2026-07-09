import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { IdleTimer } from "@/components/IdleTimer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { GlobalSearch } from "@/components/GlobalSearch";
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
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50 dark:from-[var(--background)] dark:via-[var(--background)] dark:to-[var(--background)]">
        <Nav user={user} />
        <main className="min-h-screen p-4 pt-16 lg:pl-72 lg:pr-8 lg:pb-8 lg:pt-8">{children}</main>
        <GlobalSearch />
        <IdleTimer />
      </div>
    </ThemeProvider>
  );
}
