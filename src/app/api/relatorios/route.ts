import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") || "vendas_periodo";
    const desde = searchParams.get("desde") || "";
    const ate = searchParams.get("ate") || "";
    const agrupar = searchParams.get("agrupar") || "dia";

    const dateFilter = buildDateFilter(desde, ate);

    switch (tipo) {
      case "vendas_periodo":
        return NextResponse.json({ dados: queryVendasPorPeriodo(db, dateFilter, agrupar) });
      case "vendas_categoria":
        return NextResponse.json({ dados: queryVendasPorCategoria(db, dateFilter) });
      case "vendas_funcionario":
        return NextResponse.json({ dados: queryVendasPorFuncionario(db, dateFilter) });
      case "produtos_mais_vendidos":
        return NextResponse.json({ dados: queryProdutosMaisVendidos(db, dateFilter) });
      case "margem_lucro":
        return NextResponse.json({ dados: queryMargemLucro(db, dateFilter) });
      case "resumo":
        return NextResponse.json({ dados: queryResumo(db, dateFilter) });
      default:
        return NextResponse.json({ error: "Tipo de relatório inválido" }, { status: 400 });
    }
  } catch (error) {
    return handleApiError(error);
  }
}

function buildDateFilter(desde: string, ate: string) {
  const conditions: string[] = [];
  const params: string[] = [];
  if (desde) {
    conditions.push("date(v.created_at) >= date(?)");
    params.push(desde);
  }
  if (ate) {
    conditions.push("date(v.created_at) <= date(?)");
    params.push(ate);
  }
  return { where: conditions.length ? "AND " + conditions.join(" AND ") : "", params };
}

function queryResumo(
  db: ReturnType<typeof getDb>,
  dateFilter: { where: string; params: string[] }
) {
  const totalVendas = db
    .prepare(
      `SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as valor
       FROM vendas v WHERE 1=1 ${dateFilter.where}`
    )
    .get(...dateFilter.params) as { total: number; valor: number };

  const totalItens = db
    .prepare(
      `SELECT COALESCE(SUM(vi.quantidade), 0) as total
       FROM venda_itens vi
       JOIN vendas v ON v.id = vi.venda_id
       WHERE 1=1 ${dateFilter.where}`
    )
    .get(...dateFilter.params) as { total: number };

  const ticketMedio = totalVendas.total > 0 ? totalVendas.valor / totalVendas.total : 0;

  const totalDescontos = db
    .prepare(
      `SELECT COALESCE(SUM(desconto), 0) as total
       FROM vendas v WHERE 1=1 ${dateFilter.where}`
    )
    .get(...dateFilter.params) as { total: number };

  return {
    totalVendas: totalVendas.total,
    valorTotal: totalVendas.valor,
    ticketMedio,
    totalItens: totalItens.total,
    totalDescontos: totalDescontos.total,
  };
}

function queryVendasPorPeriodo(
  db: ReturnType<typeof getDb>,
  dateFilter: { where: string; params: string[] },
  agrupar: string
) {
  let groupBy: string;

  switch (agrupar) {
    case "semana":
      groupBy = "strftime('%Y-W%W', v.created_at)";
      break;
    case "mes":
      groupBy = "strftime('%Y-%m', v.created_at)";
      break;
    default:
      groupBy = "date(v.created_at)";
  }

  return db
    .prepare(
      `SELECT ${groupBy} as periodo,
              COUNT(*) as vendas,
              COALESCE(SUM(v.total), 0) as valor
       FROM vendas v
       WHERE 1=1 ${dateFilter.where}
       GROUP BY periodo
       ORDER BY periodo ASC`
    )
    .all(...dateFilter.params);
}

function queryVendasPorCategoria(
  db: ReturnType<typeof getDb>,
  dateFilter: { where: string; params: string[] }
) {
  return db
    .prepare(
      `SELECT COALESCE(p.categoria, 'Sem categoria') as categoria,
              COUNT(DISTINCT v.id) as vendas,
              COALESCE(SUM(vi.subtotal), 0) as valor,
              COALESCE(SUM(vi.quantidade), 0) as quantidade
       FROM venda_itens vi
       JOIN vendas v ON v.id = vi.venda_id
       JOIN produtos p ON p.id = vi.produto_id
       WHERE 1=1 ${dateFilter.where}
       GROUP BY categoria
       ORDER BY valor DESC`
    )
    .all(...dateFilter.params);
}

function queryVendasPorFuncionario(
  db: ReturnType<typeof getDb>,
  dateFilter: { where: string; params: string[] }
) {
  return db
    .prepare(
      `SELECT u.nome as funcionario,
              u.id as usuario_id,
              COUNT(*) as vendas,
              COALESCE(SUM(v.total), 0) as valor,
              COALESCE(AVG(v.total), 0) as ticket_medio
       FROM vendas v
       JOIN users u ON u.id = v.usuario_id
       WHERE 1=1 ${dateFilter.where}
       GROUP BY v.usuario_id
       ORDER BY valor DESC`
    )
    .all(...dateFilter.params);
}

function queryProdutosMaisVendidos(
  db: ReturnType<typeof getDb>,
  dateFilter: { where: string; params: string[] }
) {
  return db
    .prepare(
      `SELECT p.nome as produto,
              p.categoria,
              p.preco_custo,
              p.preco_venda,
              COALESCE(SUM(vi.quantidade), 0) as quantidade_vendida,
              COALESCE(SUM(vi.subtotal), 0) as receita_total
       FROM venda_itens vi
       JOIN vendas v ON v.id = vi.venda_id
       JOIN produtos p ON p.id = vi.produto_id
       WHERE 1=1 ${dateFilter.where}
       GROUP BY vi.produto_id
       ORDER BY quantidade_vendida DESC`
    )
    .all(...dateFilter.params);
}

function queryMargemLucro(
  db: ReturnType<typeof getDb>,
  dateFilter: { where: string; params: string[] }
) {
  const rows = db
    .prepare(
      `SELECT p.nome as produto,
              p.categoria,
              p.preco_custo,
              p.preco_venda,
              COALESCE(SUM(vi.quantidade), 0) as quantidade_vendida,
              COALESCE(SUM(vi.subtotal), 0) as receita_total,
              COALESCE(SUM(vi.quantidade * p.preco_custo), 0) as custo_total
       FROM venda_itens vi
       JOIN vendas v ON v.id = vi.venda_id
       JOIN produtos p ON p.id = vi.produto_id
       WHERE 1=1 ${dateFilter.where}
       GROUP BY vi.produto_id
       ORDER BY receita_total DESC`
    )
    .all(...dateFilter.params) as Array<{
    produto: string;
    categoria: string;
    preco_custo: number;
    preco_venda: number;
    quantidade_vendida: number;
    receita_total: number;
    custo_total: number;
  }>;

  return rows.map((r) => ({
    ...r,
    lucro: r.receita_total - r.custo_total,
    margem: r.receita_total > 0 ? ((r.receita_total - r.custo_total) / r.receita_total) * 100 : 0,
  }));
}
