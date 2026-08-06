import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getClient } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") || "vendas_periodo";
    const desde = searchParams.get("desde") || "";
    const ate = searchParams.get("ate") || "";
    const agrupar = searchParams.get("agrupar") || "dia";

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (desde) {
      conditions.push(`v.created_at >= $${paramIndex++}::date`);
      params.push(desde);
    }
    if (ate) {
      conditions.push(`v.created_at < ($${paramIndex++}::date + interval '1 day')`);
      params.push(ate);
    }

    const whereClause = conditions.length > 0 ? "AND " + conditions.join(" AND ") : "";

    switch (tipo) {
      case "vendas_periodo":
        return NextResponse.json({ dados: await queryVendasPorPeriodo(whereClause, params, agrupar) });
      case "vendas_categoria":
        return NextResponse.json({ dados: await queryVendasPorCategoria(whereClause, params) });
      case "vendas_funcionario":
        return NextResponse.json({ dados: await queryVendasPorFuncionario(whereClause, params) });
      case "produtos_mais_vendidos":
        return NextResponse.json({ dados: await queryProdutosMaisVendidos(whereClause, params) });
      case "margem_lucro":
        return NextResponse.json({ dados: await queryMargemLucro(whereClause, params) });
      case "resumo":
        return NextResponse.json({ dados: await queryResumo(whereClause, params) });
      default:
        return NextResponse.json({ error: "Tipo de relatório inválido" }, { status: 400 });
    }
  } catch (error) {
    return handleApiError(error);
  }
}

async function queryResumo(whereClause: string, params: (string | number)[]) {
  const totalVendas = await getClient().unsafe(
    `SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as valor FROM vendas v WHERE true ${whereClause}`,
    params
  );

  const totalItens = await getClient().unsafe(
    `SELECT COALESCE(SUM(vi.quantidade), 0) as total FROM venda_itens vi JOIN vendas v ON v.id = vi.venda_id WHERE true ${whereClause}`,
    params
  );

  const ticketMedio = totalVendas[0]?.total > 0
    ? totalVendas[0]?.valor / totalVendas[0]?.total : 0;

  const totalDescontos = await getClient().unsafe(
    `SELECT COALESCE(SUM(desconto), 0) as total FROM vendas v WHERE true ${whereClause}`,
    params
  );

  return {
    totalVendas: totalVendas[0]?.total ?? 0,
    valorTotal: totalVendas[0]?.valor ?? 0,
    ticketMedio,
    totalItens: totalItens[0]?.total ?? 0,
    totalDescontos: totalDescontos[0]?.total ?? 0,
  };
}

async function queryVendasPorPeriodo(whereClause: string, params: (string | number)[], agrupar: string) {
  let groupBy: string;

  switch (agrupar) {
    case "semana":
      groupBy = "TO_CHAR(v.created_at, 'IYYY-IW')";
      break;
    case "mes":
      groupBy = "TO_CHAR(v.created_at, 'YYYY-MM')";
      break;
    default:
      groupBy = "v.created_at::date::text";
  }

  return getClient().unsafe(
    `SELECT ${groupBy} as periodo, COUNT(*) as vendas, COALESCE(SUM(v.total), 0) as valor
     FROM vendas v WHERE true ${whereClause} GROUP BY periodo ORDER BY periodo ASC`,
    params
  );
}

async function queryVendasPorCategoria(whereClause: string, params: (string | number)[]) {
  return getClient().unsafe(
    `SELECT COALESCE(p.categoria, 'Sem categoria') as categoria,
            COUNT(DISTINCT v.id) as vendas,
            COALESCE(SUM(vi.subtotal), 0) as valor,
            COALESCE(SUM(vi.quantidade), 0) as quantidade
     FROM venda_itens vi
     JOIN vendas v ON v.id = vi.venda_id
     JOIN produtos p ON p.id = vi.produto_id
     WHERE true ${whereClause}
     GROUP BY categoria ORDER BY valor DESC`,
    params
  );
}

async function queryVendasPorFuncionario(whereClause: string, params: (string | number)[]) {
  return getClient().unsafe(
    `SELECT u.nome as funcionario, u.id as usuario_id,
            COUNT(*) as vendas,
            COALESCE(SUM(v.total), 0) as valor,
            COALESCE(AVG(v.total), 0) as ticket_medio
     FROM vendas v
     JOIN users u ON u.id = v.usuario_id
     WHERE true ${whereClause}
     GROUP BY v.usuario_id, u.nome ORDER BY valor DESC`,
    params
  );
}

async function queryProdutosMaisVendidos(whereClause: string, params: (string | number)[]) {
  return getClient().unsafe(
    `SELECT p.nome as produto, p.categoria, p.preco_venda,
            COALESCE(SUM(vi.quantidade), 0) as quantidade_vendida,
            COALESCE(SUM(vi.subtotal), 0) as receita_total
     FROM venda_itens vi
     JOIN vendas v ON v.id = vi.venda_id
     JOIN produtos p ON p.id = vi.produto_id
     WHERE true ${whereClause}
     GROUP BY vi.produto_id, p.nome, p.categoria, p.preco_venda
     ORDER BY quantidade_vendida DESC`,
    params
  );
}

async function queryMargemLucro(whereClause: string, params: (string | number)[]) {
  const rows = await getClient().unsafe(
    `SELECT p.nome as produto, p.categoria, p.preco_custo, p.preco_venda,
            COALESCE(SUM(vi.quantidade), 0) as quantidade_vendida,
            COALESCE(SUM(vi.subtotal), 0) as receita_total,
            COALESCE(SUM(vi.quantidade * p.preco_custo), 0) as custo_total
     FROM venda_itens vi
     JOIN vendas v ON v.id = vi.venda_id
     JOIN produtos p ON p.id = vi.produto_id
     WHERE true ${whereClause}
     GROUP BY vi.produto_id, p.nome, p.categoria, p.preco_custo, p.preco_venda
     ORDER BY receita_total DESC`,
    params
  );

  return rows.map((r) => ({
    ...r,
    lucro: Number(r.receita_total) - Number(r.custo_total),
    margem: Number(r.receita_total) > 0
      ? ((Number(r.receita_total) - Number(r.custo_total)) / Number(r.receita_total)) * 100
      : 0,
  }));
}
