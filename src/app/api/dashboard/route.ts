import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { DashboardData } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get("periodo") || "7";
    const periodoNum = parseInt(periodo, 10);

    const vendasHoje = db
      .prepare(
        `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as quantidade
         FROM vendas WHERE created_at >= date('now', 'localtime') AND created_at < date('now', 'localtime', '+1 day')`
      )
      .get() as DashboardData["vendasHoje"];

    const vendasPeriodo = db
      .prepare(
        `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as quantidade
         FROM vendas
         WHERE created_at >= date('now', 'localtime', '-${periodoNum} days')`
      )
      .get() as DashboardData["vendasPeriodo"];

    const periodoAnterior = db
      .prepare(
        `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as quantidade
         FROM vendas
         WHERE created_at >= date('now', 'localtime', '-${periodoNum * 2} days')
           AND created_at < date('now', 'localtime', '-${periodoNum} days')`
      )
      .get() as DashboardData["periodoAnterior"];

    const vendasPorHora = db
      .prepare(
        `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hora,
                COALESCE(SUM(total), 0) as total,
                COUNT(*) as quantidade
         FROM vendas
         WHERE created_at >= date('now', 'localtime', '-${periodoNum} days')
         GROUP BY hora
         ORDER BY hora ASC`
      )
      .all() as DashboardData["vendasPorHora"];

    const itensPeriodo = db
      .prepare(
        `SELECT COALESCE(SUM(vi.quantidade), 0) as total_itens
         FROM venda_itens vi
         JOIN vendas v ON v.id = vi.venda_id
         WHERE v.created_at >= date('now', 'localtime', '-${periodoNum} days')`
      )
      .get() as { total_itens: number };

    const estornosPeriodo = db
      .prepare(
        `SELECT COUNT(*) as total
         FROM movimentacoes
         WHERE tipo = 'estorno'
           AND created_at >= date('now', 'localtime', '-${periodoNum} days')`
      )
      .get() as { total: number };

    const ticketMedio = vendasPeriodo.quantidade > 0
      ? vendasPeriodo.total / vendasPeriodo.quantidade : 0;
    const itensPorVenda = vendasPeriodo.quantidade > 0
      ? itensPeriodo.total_itens / vendasPeriodo.quantidade : 0;
    const vendasComEstorno = vendasPeriodo.quantidade + estornosPeriodo.total;
    const taxaDevolucao = vendasComEstorno > 0
      ? (estornosPeriodo.total / vendasComEstorno) * 100 : 0;

    const data: DashboardData = {
      vendasHoje,
      vendasPeriodo,
      periodoAnterior,
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
           WHERE v.created_at >= date('now', 'localtime', '-${periodoNum} days')
           ORDER BY v.created_at DESC LIMIT 5`
        )
        .all() as DashboardData["vendasRecentes"],
      topProdutos: db
        .prepare(
          `SELECT p.nome as produto_nome, SUM(vi.quantidade) as total_vendido
           FROM venda_itens vi
           JOIN produtos p ON p.id = vi.produto_id
           JOIN vendas v ON v.id = vi.venda_id
           WHERE v.created_at >= date('now', 'localtime', '-${periodoNum} days')
           GROUP BY p.id
           ORDER BY total_vendido DESC
           LIMIT 5`
        )
        .all() as DashboardData["topProdutos"],
      vendasPorHora,
      kpis: { ticketMedio, itensPorVenda, taxaDevolucao },
    };

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
