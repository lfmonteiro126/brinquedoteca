import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { getDb, registrarMovimentacao } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    await requireAuth();
    const db = getDb();

    const sessoes = db
      .prepare(
        `SELECT s.*, u.nome as usuario_nome,
                (SELECT COUNT(*) FROM inventario_itens WHERE sessao_id = s.id) as total_itens,
                (SELECT COUNT(*) FROM inventario_itens WHERE sessao_id = s.id AND diferenca != 0) as divergencias
         FROM sessoes_inventario s
         JOIN users u ON u.id = s.usuario_id
         WHERE s.status = 'finalizada'
         ORDER BY s.finalized_at DESC
         LIMIT 20`
      )
      .all();

    return NextResponse.json({ sessoes });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await request.json();
    const db = getDb();

    const itens = body.itens as Array<{
      produto_id: number;
      estoque_contado: number;
    }>;

    if (!itens?.length) {
      return NextResponse.json({ error: "Nenhum item contado" }, { status: 400 });
    }

    const processarInventario = db.transaction(() => {
      const sessaoResult = db
        .prepare("INSERT INTO sessoes_inventario (usuario_id, observacao) VALUES (?, ?)")
        .run(user.id, body.observacao || null);

      const sessaoId = Number(sessaoResult.lastInsertRowid);
      let divergencias = 0;

      for (const item of itens) {
        const produto = db
          .prepare("SELECT estoque FROM produtos WHERE id = ?")
          .get(item.produto_id) as { estoque: number } | undefined;

        if (!produto) continue;

        const diferenca = item.estoque_contado - produto.estoque;

        db.prepare(
          `INSERT INTO inventario_itens (sessao_id, produto_id, estoque_sistema, estoque_contado, diferenca)
           VALUES (?, ?, ?, ?, ?)`
        ).run(sessaoId, item.produto_id, produto.estoque, item.estoque_contado, diferenca);

        if (diferenca !== 0) {
          divergencias++;
          registrarMovimentacao(db, {
            produtoId: item.produto_id,
            tipo: diferenca > 0 ? "entrada" : "saida",
            quantidade: Math.abs(diferenca),
            usuarioId: user.id,
            referenciaId: sessaoId,
            motivo: "Inventário físico",
          });
        }
      }

      db.prepare(
        "UPDATE sessoes_inventario SET status = 'finalizada', finalized_at = datetime('now', 'localtime') WHERE id = ?"
      ).run(sessaoId);

      return { sessaoId, divergencias, totalItens: itens.length };
    });

    const resultado = processarInventario();
    return NextResponse.json(resultado);
  } catch (error) {
    return handleApiError(error);
  }
}
