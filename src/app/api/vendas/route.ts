import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb, registrarMovimentacao, proximoNumeroVenda } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
    const data = searchParams.get("data");
    const vendedor = searchParams.get("vendedor")?.trim();
    const metodo = searchParams.get("metodo");
    const desde = searchParams.get("desde");
    const ate = searchParams.get("ate");

    let whereClause = "";
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (data) {
      conditions.push("v.created_at >= date(?) AND v.created_at < date(?, '+1 day')");
      params.push(data, data);
    } else {
      if (desde) {
        conditions.push("v.created_at >= date(?)");
        params.push(desde);
      }
      if (ate) {
        conditions.push("v.created_at < date(?, '+1 day')");
        params.push(ate);
      }
    }

    if (vendedor) {
      conditions.push("u.nome LIKE ?");
      params.push(`%${vendedor}%`);
    }
    if (metodo) {
      conditions.push("v.metodo_pagamento = ?");
      params.push(metodo);
    }

    if (conditions.length > 0) {
      whereClause = "WHERE " + conditions.join(" AND ");
    }

    const countResult = db
      .prepare(
        `SELECT COUNT(*) as total
         FROM vendas v
         JOIN users u ON u.id = v.usuario_id
         ${whereClause}`
      )
      .get(...params) as { total: number };

    const offset = (page - 1) * pageSize;
    const vendas = db
      .prepare(
        `SELECT v.*, u.nome as usuario_nome
         FROM vendas v
         JOIN users u ON u.id = v.usuario_id
         ${whereClause}
         ORDER BY v.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, offset) as Array<{
      id: number;
      numero: number;
      usuario_id: number;
      usuario_nome: string;
      total: number;
      desconto: number;
      metodo_pagamento: string;
      created_at: string;
    }>;

    if (vendas.length > 0) {
      const ids = vendas.map((v) => v.id);
      const placeholders = ids.map(() => "?").join(",");
      const allItens = db
        .prepare(
          `SELECT vi.*, p.nome as produto_nome
           FROM venda_itens vi
           JOIN produtos p ON p.id = vi.produto_id
           WHERE vi.venda_id IN (${placeholders})`
        )
        .all(...ids) as Array<{ venda_id: number } & Record<string, unknown>>;

      const itensByVenda = new Map<number, typeof allItens>();
      for (const item of allItens) {
        const list = itensByVenda.get(item.venda_id) || [];
        list.push(item);
        itensByVenda.set(item.venda_id, list);
      }

      for (const venda of vendas) {
        (venda as { itens?: unknown }).itens = itensByVenda.get(venda.id) || [];
      }
    }

    return NextResponse.json({
      vendas,
      total: countResult.total,
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
    const { itens, desconto = 0, metodo_pagamento = "dinheiro", parcelas = 1 } = body;

    if (!itens?.length) {
      return NextResponse.json({ error: "Adicione itens à venda" }, { status: 400 });
    }

    const db = getDb();
    const numero = proximoNumeroVenda(db);

    let total = 0;
    const itensValidados: Array<{
      produto_id: number;
      quantidade: number;
      preco_unitario: number;
      subtotal: number;
      nome: string;
    }> = [];

    for (const item of itens) {
      const produto = db
        .prepare("SELECT * FROM produtos WHERE id = ? AND ativo = 1")
        .get(item.produto_id) as {
        id: number;
        nome: string;
        estoque: number;
        preco_venda: number;
      } | undefined;

      if (!produto) {
        return NextResponse.json(
          { error: `Produto #${item.produto_id} não encontrado` },
          { status: 400 }
        );
      }

      if (produto.estoque < item.quantidade) {
        return NextResponse.json(
          { error: `Estoque insuficiente para "${produto.nome}" (${produto.estoque} disponíveis)` },
          { status: 400 }
        );
      }

      const subtotal = produto.preco_venda * item.quantidade;
      total += subtotal;
      itensValidados.push({
        produto_id: produto.id,
        quantidade: item.quantidade,
        preco_unitario: produto.preco_venda,
        subtotal,
        nome: produto.nome,
      });
    }

    total -= desconto;
    if (total < 0) total = 0;

    const criarVenda = db.transaction(() => {
      const vendaResult = db
        .prepare(
          "INSERT INTO vendas (numero, usuario_id, total, desconto, metodo_pagamento, parcelas) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run(numero, user.id, total, desconto, metodo_pagamento, parcelas);

      const vendaId = Number(vendaResult.lastInsertRowid);

      const insertItem = db.prepare(
        "INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario, subtotal) VALUES (?, ?, ?, ?, ?)"
      );

      for (const item of itensValidados) {
        insertItem.run(
          vendaId,
          item.produto_id,
          item.quantidade,
          item.preco_unitario,
          item.subtotal
        );

        registrarMovimentacao(db, {
          produtoId: item.produto_id,
          tipo: "venda",
          quantidade: item.quantidade,
          usuarioId: user.id,
          referenciaId: vendaId,
          motivo: `Venda #${numero}`,
        });
      }

      return { vendaId };
    });

    const { vendaId } = criarVenda();

    const venda = db.prepare("SELECT * FROM vendas WHERE id = ?").get(vendaId);
    return NextResponse.json({ venda, numero, total, itens: itensValidados }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
