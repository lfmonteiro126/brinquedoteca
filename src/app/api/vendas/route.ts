import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb, registrarMovimentacao, proximoNumeroVenda } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const data = searchParams.get("data");

    let query = `
      SELECT v.*, u.nome as usuario_nome
      FROM vendas v
      JOIN users u ON u.id = v.usuario_id
    `;
    const params: string[] = [];

    if (data) {
      query += " WHERE date(v.created_at) = date(?)";
      params.push(data);
    }

    query += " ORDER BY v.created_at DESC LIMIT ?";
    params.push(String(limit));

    const vendas = db.prepare(query).all(...params) as Array<{
      id: number;
      numero: number;
      usuario_id: number;
      usuario_nome: string;
      total: number;
      desconto: number;
      created_at: string;
    }>;

    for (const venda of vendas) {
      const itens = db
        .prepare(
          `SELECT vi.*, p.nome as produto_nome
           FROM venda_itens vi
           JOIN produtos p ON p.id = vi.produto_id
           WHERE vi.venda_id = ?`
        )
        .all(venda.id);
      (venda as { itens?: unknown }).itens = itens;
    }

    return NextResponse.json({ vendas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 401 });
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

    const venda = db.prepare("SELECT * FROM vendas WHERE id = ?").get(vendaId);
    return NextResponse.json({ venda, numero, total, itens: itensValidados }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
