// Invariantes do funil PRÓPRIO "I Love Dopamina" — o que NÃO pode regredir:
//  (1) a captura é ISOLADA: FONTE sempre "i-love-dopamina" (nunca "quiz-100-dias");
//  (2) sem env de lista, NÃO inventa listIds (só grava atributos);
//  (3) a faixa do quiz vira atributo de segmentação; a prévia entra SEM faixa;
//  (4) o cálculo de faixa respeita os limites 0-5 / 6-12 / 13-18 / 19-24.
import { describe, it, expect, afterEach } from "vitest";
import {
  buildContactPayload,
  isFaixa,
  previaTemplateId,
  buildPreviaEmailPayload,
  previaSender,
} from "./brevo-dopamina";
import { dopaminaContent, faixaForScore } from "@/components/dopamina/dopamina.content";

const savedEnv = { ...process.env };
afterEach(() => {
  process.env = { ...savedEnv };
});

describe("captura do funil I Love Dopamina — isolamento", () => {
  it("FONTE é sempre 'i-love-dopamina' (nunca cai no funil 100 dias)", () => {
    const p = buildContactPayload({ email: "a@b.com", lang: "br", source: "quiz", faixa: "vermelho", score: 15 });
    const attrs = p.attributes as Record<string, unknown>;
    expect(attrs.FONTE).toBe("i-love-dopamina");
    expect(attrs.FONTE).not.toBe("quiz-100-dias");
  });

  it("sem BREVO_LIST_DOPAMINA_* → NÃO inventa listIds", () => {
    delete process.env.BREVO_LIST_DOPAMINA_BR;
    const p = buildContactPayload({ email: "a@b.com", lang: "br", source: "previa" });
    expect(p.listIds).toBeUndefined();
  });

  it("com env de lista válida → adiciona o contato àquela lista", () => {
    process.env.BREVO_LIST_DOPAMINA_ES = "42";
    const p = buildContactPayload({ email: "a@b.com", lang: "es", source: "quiz", faixa: "verde", score: 3 });
    expect(p.listIds).toEqual([42]);
  });

  it("quiz grava FAIXA + score; prévia entra sem faixa", () => {
    const quiz = buildContactPayload({ email: "a@b.com", lang: "br", source: "quiz", faixa: "critico", score: 22 });
    const qa = quiz.attributes as Record<string, unknown>;
    expect(qa.FAIXA).toBe("critico");
    expect(qa.QUIZ_SCORE).toBe(22);
    expect(qa.ORIGEM_FUNIL).toBe("quiz");

    const previa = buildContactPayload({ email: "a@b.com", lang: "br", source: "previa" });
    const pa = previa.attributes as Record<string, unknown>;
    expect(pa.FAIXA).toBeUndefined();
    expect(pa.QUIZ_SCORE).toBeUndefined();
    expect(pa.ORIGEM_FUNIL).toBe("previa");
  });

  it("isFaixa aceita só as 4 faixas conhecidas", () => {
    expect(isFaixa("verde")).toBe(true);
    expect(isFaixa("critico")).toBe(true);
    expect(isFaixa("roxo")).toBe(false);
    expect(isFaixa(3)).toBe(false);
  });
});

