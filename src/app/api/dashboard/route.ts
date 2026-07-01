import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { DashboardData } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get("periodo") || "7"; // padrão 7 dias

    const periodoNum = parseInt(periodo, 10);

    const data: DashboardData = {
      vendasHoje: db
        .prepare(
          `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as quantidade
           FROM vendas WHERE date(created_at) = date('now', 'localtime')`
        )
        .get() as DashboardData["vendasHoje"],
      vendasPeriodo: db
        .prepare(
          `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as quantidade
           FROM vendas
           WHERE date(created_at) >= date('now', 'localtime', '-${periodoNum} days')`
        )
        .get() as DashboardData["vendasPeriodo"],
      produtosEstoque: (db
        .prepare("SELECT COUNT(*) as count FROM produtos WHERE ativo = 1 AND estoque > 0")
        .get() as { count: number }).count,
      produtosEstoqueBaixo: db
        .prepare(
          "SELECT * FROM produtos WHERE ativo = 1 AND estoque <= estoque_minimo ORDER BY estoque ASC LIMIT 10"
        )
        .all() as DashboardData["produtosEstoqueBaixo"],
      vendasRecentes: db
        .prepare(
          `SELECT v.*, u.nome as usuario_nome
           FROM vendas v JOIN users u ON u.id = v.usuario_id
           WHERE date(v.created_at) >= date('now', 'localtime', '-${periodoNum} days')
           ORDER BY v.created_at DESC LIMIT 5`
        )
        .all() as DashboardData["vendasRecentes"],
      topProdutos: db
        .prepare(
          `SELECT p.nome as produto_nome, SUM(vi.quantidade) as total_vendido
           FROM venda_itens vi
           JOIN produtos p ON p.id = vi.produto_id
           JOIN vendas v ON v.id = vi.venda_id
           WHERE date(v.created_at) >= date('now', 'localtime', '-${periodoNum} days')
           GROUP BY p.id
           ORDER BY total_vendido DESC
           LIMIT 5`
        )
        .all() as DashboardData["topProdutos"],
    };

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
