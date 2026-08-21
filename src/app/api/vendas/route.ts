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
      `SELECT v.*, u.nome as usuario_nome, c.nome as corrigido_por_nome, e.nome as estornada_por_nome
       FROM vendas v
       JOIN users u ON u.id = v.usuario_id
       LEFT JOIN users c ON c.id = v.corrigido_por
       LEFT JOIN users e ON e.id = v.estornada_por
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
      const produtoId = Number(item.produto_id);
      const quantidade = Number(item.quantidade);
      if (!Number.isInteger(produtoId) || produtoId < 1) {
        return NextResponse.json({ error: "ID de produto inválido" }, { status: 400 });
      }
      if (!Number.isInteger(quantidade) || quantidade < 1) {
        return NextResponse.json({ error: "Quantidade inválida" }, { status: 400 });
      }
    }

    const resultado = await getClient().begin(async (tx) => {
      // PostgreSQL rejects FOR UPDATE with aggregates (MAX). Lock the table instead.
      await tx`LOCK TABLE vendas IN SHARE ROW EXCLUSIVE MODE`;
      const nextResult = await tx`
        SELECT COALESCE(MAX(numero), 0) + 1 as next_num FROM vendas
      `;
      const numero = Number(nextResult[0].next_num);

      let total = 0;
      const itensValidados: Array<{
        produto_id: number;
        quantidade: number;
        preco_unitario: number;
        subtotal: number;
        nome: string;
      }> = [];

      for (const item of itens) {
        const produtoId = Number(item.produto_id);
        const quantidade = Number(item.quantidade);

        const produtoResult = await tx`
          SELECT id, nome, estoque, preco_venda
          FROM produtos
          WHERE id = ${produtoId} AND ativo = true
          FOR UPDATE
        `;

        if (produtoResult.length === 0) {
          throw new Error(`Produto não encontrado`);
        }

        const produto = produtoResult[0];
        const estoqueAtual = Number(produto.estoque);

        if (estoqueAtual < quantidade) {
          throw new Error(
            `Estoque insuficiente para "${produto.nome}" (${estoqueAtual} disponíveis)`
          );
        }

        const precoUnitario = Number(produto.preco_venda);
        const subtotal = Math.round(precoUnitario * quantidade * 100) / 100;
        total += subtotal;
        itensValidados.push({
          produto_id: Number(produto.id),
          quantidade,
          preco_unitario: precoUnitario,
          subtotal,
          nome: String(produto.nome),
        });
      }

      total = Math.round((total - descontoNum) * 100) / 100;
      if (total < 0) total = 0;

      const vendaResult = await tx`
        INSERT INTO vendas (numero, usuario_id, total, desconto, metodo_pagamento, parcelas, desconto_autorizado_por)
        VALUES (
          ${numero},
          ${user.id},
          ${total},
          ${descontoNum},
          ${metodo_pagamento},
          ${parcelasNum},
          ${desconto_autorizado_por || null}
        )
        RETURNING *
      `;

      const venda = vendaResult[0];
      const vendaId = Number(venda.id);

      const descontoFormatado = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(descontoNum);
      const motivoMovimentacao =
        descontoNum > 0 && desconto_autorizado_por
          ? `Venda #${numero} (Desconto de ${descontoFormatado} autorizado por ${desconto_autorizado_por})`
          : `Venda #${numero}`;

      for (const item of itensValidados) {
        await tx`
          INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario, subtotal)
          VALUES (${vendaId}, ${item.produto_id}, ${item.quantidade}, ${item.preco_unitario}, ${item.subtotal})
        `;

        const produtoLock = await tx`
          SELECT estoque FROM produtos WHERE id = ${item.produto_id} FOR UPDATE
        `;
        const estoqueAnterior = Number(produtoLock[0].estoque);
        const estoqueNovo = estoqueAnterior - item.quantidade;
        if (estoqueNovo < 0) {
          throw new Error(`Estoque insuficiente para "${item.nome}"`);
        }

        await tx`
          UPDATE produtos
          SET estoque = ${estoqueNovo}, updated_at = NOW()
          WHERE id = ${item.produto_id}
        `;

        await tx`
          INSERT INTO movimentacoes (
            produto_id, tipo, quantidade, estoque_anterior, estoque_novo,
            usuario_id, referencia_id, motivo
          ) VALUES (
            ${item.produto_id}, 'venda', ${item.quantidade},
            ${estoqueAnterior}, ${estoqueNovo},
            ${user.id}, ${vendaId}, ${motivoMovimentacao}
          )
        `;
      }

      return { venda, numero, total, itens: itensValidados };
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Produto não encontrado" ||
        error.message.startsWith("Estoque insuficiente")
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes("unique") || error.message.includes("UNIQUE")) {
        return NextResponse.json(
          { error: "Conflito ao gerar número da venda. Tente novamente." },
          { status: 409 }
        );
      }
    }
    return handleApiError(error);
  }
}
