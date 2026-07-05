import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate } from "./format";

describe("formatCurrency", () => {
  it("formata valor zero", () => {
    expect(formatCurrency(0)).toBe("R$\u00a00,00");
  });

  it("formata valores inteiros", () => {
    expect(formatCurrency(100)).toContain("100");
  });

  it("formata valores decimais", () => {
    const result = formatCurrency(19.9);
    expect(result).toContain("19");
    expect(result).toContain("90");
  });

  it("formata valores negativos", () => {
    const result = formatCurrency(-50);
    expect(result).toContain("50");
  });
});

describe("formatDate", () => {
  it("formata data ISO", () => {
    const result = formatDate("2026-07-05T14:30:00");
    expect(result).toContain("05");
    expect(result).toContain("07");
    expect(result).toContain("2026");
  });

  it("retorna string para qualquer input", () => {
    const result = formatDate("2024-01-01");
    expect(typeof result).toBe("string");
  });
});
