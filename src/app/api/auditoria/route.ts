import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const movimentacoes = db
      .prepare(
        `SELECT m.*, p.nome as produto_nome, u.nome as usuario_nome
         FROM movimentacoes m
         JOIN produtos p ON p.id = m.produto_id
         JOIN users u ON u.id = m.usuario_id
         ORDER BY m.created_at DESC
         LIMIT ?`
      )
      .all(limit);

    return NextResponse.json({ movimentacoes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
