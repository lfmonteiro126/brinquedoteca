import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb, registrarMovimentacao } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await request.json();
    const db = getDb();

    const sessaoResult = db
      .prepare("INSERT INTO sessoes_inventario (usuario_id, observacao) VALUES (?, ?)")
      .run(user.id, body.observacao || null);

    const sessaoId = Number(sessaoResult.lastInsertRowid);
    const itens = body.itens as Array<{
      produto_id: number;
      estoque_contado: number;
    }>;

    if (!itens?.length) {
      return NextResponse.json({ error: "Nenhum item contado" }, { status: 400 });
    }

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

    return NextResponse.json({ sessaoId, divergencias, totalItens: itens.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
