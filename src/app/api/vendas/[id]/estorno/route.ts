import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sqlGet, sqlAll, registrarMovimentacao, getClient } from "@/lib/db";
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

    const venda = await sqlGet(
      "SELECT * FROM vendas WHERE id = $",
      vendaId
    ) as {
      id: number;
      numero: number;
      total: number;
      usuario_id: number;
    } | undefined;

    if (!venda) {
      return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 });
    }

    const jaEstornada = await sqlGet(
      "SELECT id FROM movimentacoes WHERE tipo = 'estorno' AND referencia_id = $",
      vendaId
    ) as { id: number } | undefined;

    if (jaEstornada) {
      return NextResponse.json({ error: "Esta venda já foi estornada" }, { status: 400 });
    }

    const itens = await sqlAll`
      SELECT * FROM venda_itens WHERE venda_id = ${vendaId}
    ` as { produto_id: number; quantidade: number }[];

    await getClient().begin(async () => {
      for (const item of itens) {
        await registrarMovimentacao({
          produtoId: item.produto_id,
          tipo: "estorno",
          quantidade: item.quantidade,
          usuarioId: admin.id,
          referenciaId: vendaId,
          motivo: `Estorno da venda #${venda.numero}`,
        });
      }
    });

    return NextResponse.json({
      ok: true,
      message: `Venda #${venda.numero} estornada. Estoque devolvido.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
