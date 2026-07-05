"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PerfilView } from "@/components/PerfilView";
import { Loader2 } from "lucide-react";
import type { User } from "@/lib/types";

export function PerfilClient() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch {
        router.push("/login");
      }
    }
    load();
  }, [router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return <PerfilView user={user} />;
}
