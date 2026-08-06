import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getClient } from "@/lib/db";
import { handleApiError } from "@/lib/api";

const VALID_METODOS = ["pix", "debito", "credito", "dinheiro"];

const METODO_LABELS: Record<string, string> = {
  pix: "PIX",
  debito: "Débito",
  credito: "Crédito",
  dinheiro: "Dinheiro",
};

function labelMetodo(metodo: string, parcelas: number) {
  const base = METODO_LABELS[metodo] || metodo;
  if (metodo === "credito" && parcelas > 1) return `${base} (${parcelas}x)`;
  return base;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id: idStr } = await params;
    const vendaId = parseInt(idStr, 10);
    if (isNaN(vendaId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const {
      metodo_pagamento,
      parcelas = 1,
      desconto = 0,
      itens,
      justificativa,
    } = body;

    const justificativaTrim = typeof justificativa === "string" ? justificativa.trim() : "";
    if (justificativaTrim.length < 3) {
      return NextResponse.json(
        { error: "Informe uma justificativa com pelo menos 3 caracteres" },
        { status: 400 }
      );
    }

    if (!VALID_METODOS.includes(metodo_pagamento)) {
      return NextResponse.json({ error: "Método de pagamento inválido" }, { status: 400 });
    }

    const descontoNum = Number(desconto);
    if (isNaN(descontoNum) || descontoNum < 0) {
      return NextResponse.json({ error: "Desconto inválido" }, { status: 400 });
    }

    const parcelasNum = parseInt(parcelas, 10);
    if (isNaN(parcelasNum) || parcelasNum < 1 || parcelasNum > 12) {
      return NextResponse.json({ error: "Parcelas inválidas" }, { status: 400 });
    }

    if (metodo_pagamento !== "credito" && parcelasNum !== 1) {
      return NextResponse.json(
        { error: "Parcelas só são permitidas no crédito" },
        { status: 400 }
      );
    }

    if (itens !== undefined) {
      if (!Array.isArray(itens) || itens.length === 0) {
        return NextResponse.json({ error: "Itens inválidos" }, { status: 400 });
      }
      for (const item of itens) {
        if (!item.id || !Number.isInteger(item.id)) {
          return NextResponse.json({ error: "ID de item inválido" }, { status: 400 });
        }
        const preco = Number(item.preco_unitario);
        if (isNaN(preco) || preco < 0) {
          return NextResponse.json({ error: "Preço unitário inválido" }, { status: 400 });
        }
      }
    }

    const venda = await getClient().begin(async (tx) => {
      const existing = await tx`SELECT * FROM vendas WHERE id = ${vendaId} FOR UPDATE`;
      if (existing.length === 0) {
        throw new Error("Venda não encontrada");
      }

      const anterior = existing[0];

      const jaEstornada = await tx`
        SELECT id FROM movimentacoes
        WHERE tipo = 'estorno' AND referencia_id = ${vendaId}
        LIMIT 1
      `;
      if (jaEstornada.length > 0) {
        throw new Error("Não é possível editar uma venda estornada");
      }

      const currentItens = await tx`
        SELECT vi.*, p.nome as produto_nome
        FROM venda_itens vi
        JOIN produtos p ON p.id = vi.produto_id
        WHERE vi.venda_id = ${vendaId}
        ORDER BY vi.id
      `;

      if (itens) {
        const itemIds = new Set(currentItens.map((i) => Number(i.id)));
        for (const item of itens) {
          if (!itemIds.has(item.id)) {
            throw new Error("Item não pertence a esta venda");
          }
        }
      }

      const priceById = new Map<number, number>();
      if (itens) {
        for (const item of itens) {
          priceById.set(item.id, Number(item.preco_unitario));
        }
      }

      const mudancasItens: string[] = [];
      let subtotal = 0;
      for (const item of currentItens) {
        const precoAnterior = Number(item.preco_unitario);
        const precoUnitario = priceById.has(Number(item.id))
          ? priceById.get(Number(item.id))!
          : precoAnterior;
        const qty = Number(item.quantidade);
        const itemSubtotal = Math.round(precoUnitario * qty * 100) / 100;

        if (priceById.has(Number(item.id))) {
          await tx`
            UPDATE venda_itens
            SET preco_unitario = ${precoUnitario}, subtotal = ${itemSubtotal}
            WHERE id = ${item.id}
          `;
          if (precoUnitario !== precoAnterior) {
            mudancasItens.push(
              `${item.produto_nome}: R$ ${precoAnterior.toFixed(2)} → R$ ${precoUnitario.toFixed(2)}`
            );
          }
        }

        subtotal += itemSubtotal;
      }

      subtotal = Math.round(subtotal * 100) / 100;

      if (descontoNum > subtotal) {
        throw new Error("Desconto não pode ser maior que o subtotal dos itens");
      }

      const total = Math.round((subtotal - descontoNum) * 100) / 100;
      const parcelasFinal = metodo_pagamento === "credito" ? parcelasNum : 1;

      const updated = await tx`
        UPDATE vendas SET
          total = ${total},
          desconto = ${descontoNum},
          metodo_pagamento = ${metodo_pagamento},
          parcelas = ${parcelasFinal},
          correcao_justificativa = ${justificativaTrim},
          corrigido_por = ${admin.id},
          corrigido_em = NOW()
        WHERE id = ${vendaId}
        RETURNING *
      `;

      const mudancas: string[] = [];
      if (anterior.metodo_pagamento !== metodo_pagamento || Number(anterior.parcelas) !== parcelasFinal) {
        mudancas.push(
          `Pagamento: ${labelMetodo(String(anterior.metodo_pagamento), Number(anterior.parcelas))} → ${labelMetodo(metodo_pagamento, parcelasFinal)}`
        );
      }
      if (Number(anterior.desconto) !== descontoNum) {
        mudancas.push(
          `Desconto: R$ ${Number(anterior.desconto).toFixed(2)} → R$ ${descontoNum.toFixed(2)}`
        );
      }
      if (Number(anterior.total) !== total) {
        mudancas.push(
          `Total: R$ ${Number(anterior.total).toFixed(2)} → R$ ${total.toFixed(2)}`
        );
      }
      mudancas.push(...mudancasItens);

      const detalhes = mudancas.length > 0 ? mudancas.join("; ") : "Sem alteração de valores";

      await tx`
        INSERT INTO venda_correcoes (
          venda_id, usuario_id, justificativa,
          metodo_anterior, metodo_novo,
          parcelas_anterior, parcelas_novo,
          desconto_anterior, desconto_novo,
          total_anterior, total_novo,
          detalhes
        ) VALUES (
          ${vendaId}, ${admin.id}, ${justificativaTrim},
          ${anterior.metodo_pagamento}, ${metodo_pagamento},
          ${Number(anterior.parcelas)}, ${parcelasFinal},
          ${Number(anterior.desconto)}, ${descontoNum},
          ${Number(anterior.total)}, ${total},
          ${detalhes}
        )
      `;

      return updated[0];
    });

    return NextResponse.json({
      ok: true,
      venda,
      message: `Venda #${venda.numero} atualizada`,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Venda não encontrada") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (
        error.message === "Não é possível editar uma venda estornada" ||
        error.message === "Item não pertence a esta venda" ||
        error.message === "Desconto não pode ser maior que o subtotal dos itens"
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    return handleApiError(error);
  }
}
