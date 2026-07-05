import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { sqlGet, sqlRun, registrarMovimentacao } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const produto = await sqlGet("SELECT * FROM produtos WHERE id = $1", parseInt(id));
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

    const atual = await sqlGet(
      "SELECT estoque FROM produtos WHERE id = $1",
      parseInt(id)
    ) as { estoque: number } | undefined;

    if (!atual) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    await sqlRun`
      UPDATE produtos SET
        nome = ${body.nome?.trim()},
        codigo_barras = ${body.codigo_barras?.trim() || null},
        categoria = ${body.categoria?.trim() || null},
        preco_custo = ${body.preco_custo ?? 0},
        preco_venda = ${body.preco_venda ?? 0},
        estoque_minimo = ${body.estoque_minimo ?? 5},
        ativo = ${body.ativo ?? true},
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
    `;

    if (body.ajuste_estoque && body.ajuste_quantidade) {
      const tipo = body.ajuste_tipo === "saida" ? "saida" : "entrada";
      await registrarMovimentacao({
        produtoId: parseInt(id),
        tipo,
        quantidade: body.ajuste_quantidade,
        usuarioId: user.id,
        motivo: body.ajuste_motivo || `Ajuste manual (${tipo})`,
      });
    }

    const produto = await sqlGet("SELECT * FROM produtos WHERE id = $1", parseInt(id));
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
    await sqlRun`UPDATE produtos SET ativo = false WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
