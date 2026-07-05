import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { sqlAll, registrarMovimentacao, getClient } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    await requireAuth();

    const sessoes = await sqlAll`
      SELECT s.*, u.nome as usuario_nome,
              (SELECT COUNT(*) FROM inventario_itens WHERE sessao_id = s.id) as total_itens,
              (SELECT COUNT(*) FROM inventario_itens WHERE sessao_id = s.id AND diferenca != 0) as divergencias
       FROM sessoes_inventario s
       JOIN users u ON u.id = s.usuario_id
       WHERE s.status = 'finalizada'
       ORDER BY s.finalized_at DESC
       LIMIT 20
    `;

    return NextResponse.json({ sessoes });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await request.json();

    const itens = body.itens as Array<{
      produto_id: number;
      estoque_contado: number;
    }>;

    if (!itens?.length) {
      return NextResponse.json({ error: "Nenhum item contado" }, { status: 400 });
    }

    const resultado = await getClient().begin(async (tx) => {
      const sessaoResult = await tx`
        INSERT INTO sessoes_inventario (usuario_id, observacao)
        VALUES (${user.id}, ${body.observacao || null})
        RETURNING id
      `;

      const sessaoId = sessaoResult[0].id;
      let divergencias = 0;

      for (const item of itens) {
        const produto = await tx`SELECT estoque FROM produtos WHERE id = ${item.produto_id}`;

        if (produto.length === 0) continue;

        const diferenca = item.estoque_contado - produto[0].estoque;

        await tx`
          INSERT INTO inventario_itens (sessao_id, produto_id, estoque_sistema, estoque_contado, diferenca)
          VALUES (${sessaoId}, ${item.produto_id}, ${produto[0].estoque}, ${item.estoque_contado}, ${diferenca})
        `;

        if (diferenca !== 0) {
          divergencias++;
          await registrarMovimentacao({
            produtoId: item.produto_id,
            tipo: diferenca > 0 ? "entrada" : "saida",
            quantidade: Math.abs(diferenca),
            usuarioId: user.id,
            referenciaId: sessaoId,
            motivo: "Inventário físico",
          });
        }
      }

      await tx`
        UPDATE sessoes_inventario SET status = 'finalizada', finalized_at = NOW()
        WHERE id = ${sessaoId}
      `;

      return { sessaoId, divergencias, totalItens: itens.length };
    });

    return NextResponse.json(resultado);
  } catch (error) {
    return handleApiError(error);
  }
}
