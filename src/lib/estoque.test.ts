import { describe, it, expect } from "vitest";
import { calcularEstoqueNovo, calcularAjusteEstoqueEstorno } from "./estoque";

describe("calcularEstoqueNovo", () => {
  it("devolve unidades no estorno", () => {
    expect(calcularEstoqueNovo("estorno", 0, 2)).toBe(2);
    expect(calcularEstoqueNovo("estorno", 5, 3)).toBe(8);
  });

  it("aumenta estoque em entrada", () => {
    expect(calcularEstoqueNovo("entrada", 1, 4)).toBe(5);
  });

  it("baixa estoque em venda e saída", () => {
    expect(calcularEstoqueNovo("venda", 10, 3)).toBe(7);
    expect(calcularEstoqueNovo("saida", 4, 4)).toBe(0);
  });
});

describe("calcularAjusteEstoqueEstorno", () => {
  it("devolve o dobro quando o estorno antigo baixou o estoque", () => {
    expect(calcularAjusteEstoqueEstorno(1, -1)).toBe(2);
  });

  it("não altera estoque quando o estorno já devolveu as unidades", () => {
    expect(calcularAjusteEstoqueEstorno(1, 1)).toBe(0);
  });

  it("devolve a quantidade quando a venda foi marcada sem movimentação", () => {
    expect(calcularAjusteEstoqueEstorno(1, 0)).toBe(1);
  });
});
