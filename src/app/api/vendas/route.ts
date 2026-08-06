import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getClient } from "@/lib/db";
import { handleApiError } from "@/lib/api";

const VALID_METODOS = ["pix", "debito", "credito", "dinheiro"];

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
    const data = searchParams.get("data");
    const vendedor = searchParams.get("vendedor")?.trim();
    const metodo = searchParams.get("metodo");
    const desde = searchParams.get("desde");
    const ate = searchParams.get("ate");

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (user.role === "vendedor") {
      conditions.push(`v.usuario_id = $${paramIndex++}`);
      params.push(user.id);
    }

    if (data) {
      conditions.push(`v.created_at >= $${paramIndex}::date AND v.created_at < ($${paramIndex}::date + interval '1 day')`);
      params.push(data);
      paramIndex++;
    } else {
      if (desde) {
        conditions.push(`v.created_at >= $${paramIndex}::date`);
        params.push(desde);
        paramIndex++;
      }
      if (ate) {
        conditions.push(`v.created_at < ($${paramIndex}::date + interval '1 day')`);
        params.push(ate);
        paramIndex++;
      }
    }

    if (user.role === "admin" && vendedor) {
      conditions.push(`u.nome LIKE $${paramIndex++}`);
      params.push(`%${vendedor}%`);
    }
    if (metodo) {
      conditions.push(`v.metodo_pagamento = $${paramIndex++}`);
      params.push(metodo);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const countResult = await getClient().unsafe(
      `SELECT COUNT(*) as total FROM vendas v JOIN users u ON u.id = v.usuario_id ${whereClause}`,
      params
    );

    const offset = (page - 1) * pageSize;
    const vendas = await getClient().unsafe(
      `SELECT v.*, u.nome as usuario_nome, c.nome as corrigido_por_nome
       FROM vendas v
       JOIN users u ON u.id = v.usuario_id
       LEFT JOIN users c ON c.id = v.corrigido_por
       ${whereClause}
       ORDER BY v.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, pageSize, offset]
    );

    if (vendas.length > 0) {
      const ids = vendas.map((v) => Number(v.id));
      const allItens = await getClient().unsafe(
        `SELECT vi.*, p.nome as produto_nome
         FROM venda_itens vi
         JOIN produtos p ON p.id = vi.produto_id
         WHERE vi.venda_id = ANY($1)`,
        [ids]
      );

      const itensByVenda = new Map<number, Record<string, unknown>[]>();
      for (const item of allItens) {
        const vendaId = Number(item.venda_id);
        const list = itensByVenda.get(vendaId) || [];
        list.push(item);
        itensByVenda.set(vendaId, list);
      }

      for (const venda of vendas) {
        (venda as Record<string, unknown>).itens = itensByVenda.get(Number(venda.id)) || [];
      }
    }

    return NextResponse.json({
      vendas,
      total: countResult[0]?.total ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { itens, desconto = 0, metodo_pagamento = "dinheiro", parcelas = 1, desconto_autorizado_por = null } = body;

    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ error: "Adicione itens à venda" }, { status: 400 });
    }

    const descontoNum = Number(desconto);
    if (isNaN(descontoNum) || descontoNum < 0) {
      return NextResponse.json({ error: "Desconto inválido" }, { status: 400 });
    }

    if (!VALID_METODOS.includes(metodo_pagamento)) {
      return NextResponse.json({ error: "Método de pagamento inválido" }, { status: 400 });
    }

    const parcelasNum = parseInt(parcelas, 10);
    if (isNaN(parcelasNum) || parcelasNum < 1 || parcelasNum > 12) {
      return NextResponse.json({ error: "Parcelas inválidas" }, { status: 400 });
    }

    for (const item of itens) {
      if (!item.produto_id || !Number.isInteger(item.produto_id)) {
        return NextResponse.json({ error: "ID de produto inválido" }, { status: 400 });
      }
      if (!item.quantidade || !Number.isInteger(item.quantidade) || item.quantidade < 1) {
        return NextResponse.json({ error: "Quantidade inválida" }, { status: 400 });
      }
    }

    const { proximoNumeroVenda, registrarMovimentacao } = await import("@/lib/db");
    const numero = await proximoNumeroVenda();

    let total = 0;
    const itensValidados: Array<{
      produto_id: number;
      quantidade: number;
      preco_unitario: number;
      subtotal: number;
      nome: string;
    }> = [];

    for (const item of itens) {
      const produtoResult = await getClient().unsafe(
        "SELECT * FROM produtos WHERE id = $1 AND ativo = true",
        [item.produto_id]
      );

      if (produtoResult.length === 0) {
        return NextResponse.json(
          { error: `Produto não encontrado` },
          { status: 400 }
        );
      }

      const produto = produtoResult[0];

      if (produto.estoque < item.quantidade) {
        return NextResponse.json(
          { error: `Estoque insuficiente para "${produto.nome}" (${produto.estoque} disponíveis)` },
          { status: 400 }
        );
      }

      const subtotal = Number(produto.preco_venda) * item.quantidade;
      total += subtotal;
      itensValidados.push({
        produto_id: produto.id,
        quantidade: item.quantidade,
        preco_unitario: Number(produto.preco_venda),
        subtotal,
        nome: produto.nome,
      });
    }

    total -= descontoNum;
    if (total < 0) total = 0;

    const vendaId = await getClient().begin(async (tx) => {
      const vendaResult = await tx`
        INSERT INTO vendas (numero, usuario_id, total, desconto, metodo_pagamento, parcelas, desconto_autorizado_por)
        VALUES (${numero}, ${user.id}, ${total}, ${descontoNum}, ${metodo_pagamento}, ${parcelasNum}, ${desconto_autorizado_por || null})
        RETURNING id
      `;

      const id = vendaResult[0].id;

      const descontoFormatado = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(descontoNum);
      const motivoMovimentacao = descontoNum > 0 && desconto_autorizado_por
        ? `Venda #${numero} (Desconto de ${descontoFormatado} autorizado por ${desconto_autorizado_por})`
        : `Venda #${numero}`;

      for (const item of itensValidados) {
        await tx`
          INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario, subtotal)
          VALUES (${id}, ${item.produto_id}, ${item.quantidade}, ${item.preco_unitario}, ${item.subtotal})
        `;

        await registrarMovimentacao({
          produtoId: item.produto_id,
          tipo: "venda",
          quantidade: item.quantidade,
          usuarioId: user.id,
          referenciaId: id,
          motivo: motivoMovimentacao,
        });
      }

      return id;
    });

    const vendaResult = await getClient().unsafe("SELECT * FROM vendas WHERE id = $1", [vendaId]);
    return NextResponse.json({ venda: vendaResult[0], numero, total, itens: itensValidados }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
