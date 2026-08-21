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
