import { describe, it, expect } from "vitest";
import { escapeHtml } from "./sanitize";

describe("escapeHtml", () => {
  it("escapa caracteres HTML perigosos", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    );
  });

  it("escapa & (ampersand)", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapa aspas duplas", () => {
    expect(escapeHtml('foo "bar"')).toBe("foo &quot;bar&quot;");
  });

  it("escapa aspas simples", () => {
    expect(escapeHtml("it's")).toBe("it&#039;s");
  });

  it("não altera texto limpo", () => {
    expect(escapeHtml("Hello World 123")).toBe("Hello World 123");
  });

  it("escapa caracteres mistos", () => {
    expect(escapeHtml('<b>"\'&</b>')).toBe("&lt;b&gt;&quot;&#039;&amp;&lt;/b&gt;");
  });
});
