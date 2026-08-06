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

    const movConditions: string[] = [];
    const corrConditions: string[] = [];
    const movParams: (string | number)[] = [];
    const corrParams: (string | number)[] = [];
    let movIdx = 1;
    let corrIdx = 1;

    const includeMov = !tipo || tipo !== "correcao_venda";
    const includeCorr = !tipo || tipo === "correcao_venda";

    if (tipo && tipo !== "correcao_venda") {
      movConditions.push(`m.tipo = $${movIdx++}`);
      movParams.push(tipo);
    }
    if (produto) {
      movConditions.push(`p.nome LIKE $${movIdx++}`);
      movParams.push(`%${produto}%`);
      // correções não têm produto; filtro por produto exclui correções
    }
    if (desde) {
      movConditions.push(`m.created_at >= $${movIdx++}::date`);
      movParams.push(desde);
      corrConditions.push(`vc.created_at >= $${corrIdx++}::date`);
      corrParams.push(desde);
    }
    if (ate) {
      movConditions.push(`m.created_at < ($${movIdx++}::date + interval '1 day')`);
      movParams.push(ate);
      corrConditions.push(`vc.created_at < ($${corrIdx++}::date + interval '1 day')`);
      corrParams.push(ate);
    }

    const movWhere = movConditions.length > 0 ? "WHERE " + movConditions.join(" AND ") : "";
    const corrWhere = corrConditions.length > 0 ? "WHERE " + corrConditions.join(" AND ") : "";

    // Se filtro de produto ativo, não misturar correções (sem produto)
    const showCorr = includeCorr && !produto;

    let total = 0;
    if (includeMov) {
      const countMov = await getClient().unsafe(
        `SELECT COUNT(*) as total FROM movimentacoes m JOIN produtos p ON p.id = m.produto_id ${movWhere}`,
        movParams
      );
      total += Number(countMov[0]?.total ?? 0);
    }
    if (showCorr) {
      const countCorr = await getClient().unsafe(
        `SELECT COUNT(*) as total FROM venda_correcoes vc ${corrWhere}`,
        corrParams
      );
      total += Number(countCorr[0]?.total ?? 0);
    }

    const offset = (page - 1) * pageSize;
    const unions: string[] = [];
    const unionParams: (string | number)[] = [];
    let p = 1;

    if (includeMov) {
      const remappedMovWhere = movWhere.replace(/\$(\d+)/g, () => `$${p++}`);
      unions.push(`
        SELECT
          'm-' || m.id::text as event_id,
          m.tipo,
          p.nome as produto_nome,
          m.quantidade,
          m.estoque_anterior,
          m.estoque_novo,
          m.usuario_id,
          u.nome as usuario_nome,
          m.referencia_id,
          m.motivo,
          m.created_at,
          NULL::integer as venda_numero,
          NULL::text as detalhes
        FROM movimentacoes m
        JOIN produtos p ON p.id = m.produto_id
        JOIN users u ON u.id = m.usuario_id
        ${remappedMovWhere}
      `);
      unionParams.push(...movParams);
    }

    if (showCorr) {
      const remappedCorrWhere = corrWhere.replace(/\$(\d+)/g, () => `$${p++}`);
      unions.push(`
        SELECT
          'c-' || vc.id::text as event_id,
          'correcao_venda' as tipo,
          ('Venda #' || v.numero)::text as produto_nome,
          0 as quantidade,
          0 as estoque_anterior,
          0 as estoque_novo,
          vc.usuario_id,
          u.nome as usuario_nome,
          vc.venda_id as referencia_id,
          vc.justificativa as motivo,
          vc.created_at,
          v.numero as venda_numero,
          vc.detalhes
        FROM venda_correcoes vc
        JOIN vendas v ON v.id = vc.venda_id
        JOIN users u ON u.id = vc.usuario_id
        ${remappedCorrWhere}
      `);
      unionParams.push(...corrParams);
    }

    if (unions.length === 0) {
      return NextResponse.json({ movimentacoes: [], total: 0, page, pageSize });
    }

    const limitParam = `$${p++}`;
    const offsetParam = `$${p++}`;
    const rows = await getClient().unsafe(
      `SELECT * FROM (${unions.join(" UNION ALL ")}) events
       ORDER BY created_at DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      [...unionParams, pageSize, offset]
    );

    const movimentacoes = rows.map((row) => ({
      id: row.event_id,
      tipo: row.tipo,
      produto_nome: row.produto_nome,
      quantidade: Number(row.quantidade),
      estoque_anterior: Number(row.estoque_anterior),
      estoque_novo: Number(row.estoque_novo),
      usuario_id: Number(row.usuario_id),
      usuario_nome: row.usuario_nome,
      referencia_id: row.referencia_id != null ? Number(row.referencia_id) : null,
      motivo: row.motivo,
      created_at: row.created_at,
      venda_numero: row.venda_numero != null ? Number(row.venda_numero) : null,
      detalhes: row.detalhes,
    }));

    return NextResponse.json({
      movimentacoes,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
