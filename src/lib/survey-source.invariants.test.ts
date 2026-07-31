import { describe, expect, it } from "vitest";
import {
  SOURCE_DIRECT_LABEL,
  SOURCE_TAG_MAX_LEN,
  normalizeSource,
  readSourceFromQuery,
  sanitizeTag,
  sourceKey,
} from "./survey-source";

describe("survey-source — etiqueta de campanha", () => {
  it("normaliza etiqueta: minúscula, sem espaço, sem caractere exótico", () => {
    expect(sanitizeTag("  Meta Ads  ")).toBe("meta-ads");
    expect(sanitizeTag("PESQUISA_BR/01")).toBe("pesquisa_br-01");
    expect(sanitizeTag("reel “gancho”")).toBe("reel-gancho");
  });

  it("recusa o que não é etiqueta", () => {
    expect(sanitizeTag("")).toBeNull();
    expect(sanitizeTag("   ")).toBeNull();
    expect(sanitizeTag("---")).toBeNull();
    expect(sanitizeTag(42)).toBeNull();
    expect(sanitizeTag(null)).toBeNull();
    expect(sanitizeTag(["ig"])).toBeNull();
  });

  it("corta etiqueta gigante no teto (nada de payload inflado)", () => {
    const long = "a".repeat(500);
    expect(sanitizeTag(long)!.length).toBe(SOURCE_TAG_MAX_LEN);
  });

  it("aceita as duas formas (utm_* da URL e s/m/c/n já gravado)", () => {
    expect(normalizeSource({ utm_source: "ig", utm_medium: "cpc", utm_campaign: "pesquisa-br", utm_content: "reelA" }))
      .toEqual({ s: "ig", m: "cpc", c: "pesquisa-br", n: "reela" });
    expect(normalizeSource({ s: "fb", c: "teste" })).toEqual({ s: "fb", c: "teste" });
  });

  it("ignora chave desconhecida — só utm entra no banco", () => {
    const out = normalizeSource({ utm_source: "ig", email: "alguem@exemplo.com", ip: "1.2.3.4", nome: "Fulano" });
    expect(out).toEqual({ s: "ig" });
  });

  it("entrada inválida vira objeto vazio (nunca quebra o envio)", () => {
    for (const bad of [null, undefined, "ig", 7, ["ig"]]) {
      expect(normalizeSource(bad)).toEqual({});
    }
  });

  it("lê a marcação da query string, com ?src= como atalho", () => {
    expect(readSourceFromQuery("?utm_source=ig&utm_medium=cpc&utm_campaign=pesq")).toEqual({
      s: "ig",
      m: "cpc",
      c: "pesq",
    });
    expect(readSourceFromQuery("src=bio")).toEqual({ s: "bio" });
    expect(readSourceFromQuery("")).toEqual({});
  });

  it("sem marcação nenhuma, a resposta é agrupada como direto", () => {
    expect(sourceKey({})).toBe(SOURCE_DIRECT_LABEL);
    expect(sourceKey(null)).toBe(SOURCE_DIRECT_LABEL);
    expect(sourceKey({ s: "ig", m: "cpc", c: "pesquisa-br" })).toBe("ig / cpc / pesquisa-br");
  });
});
