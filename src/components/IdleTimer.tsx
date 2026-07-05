"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const IDLE_TIMEOUT = 15 * 60 * 1000;
const EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

export function IdleTimer() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function logout() {
      fetch("/api/auth/logout", { method: "POST" }).then(() => {
        router.push("/login");
        router.refresh();
      });
    }

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, IDLE_TIMEOUT);
    }

    EVENTS.forEach((event) => document.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      EVENTS.forEach((event) => document.removeEventListener(event, resetTimer));
    };
  }, [router]);

  return null;
}
