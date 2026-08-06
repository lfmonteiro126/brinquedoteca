import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getClient } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10)));
    const tipo = searchParams.get("tipo");
    const produto = searchParams.get("produto")?.trim();
    const desde = searchParams.get("desde");
    const ate = searchParams.get("ate");

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (tipo) {
      conditions.push(`m.tipo = $${paramIndex++}`);
      params.push(tipo);
    }
    if (produto) {
      conditions.push(`p.nome LIKE $${paramIndex++}`);
      params.push(`%${produto}%`);
    }
    if (desde) {
      conditions.push(`m.created_at >= $${paramIndex++}::date`);
      params.push(desde);
    }
    if (ate) {
      conditions.push(`m.created_at < ($${paramIndex++}::date + interval '1 day')`);
      params.push(ate);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const countResult = await getClient().unsafe(
      `SELECT COUNT(*) as total FROM movimentacoes m JOIN produtos p ON p.id = m.produto_id ${whereClause}`,
      params
    );

    const offset = (page - 1) * pageSize;
    const movimentacoes = await getClient().unsafe(
      `SELECT m.*, p.nome as produto_nome, u.nome as usuario_nome
       FROM movimentacoes m
       JOIN produtos p ON p.id = m.produto_id
       JOIN users u ON u.id = m.usuario_id
       ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, pageSize, offset]
    );

    return NextResponse.json({
      movimentacoes,
      total: countResult[0]?.total ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
