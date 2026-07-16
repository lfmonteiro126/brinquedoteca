import { NextResponse } from "next/server";
import { getClient } from "@/lib/db";

export async function POST() {
  try {
    const sql = getClient();

    const vendaItensResult = await sql.unsafe("DELETE FROM venda_itens RETURNING id");
    const vendasResult = await sql.unsafe("DELETE FROM vendas RETURNING id");
    const movResult = await sql.unsafe(
      "DELETE FROM movimentacoes WHERE tipo IN ('venda', 'estorno') RETURNING id"
    );

    return NextResponse.json({
      ok: true,
      deleted: {
        venda_itens: vendaItensResult.length,
        vendas: vendasResult.length,
        movimentacoes: movResult.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
