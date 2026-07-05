import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sqlGet } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;

    const sessao = await sqlGet`
      SELECT s.*, u.nome as usuario_nome
      FROM sessoes_inventario s
      JOIN users u ON u.id = s.usuario_id
      WHERE s.id = ${parseInt(id)}
    `;

    if (!sessao) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    const itens = await sqlGet`
      SELECT ii.*, p.nome as produto_nome, p.codigo_barras, p.categoria
      FROM inventario_itens ii
      JOIN produtos p ON p.id = ii.produto_id
      WHERE ii.sessao_id = ${parseInt(id)}
      ORDER BY ii.diferenca DESC
    `;

    return NextResponse.json({ sessao, itens });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
