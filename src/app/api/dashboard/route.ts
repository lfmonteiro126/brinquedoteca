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

    const data: DashboardData = {} as DashboardData;

    data.vendasHoje = db
      .prepare(
        `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as quantidade
         FROM vendas WHERE date(created_at) = date('now', 'localtime')`
      )
      .get() as DashboardData["vendasHoje"];

    if (periodoNum <= 30) {
      data.vendasPeriodo = db
        .prepare(
          `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as quantidade
           FROM vendas
           WHERE date(created_at) >= date('now', 'localtime', '-${periodoNum} days')`
        )
        .get() as DashboardData["vendasPeriodo"];
    }

    data.produtosEstoque = db
      .prepare("SELECT COUNT(*) as count FROM produtos WHERE ativo = 1 AND estoque > 0")
      .get() as DashboardData["produtosEstoque"];

    data.produtosEstoqueBaixo = db
      .prepare(
        "SELECT * FROM produtos WHERE ativo = 1 AND estoque <= estoque_minimo ORDER BY estoque ASC LIMIT 10"
      )
      .all() as DashboardData["produtosEstoqueBaixo"];

    const vendasRecentes = db
      .prepare(
        `SELECT v.*, u.nome as usuario_nome
         FROM vendas v JOIN users u ON u.id = v.usuario_id
         WHERE date(v.created_at) >= date('now', 'localtime', '-${periodoNum} days')
         ORDER BY v.created_at DESC LIMIT 5`
      )
      .all() as DashboardData["vendasRecentes"];
    data.vendasRecentes = vendasRecentes;

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
