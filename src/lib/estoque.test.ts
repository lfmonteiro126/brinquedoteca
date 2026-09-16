import { describe, it, expect } from "vitest";
import {
  calcularEstoqueNovo,
  calcularAjusteEstoqueEstorno,
  temAlertaEstoque,
  parseEstoqueMinimo,
} from "./estoque";

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

describe("temAlertaEstoque", () => {
  it("alerta quando o estoque está no mínimo ou abaixo", () => {
    expect(temAlertaEstoque(5, 5)).toBe(true);
    expect(temAlertaEstoque(2, 5)).toBe(true);
  });

  it("não alerta quando o estoque está acima do mínimo", () => {
    expect(temAlertaEstoque(6, 5)).toBe(false);
  });

  it("desativa o alerta quando o mínimo é zero", () => {
    expect(temAlertaEstoque(0, 0)).toBe(false);
    expect(temAlertaEstoque(3, 0)).toBe(false);
  });
});

describe("parseEstoqueMinimo", () => {
  it("aceita zero para desligar o alerta", () => {
    expect(parseEstoqueMinimo(0)).toBe(0);
    expect(parseEstoqueMinimo("0")).toBe(0);
  });

  it("aceita valores positivos", () => {
    expect(parseEstoqueMinimo(5)).toBe(5);
    expect(parseEstoqueMinimo("8")).toBe(8);
  });

  it("rejeita valores inválidos", () => {
    expect(parseEstoqueMinimo(-1)).toBeNull();
    expect(parseEstoqueMinimo("")).toBeNull();
    expect(parseEstoqueMinimo("abc")).toBeNull();
    expect(parseEstoqueMinimo(1.5)).toBeNull();
  });
});
