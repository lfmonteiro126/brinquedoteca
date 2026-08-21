import { describe, it, expect } from "vitest";
import { calcularEstoqueNovo } from "./estoque";

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
