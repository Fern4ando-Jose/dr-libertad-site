import { describe, expect, it } from "vitest";
import {
  COUNTRY_UNKNOWN,
  SOURCE_DIRECT_LABEL,
  SOURCE_TAG_MAX_LEN,
  normalizeSource,
  readSourceFromQuery,
  countryFromHeaders,
  normalizeCountry,
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

  it("país: só ISO alfa-2, sempre em maiúsculo", () => {
    expect(normalizeCountry("br")).toBe("BR");
    expect(normalizeCountry(" mx ")).toBe("MX");
    for (const bad of ["BRA", "B", "", "1A", null, 55, ["BR"]]) {
      expect(normalizeCountry(bad)).toBeNull();
    }
    expect(COUNTRY_UNKNOWN).toBe("??");
  });

  it("país sai do cabeçalho da plataforma (Vercel, com Cloudflare de reserva)", () => {
    expect(countryFromHeaders(new Headers({ "x-vercel-ip-country": "pt" }))).toBe("PT");
    expect(countryFromHeaders(new Headers({ "cf-ipcountry": "AR" }))).toBe("AR");
    // O cabeçalho da Vercel manda; nada vem do corpo enviado pelo cliente.
    expect(countryFromHeaders(new Headers({ "x-vercel-ip-country": "ES", "cf-ipcountry": "US" }))).toBe("ES");
    expect(countryFromHeaders(new Headers())).toBeNull();
  });

  it("sem marcação nenhuma, a resposta é agrupada como direto", () => {
    expect(sourceKey({})).toBe(SOURCE_DIRECT_LABEL);
    expect(sourceKey(null)).toBe(SOURCE_DIRECT_LABEL);
    expect(sourceKey({ s: "ig", m: "cpc", c: "pesquisa-br" })).toBe("ig / cpc / pesquisa-br");
  });
});
