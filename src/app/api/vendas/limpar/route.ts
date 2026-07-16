import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getClient } from "@/lib/db";

export async function POST() {
  try {
    await requireAdmin();

    const sql = getClient();

    const vendaItensResult = await sql.unsafe("DELETE FROM venda_itens");
    const vendasResult = await sql.unsafe("DELETE FROM vendas");
    const movResult = await sql.unsafe(
      "DELETE FROM movimentacoes WHERE tipo IN ('venda', 'estorno')"
    );

    return NextResponse.json({
      ok: true,
      deleted: {
        venda_itens: vendaItensResult.count ?? 0,
        vendas: vendasResult.count ?? 0,
        movimentacoes: movResult.count ?? 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
