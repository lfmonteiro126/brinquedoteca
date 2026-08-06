import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { registrarMovimentacao, getClient } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id: idStr } = await params;
    const vendaId = parseInt(idStr, 10);
    if (isNaN(vendaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const result = await getClient().begin(async (tx) => {
      const venda = await tx`SELECT * FROM vendas WHERE id = ${vendaId} FOR UPDATE`;
      if (venda.length === 0) {
        throw new Error("Venda não encontrada");
      }

      const jaEstornada = await tx`SELECT id FROM movimentacoes WHERE tipo = 'estorno' AND referencia_id = ${vendaId}`;
      if (jaEstornada.length > 0) {
        throw new Error("Esta venda já foi estornada");
      }

      const itens = await tx`SELECT * FROM venda_itens WHERE venda_id = ${vendaId}`;

      for (const item of itens) {
        await registrarMovimentacao({
          produtoId: item.produto_id,
          tipo: "estorno",
          quantidade: item.quantidade,
          usuarioId: admin.id,
          referenciaId: vendaId,
          motivo: `Estorno da venda #${venda[0].numero}`,
        });
      }

      return venda[0].numero;
    });

    return NextResponse.json({
      ok: true,
      message: `Venda #${result} estornada. Estoque devolvido.`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Venda não encontrada") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof Error && error.message === "Esta venda já foi estornada") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleApiError(error);
  }
}
