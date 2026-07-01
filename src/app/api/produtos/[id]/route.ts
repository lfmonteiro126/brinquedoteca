import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { getDb, registrarMovimentacao } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const db = getDb();
    const produto = db.prepare("SELECT * FROM produtos WHERE id = ?").get(id);
    if (!produto) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ produto });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const atual = db.prepare("SELECT * FROM produtos WHERE id = ?").get(id) as {
      estoque: number;
    } | undefined;

    if (!atual) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    db.prepare(
      `UPDATE produtos SET
        nome = ?, codigo_barras = ?, categoria = ?,
        preco_custo = ?, preco_venda = ?, estoque_minimo = ?,
        ativo = ?, updated_at = datetime('now', 'localtime')
       WHERE id = ?`
    ).run(
      body.nome?.trim(),
      body.codigo_barras?.trim() || null,
      body.categoria?.trim() || null,
      body.preco_custo ?? 0,
      body.preco_venda ?? 0,
      body.estoque_minimo ?? 5,
      body.ativo ?? 1,
      id
    );

    if (body.ajuste_estoque && body.ajuste_quantidade) {
      const tipo = body.ajuste_tipo === "saida" ? "saida" : "entrada";
      registrarMovimentacao(db, {
        produtoId: Number(id),
        tipo,
        quantidade: body.ajuste_quantidade,
        usuarioId: user.id,
        motivo: body.ajuste_motivo || `Ajuste manual (${tipo})`,
      });
    }

    const produto = db.prepare("SELECT * FROM produtos WHERE id = ?").get(id);
    return NextResponse.json({ produto });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = getDb();
    db.prepare("UPDATE produtos SET ativo = 0 WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
