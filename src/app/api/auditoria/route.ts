import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10)));
    const tipo = searchParams.get("tipo");
    const produto = searchParams.get("produto")?.trim();
    const desde = searchParams.get("desde");
    const ate = searchParams.get("ate");

    let whereClause = "";
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (tipo) {
      conditions.push("m.tipo = ?");
      params.push(tipo);
    }
    if (produto) {
      conditions.push("p.nome LIKE ?");
      params.push(`%${produto}%`);
    }
    if (desde) {
      conditions.push("date(m.created_at) >= date(?)");
      params.push(desde);
    }
    if (ate) {
      conditions.push("date(m.created_at) <= date(?)");
      params.push(ate);
    }

    if (conditions.length > 0) {
      whereClause = "WHERE " + conditions.join(" AND ");
    }

    const countResult = db
      .prepare(
        `SELECT COUNT(*) as total
         FROM movimentacoes m
         JOIN produtos p ON p.id = m.produto_id
         ${whereClause}`
      )
      .get(...params) as { total: number };

    const offset = (page - 1) * pageSize;
    const movimentacoes = db
      .prepare(
        `SELECT m.*, p.nome as produto_nome, u.nome as usuario_nome
         FROM movimentacoes m
         JOIN produtos p ON p.id = m.produto_id
         JOIN users u ON u.id = m.usuario_id
         ${whereClause}
         ORDER BY m.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, offset);

    return NextResponse.json({
      movimentacoes,
      total: countResult.total,
      page,
      pageSize,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
