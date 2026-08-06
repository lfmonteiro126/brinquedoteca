import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { sqlGet, sqlRun, registrarMovimentacao } from "@/lib/db";
import { handleApiError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    const produto = await sqlGet("SELECT * FROM produtos WHERE id = $1", idNum);
    if (!produto) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ produto });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const produtoId = parseInt(id, 10);
    if (isNaN(produtoId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    if (body.ajuste_estoque && body.ajuste_quantidade) {
      const quantidade = parseInt(body.ajuste_quantidade, 10);
      if (isNaN(quantidade) || quantidade <= 0) {
        return NextResponse.json({ error: "Quantidade de ajuste inválida" }, { status: 400 });
      }
      const tipo = body.ajuste_tipo === "saida" ? "saida" : "entrada";
      await registrarMovimentacao({
        produtoId,
        tipo,
        quantidade,
        usuarioId: user.id,
        motivo: body.ajuste_motivo || `Ajuste manual (${tipo})`,
      });
      const produto = await sqlGet("SELECT * FROM produtos WHERE id = $1", produtoId);
      return NextResponse.json({ produto });
    }

    const atual = await sqlGet(
      "SELECT estoque FROM produtos WHERE id = $1",
      produtoId
    ) as { estoque: number } | undefined;

    if (!atual) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    const nome = body.nome?.trim();
    if (!nome) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    await sqlRun`
      UPDATE produtos SET
        nome = ${nome},
        descricao = ${body.descricao?.trim() || null},
        imagem_url = ${body.imagem_url?.trim() || null},
        codigo_barras = ${body.codigo_barras?.trim() || null},
        categoria = ${body.categoria?.trim() || null},
        preco_custo = ${Number(body.preco_custo) || 0},
        preco_venda = ${Number(body.preco_venda) || 0},
        estoque_minimo = ${parseInt(body.estoque_minimo, 10) || 5},
        ativo = ${body.ativo ?? true},
        updated_at = NOW()
      WHERE id = ${produtoId}
    `;

    const produto = await sqlGet("SELECT * FROM produtos WHERE id = $1", produtoId);
    return NextResponse.json({ produto });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    await sqlRun`UPDATE produtos SET ativo = false WHERE id = ${idNum}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
