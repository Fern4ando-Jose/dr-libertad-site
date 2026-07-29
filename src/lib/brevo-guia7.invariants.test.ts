// Invariantes do funil "Guia de 7 dias" — o que NÃO pode regredir:
//  (1) a captura é ISOLADA: FONTE sempre "guia-7-dias" (nunca cruza com dopamina/100 dias);
//  (2) sem env de lista, NÃO inventa listIds (só grava atributos);
//  (3) UTM opcionais entram como atributos quando presentes;
//  (4) o conteúdo tem exatamente 7 passos, PT e ES.
import { describe, it, expect, afterEach } from "vitest";
import { buildContactPayload, listIdForLang } from "./brevo-guia7";
import { guia7Content } from "@/components/guia7/guia7.content";

const savedEnv = { ...process.env };
afterEach(() => {
  process.env = { ...savedEnv };
});

describe("captura do funil Guia de 7 dias — isolamento", () => {
  it("FONTE é sempre 'guia-7-dias' (nunca cruza com dopamina/100 dias)", () => {
    const p = buildContactPayload({ email: "a@b.com", lang: "br" });
    const attrs = p.attributes as Record<string, unknown>;
    expect(attrs.FONTE).toBe("guia-7-dias");
    expect(attrs.FONTE).not.toBe("i-love-dopamina");
    expect(attrs.ORIGEM_FUNIL).toBe("reel-c");
    expect(attrs.LANG).toBe("br");
  });

  it("sem BREVO_LIST_GUIA7_* → NÃO inventa listIds", () => {
    delete process.env.BREVO_LIST_GUIA7_BR;
    delete process.env.BREVO_LIST_GUIA7_ES;
    const p = buildContactPayload({ email: "a@b.com", lang: "br" });
    expect(p.listIds).toBeUndefined();
    expect(listIdForLang("br")).toBeNull();
  });

  it("com env de lista válida → adiciona o contato àquela lista", () => {
    process.env.BREVO_LIST_GUIA7_ES = "77";
    const p = buildContactPayload({ email: "a@b.com", lang: "es" });
    expect(p.listIds).toEqual([77]);
    expect(listIdForLang("es")).toBe(77);
  });

  it("env de lista inválida (0 / não-número) → null, não quebra", () => {
    process.env.BREVO_LIST_GUIA7_BR = "abc";
    expect(listIdForLang("br")).toBeNull();
    process.env.BREVO_LIST_GUIA7_BR = "0";
    expect(listIdForLang("br")).toBeNull();
  });

  it("UTM opcionais viram atributos quando presentes", () => {
    const p = buildContactPayload({
      email: "a@b.com",
      lang: "br",
      utm: { utm_source: "ig", utm_campaign: "reel-c" },
    });
    const attrs = p.attributes as Record<string, unknown>;
    expect(attrs.UTM_SOURCE).toBe("ig");
    expect(attrs.UTM_CAMPAIGN).toBe("reel-c");
    expect(p.updateEnabled).toBe(true); // idempotente
  });
});

describe("conteúdo do guia — 7 passos, PT e ES", () => {
  for (const lang of ["br", "es"] as const) {
    it(`${lang}: exatamente 7 passos, todos com ação e porquê`, () => {
      const steps = guia7Content[lang].steps;
      expect(steps).toHaveLength(7);
      for (const s of steps) {
        expect(s.dia).toBeTruthy();
        expect(s.titulo).toBeTruthy();
        expect(s.acao.length).toBeGreaterThan(20);
        expect(s.porque.length).toBeGreaterThan(10);
      }
    });
    it(`${lang}: CTA final aponta para a prévia de I Love Dopamina no idioma certo`, () => {
      expect(guia7Content[lang].finalHref).toBe(`/${lang}/livros/i-love-dopamina`);
    });
  }
});