describe("E0 — entrega da prévia (e-mail transacional)", () => {
  it("sem env de template → previaTemplateId é null (envio fica gated, não inventa ID)", () => {
    delete process.env.BREVO_TEMPLATE_DOPAMINA_PREVIA_BR;
    delete process.env.BREVO_TEMPLATE_DOPAMINA_PREVIA;
    expect(previaTemplateId("br")).toBeNull();
  });

  it("env por idioma tem precedência; global é fallback", () => {
    process.env.BREVO_TEMPLATE_DOPAMINA_PREVIA = "9";
    expect(previaTemplateId("es")).toBe(9); // usa o global
    process.env.BREVO_TEMPLATE_DOPAMINA_PREVIA_ES = "42";
    expect(previaTemplateId("es")).toBe(42); // idioma vence
    expect(previaTemplateId("br")).toBe(9); // PT ainda no global
  });

  it("payload leva o destinatário, o templateId e a PREVIA_URL no params (botão de download)", () => {
    const p = buildPreviaEmailPayload({
      email: "lead@exemplo.com",
      lang: "br",
      previaUrl: "https://www.drlibertad.com/lead/I-Love-Dopamina_Previa_PT.pdf",
      templateId: 42,
    });
    expect(p.to).toEqual([{ email: "lead@exemplo.com" }]);
    expect(p.templateId).toBe(42);
    expect((p.params as Record<string, unknown>).PREVIA_URL).toBe(
      "https://www.drlibertad.com/lead/I-Love-Dopamina_Previa_PT.pdf",
    );
    // Sem env de remetente → o template do Brevo define o sender (não forçamos um).
    expect(p.sender).toBeUndefined();
  });

  it("cada idioma sai do SEU domínio autenticado — BR nunca assina pelo ES", () => {
    process.env.BREVO_SENDER_EMAIL_BR = "dopamina@drliberdade.com";
    process.env.BREVO_SENDER_NAME_BR = "Dr. Liberdade";
    process.env.BREVO_SENDER_EMAIL_ES = "dopamina@drlibertad.com";
    process.env.BREVO_SENDER_NAME_ES = "Dr. Libertad";
    expect(previaSender("br")).toEqual({ email: "dopamina@drliberdade.com", name: "Dr. Liberdade" });
    expect(previaSender("es")).toEqual({ email: "dopamina@drlibertad.com", name: "Dr. Libertad" });
    // domínio de terceiro (outlook/gmail) faz o Brevo reescrever o remetente → spam
    for (const lang of ["br", "es"] as const) {
      expect(previaSender(lang)!.email).toMatch(/@drliberdade\.com$|@drlibertad\.com$/);
    }
  });

  it("sem env por idioma, cai no global (legado); sem nenhuma, o template manda", () => {
    delete process.env.BREVO_SENDER_EMAIL_BR;
    delete process.env.BREVO_SENDER_EMAIL;
    expect(previaSender("br")).toBeUndefined();
    process.env.BREVO_SENDER_EMAIL = "contacto@drlibertad.com";
    expect(previaSender("br")).toEqual({ email: "contacto@drlibertad.com" });
  });

  it("sender só entra quando BREVO_SENDER_EMAIL está setado", () => {
    const p = buildPreviaEmailPayload({
      email: "a@b.com",
      lang: "es",
      previaUrl: "https://x/lead.pdf",
      templateId: 1,
      sender: { email: "dr@drlibertad.com", name: "Dr. Libertad" },
    });
    expect(p.sender).toEqual({ email: "dr@drlibertad.com", name: "Dr. Libertad" });
  });
});

describe("cálculo de faixa (0-24)", () => {
  const bands = dopaminaContent.br.bands;
  it("respeita os limites das 4 faixas", () => {
    expect(faixaForScore(0, bands).key).toBe("verde");
    expect(faixaForScore(5, bands).key).toBe("verde");
    expect(faixaForScore(6, bands).key).toBe("amarelo");
    expect(faixaForScore(12, bands).key).toBe("amarelo");
    expect(faixaForScore(13, bands).key).toBe("vermelho");
    expect(faixaForScore(18, bands).key).toBe("vermelho");
    expect(faixaForScore(19, bands).key).toBe("critico");
    expect(faixaForScore(24, bands).key).toBe("critico");
  });
  it("satura fora do intervalo em vez de quebrar", () => {
    expect(faixaForScore(-3, bands).key).toBe("verde");
    expect(faixaForScore(99, bands).key).toBe("critico");
  });
});

describe("conteúdo bem-formado (8 perguntas × 4 opções, PT e ES)", () => {
  for (const lang of ["br", "es"] as const) {
    it(`${lang}: 8 perguntas, cada uma com 4 alternativas`, () => {
      const qs = dopaminaContent[lang].quiz.questions;
      expect(qs).toHaveLength(8);
      for (const q of qs) expect(q.options).toHaveLength(4);
    });
    it(`${lang}: 4 faixas cobrindo 0..24 sem buraco`, () => {
      const b = dopaminaContent[lang].bands;
      expect(b).toHaveLength(4);
      expect(b[0].min).toBe(0);
      expect(b[3].max).toBe(24);
    });
  }
});
