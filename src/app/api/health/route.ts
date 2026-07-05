import { NextResponse } from "next/server";
import { getClient } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const start = Date.now();
    await getClient().unsafe("SELECT 1");
    const ms = Date.now() - start;
    return NextResponse.json({ ok: true, db: ms });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
