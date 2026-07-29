import { describe, expect, it } from "vitest";
import { IG_CAPTION_MAX, SURVEY_CTA, appendSurveyCta } from "./caption-cta";

describe("caption-cta — CTA da pesquisa no rodapé da legenda (append-only, fail-open)", () => {
  it("anexa o CTA PT na conta PT e ES na ES, separado por linha em branco", () => {
    expect(appendSurveyCta("Legenda do post.", "br")).toBe(`Legenda do post.\n\n${SURVEY_CTA.br}`);
    expect(appendSurveyCta("Leyenda del post.", "es")).toBe(`Leyenda del post.\n\n${SURVEY_CTA.es}`);
  });

  it("lang desconhecido cai no ES (default da conta original) — nunca lança", () => {
    expect(appendSurveyCta("Leyenda.", "xx")).toBe(`Leyenda.\n\n${SURVEY_CTA.es}`);
  });

  it("APPEND-ONLY: a legenda original fica intacta no início", () => {
    const caption = "Gancho forte.\n\nDesenvolvimento.\n\n#tag1 #tag2";
    const out = appendSurveyCta(caption, "br");
    expect(out.startsWith(caption)).toBe(true);
  });

  it("IDEMPOTENTE: retry do watchdog não duplica o CTA", () => {
    const once = appendSurveyCta("Legenda.", "br");
    const twice = appendSurveyCta(once, "br");
    expect(twice).toBe(once);
    expect(twice.split(SURVEY_CTA.br).length - 1).toBe(1);
  });

  it("FAIL-OPEN no limite do IG: se o CTA não couber em 2200, publica a legenda SEM ele", () => {
    const longCaption = "x".repeat(IG_CAPTION_MAX - 10); // CTA não cabe
    expect(appendSurveyCta(longCaption, "br")).toBe(longCaption);
    const justFits = "x".repeat(IG_CAPTION_MAX - (SURVEY_CTA.es.length + 2)); // cabe exato
    const out = appendSurveyCta(justFits, "es");
    expect(out.endsWith(SURVEY_CTA.es)).toBe(true);
    expect(out.length).toBeLessThanOrEqual(IG_CAPTION_MAX);
  });

  it("nunca produz legenda acima do limite do IG a partir de legenda válida", () => {
    for (const len of [0, 1, 500, 2000, 2090, 2101, IG_CAPTION_MAX]) {
      const out = appendSurveyCta("y".repeat(len), "br");
      expect(out.length).toBeLessThanOrEqual(IG_CAPTION_MAX);
    }
  });

  it("FAIL-OPEN em legenda vazia/nula: devolve como veio, não inventa", () => {
    expect(appendSurveyCta("", "br")).toBe("");
    expect(appendSurveyCta(null, "br")).toBe("");
    expect(appendSurveyCta(undefined, "es")).toBe("");
    expect(appendSurveyCta("   ", "br")).toBe("   ");
  });

  it("pureza de idioma: CTA PT não contém palavra inequívoca ES e vice-versa", () => {
    // Compatibilidade com o lang-guard (que roda antes, na geração): o texto
    // anexado é 100% no idioma da conta.
    expect(SURVEY_CTA.br).not.toMatch(/investigación|¿|anónima|las redes/);
    expect(SURVEY_CTA.es).not.toMatch(/pesquisa|estão|anônima|relacionamentos/);
  });
});
