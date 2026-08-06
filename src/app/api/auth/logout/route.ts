import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { requireAuth } from "@/lib/auth";

export async function POST() {
  try {
    await requireAuth();
    await clearSession();
    return NextResponse.json({ ok: true });
  } catch {
    await clearSession();
    return NextResponse.json({ ok: true });
  }
}
