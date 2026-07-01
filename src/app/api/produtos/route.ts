import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { getDb, registrarMovimentacao } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const estoqueBaixo = searchParams.get("estoque_baixo") === "1";

    let query = "SELECT * FROM produtos WHERE ativo = 1";
    const params: (string | number)[] = [];

    if (q) {
      query += " AND (nome LIKE ? OR codigo_barras LIKE ? OR categoria LIKE ?)";
      const term = `%${q}%`;
      params.push(term, term, term);
    }

    if (estoqueBaixo) {
      query += " AND estoque <= estoque_minimo";
    }

    query += " ORDER BY nome ASC";

    const produtos = db.prepare(query).all(...params);
    return NextResponse.json({ produtos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: message === "Não autenticado" ? 401 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await request.json();
    const db = getDb();

    const {
      nome,
      codigo_barras,
      categoria,
      preco_custo,
      preco_venda,
      estoque,
      estoque_minimo,
    } = body;

    if (!nome?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const estoqueInicial = estoque ?? 0;

    const result = db
      .prepare(
        `INSERT INTO produtos (nome, codigo_barras, categoria, preco_custo, preco_venda, estoque, estoque_minimo)
         VALUES (?, ?, ?, ?, ?, 0, ?)`
      )
      .run(
        nome.trim(),
        codigo_barras?.trim() || null,
        categoria?.trim() || null,
        preco_custo ?? 0,
        preco_venda ?? 0,
        estoque_minimo ?? 5
      );

    const produtoId = Number(result.lastInsertRowid);

    if (estoqueInicial > 0) {
      registrarMovimentacao(db, {
        produtoId,
        tipo: "entrada",
        quantidade: estoqueInicial,
        usuarioId: user.id,
        motivo: "Cadastro inicial",
      });
    }

    const produto = db.prepare("SELECT * FROM produtos WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json({ produto }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    if (message.includes("UNIQUE")) {
      return NextResponse.json({ error: "Código de barras já cadastrado" }, { status: 409 });
    }
    return NextResponse.json(
      { error: message },
      { status: message === "Não autenticado" || message === "Acesso negado" ? 403 : 500 }
    );
  }
}
