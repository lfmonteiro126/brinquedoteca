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
