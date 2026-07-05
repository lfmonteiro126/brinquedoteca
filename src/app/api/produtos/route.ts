import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { getDb, registrarMovimentacao } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const estoqueBaixo = searchParams.get("estoque_baixo") === "1";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));

    let whereClause = "WHERE ativo = 1";
    const params: (string | number)[] = [];

    if (q) {
      whereClause += " AND (nome LIKE ? OR codigo_barras LIKE ? OR categoria LIKE ?)";
      const term = `%${q}%`;
      params.push(term, term, term);
    }

    if (estoqueBaixo) {
      whereClause += " AND estoque <= estoque_minimo";
    }

    const countResult = db
      .prepare(`SELECT COUNT(*) as total FROM produtos ${whereClause}`)
      .get(...params) as { total: number };

    const offset = (page - 1) * pageSize;
    const produtos = db
      .prepare(`SELECT * FROM produtos ${whereClause} ORDER BY nome ASC LIMIT ? OFFSET ?`)
      .all(...params, pageSize, offset);

    return NextResponse.json({
      produtos,
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
    return handleApiError(error);
  }
}
