import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sqlGet, sqlAll } from "@/lib/db";
import type { DashboardData } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get("periodo") || "7";
    const periodoNum = parseInt(periodo, 10);

    const vendasHoje = await sqlGet`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as quantidade
      FROM vendas WHERE created_at >= CURRENT_DATE AND created_at < (CURRENT_DATE + interval '1 day')
    ` as { total: number; quantidade: number } | undefined;

    const vendasPeriodo = await sqlGet`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as quantidade
      FROM vendas
      WHERE created_at >= (NOW() - make_interval(days => ${periodoNum}))
    ` as { total: number; quantidade: number } | undefined;

    const periodoAnterior = await sqlGet`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as quantidade
      FROM vendas
      WHERE created_at >= (NOW() - make_interval(days => ${periodoNum * 2}))
        AND created_at < (NOW() - make_interval(days => ${periodoNum}))
    ` as { total: number; quantidade: number } | undefined;

    const vendasPorHora = await sqlAll`
      SELECT EXTRACT(HOUR FROM created_at)::integer as hora,
              COALESCE(SUM(total), 0) as total,
              COUNT(*) as quantidade
       FROM vendas
       WHERE created_at >= (NOW() - make_interval(days => ${periodoNum}))
       GROUP BY hora
       ORDER BY hora ASC
    ` as { hora: number; total: number; quantidade: number }[];

    const itensPeriodo = await sqlGet`
      SELECT COALESCE(SUM(vi.quantidade), 0) as total_itens
      FROM venda_itens vi
      JOIN vendas v ON v.id = vi.venda_id
      WHERE v.created_at >= (NOW() - make_interval(days => ${periodoNum}))
    ` as { total_itens: number } | undefined;

    const estornosPeriodo = await sqlGet`
      SELECT COUNT(*) as total
      FROM movimentacoes
      WHERE tipo = 'estorno'
        AND created_at >= (NOW() - make_interval(days => ${periodoNum}))
    ` as { total: number } | undefined;

    const ticketMedio = (vendasPeriodo?.quantidade ?? 0) > 0
      ? (vendasPeriodo?.total ?? 0) / (vendasPeriodo?.quantidade ?? 1) : 0;
    const itensPorVenda = (vendasPeriodo?.quantidade ?? 0) > 0
      ? (itensPeriodo?.total_itens ?? 0) / (vendasPeriodo?.quantidade ?? 1) : 0;
    const vendasComEstorno = (vendasPeriodo?.quantidade ?? 0) + (estornosPeriodo?.total ?? 0);
    const taxaDevolucao = vendasComEstorno > 0
      ? ((estornosPeriodo?.total ?? 0) / vendasComEstorno) * 100 : 0;

    const produtosEstoque = await sqlGet`
      SELECT COUNT(*) as count FROM produtos WHERE ativo = true AND estoque > 0
    ` as { count: number } | undefined;

    const produtosEstoqueBaixo = await sqlAll`
      SELECT * FROM produtos WHERE ativo = true AND estoque <= estoque_minimo
      ORDER BY estoque ASC LIMIT 10
    `;

    const vendasRecentes = await sqlAll`
      SELECT v.*, u.nome as usuario_nome
      FROM vendas v JOIN users u ON u.id = v.usuario_id
      WHERE v.created_at >= (NOW() - make_interval(days => ${periodoNum}))
      ORDER BY v.created_at DESC LIMIT 5
    `;

    const topProdutos = await sqlAll`
      SELECT p.nome as produto_nome, SUM(vi.quantidade) as total_vendido
      FROM venda_itens vi
      JOIN produtos p ON p.id = vi.produto_id
      JOIN vendas v ON v.id = vi.venda_id
      WHERE v.created_at >= (NOW() - make_interval(days => ${periodoNum}))
      GROUP BY p.id
      ORDER BY total_vendido DESC
      LIMIT 5
    `;

    const data: DashboardData = {
      vendasHoje: vendasHoje ?? { total: 0, quantidade: 0 },
      vendasPeriodo: vendasPeriodo ?? { total: 0, quantidade: 0 },
      periodoAnterior: periodoAnterior ?? { total: 0, quantidade: 0 },
      produtosEstoque: produtosEstoque?.count ?? 0,
      produtosEstoqueBaixo: produtosEstoqueBaixo as unknown as DashboardData["produtosEstoqueBaixo"],
      vendasRecentes: vendasRecentes as unknown as DashboardData["vendasRecentes"],
      topProdutos: topProdutos as unknown as DashboardData["topProdutos"],
      vendasPorHora,
      kpis: { ticketMedio, itensPorVenda, taxaDevolucao },
    };

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
