import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, normalizeImageUrl } from "./format";

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

describe("normalizeImageUrl", () => {
  it("retorna vazio para string vazia", () => {
    expect(normalizeImageUrl("")).toBe("");
    expect(normalizeImageUrl("   ")).toBe("");
  });

  it("preserva data URLs de imagem (upload)", () => {
    const dataUrl = "data:image/jpeg;base64,/9j/4AAQ";
    expect(normalizeImageUrl(dataUrl)).toBe(dataUrl);
  });

  it("aceita URLs https arbitrárias", () => {
    expect(normalizeImageUrl("https://cdn.example.com/foto.jpg")).toBe(
      "https://cdn.example.com/foto.jpg"
    );
  });

  it("adiciona https em URLs sem protocolo", () => {
    expect(normalizeImageUrl("i.imgur.com/abc123.jpg")).toBe(
      "https://i.imgur.com/abc123.jpg"
    );
  });

  it("converte link curto do Imgur para i.imgur.com", () => {
    expect(normalizeImageUrl("https://imgur.com/abc123")).toBe(
      "https://i.imgur.com/abc123.jpg"
    );
  });

  it("rejeita álbuns do Imgur", () => {
    expect(normalizeImageUrl("https://imgur.com/a/album123")).toBe("");
  });

  it("rejeita texto que não é URL", () => {
    expect(normalizeImageUrl("nao-e-uma-url")).toBe("");
  });
});
