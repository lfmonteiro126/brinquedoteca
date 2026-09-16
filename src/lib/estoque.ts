const TIPOS_QUE_DEVOLVEM_ESTOQUE = new Set(["entrada", "estorno"]);

export function calcularEstoqueNovo(
  tipo: string,
  estoqueAnterior: number,
  quantidade: number
): number {
  return TIPOS_QUE_DEVOLVEM_ESTOQUE.has(tipo)
    ? estoqueAnterior + quantidade
    : estoqueAnterior - quantidade;
}

/** Quantidade que ainda falta devolver ao estoque após um estorno. */
export function calcularAjusteEstoqueEstorno(
  quantidadeItem: number,
  netMovimentacoesEstorno: number
): number {
  return Math.max(0, quantidadeItem - netMovimentacoesEstorno);
}

/**
 * Estoque mínimo 0 desativa o alerta. Produtos sem limite não entram na lista
 * de reposição, mesmo com estoque zerado (esse caso fica em "sem estoque").
 */
export const SQL_ESTOQUE_BAIXO = "estoque_minimo > 0 AND estoque <= estoque_minimo";

export function temAlertaEstoque(estoque: number, estoqueMinimo: number): boolean {
  return estoqueMinimo > 0 && estoque <= estoqueMinimo;
}

/** Aceita 0; rejeita vazio, NaN e valores negativos. */
export function parseEstoqueMinimo(value: unknown): number | null {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
}
