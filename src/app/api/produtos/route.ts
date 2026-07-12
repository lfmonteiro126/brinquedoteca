import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { getClient, registrarMovimentacao } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const estoqueBaixo = searchParams.get("estoque_baixo") === "1";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = ["ativo = true"];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (q) {
      conditions.push(`(nome ILIKE $${paramIndex} OR codigo_barras ILIKE $${paramIndex} OR categoria ILIKE $${paramIndex})`);
      params.push(`%${q}%`);
      paramIndex++;
    }

    if (estoqueBaixo) {
      conditions.push("estoque <= estoque_minimo");
    }

    const whereClause = "WHERE " + conditions.join(" AND ");

    const countResult = await getClient().unsafe(
      `SELECT COUNT(*) as total FROM produtos ${whereClause}`,
      params
    );

    const produtos = await getClient().unsafe(
      `SELECT * FROM produtos ${whereClause} ORDER BY nome ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, pageSize, offset]
    );

    return NextResponse.json({
      produtos,
      total: countResult[0]?.total ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await request.json();

    const {
      nome,
      descricao,
      imagem_url,
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

    const result = await getClient().unsafe(
      `INSERT INTO produtos (nome, descricao, imagem_url, codigo_barras, categoria, preco_custo, preco_venda, estoque, estoque_minimo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        nome.trim(),
        descricao?.trim() || null,
        imagem_url?.trim() || null,
        codigo_barras?.trim() || null,
        categoria?.trim() || null,
        preco_custo ?? 0,
        preco_venda ?? 0,
        0,
        estoque_minimo ?? 5,
      ]
    );

    const produtoId = result[0].id;

    if (estoqueInicial > 0) {
      await registrarMovimentacao({
        produtoId,
        tipo: "entrada",
        quantidade: estoqueInicial,
        usuarioId: user.id,
        motivo: "Cadastro inicial",
      });
    }

    const produto = await getClient().unsafe("SELECT * FROM produtos WHERE id = $1", [produtoId]);
    return NextResponse.json({ produto: produto[0] }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    if (message.includes("UNIQUE")) {
      return NextResponse.json({ error: "Código de barras já cadastrado" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
