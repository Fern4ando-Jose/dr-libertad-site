import { describe, it, expect } from "vitest";
import { parseContentJson, normalizeContentJson, missingEssentialContent } from "./content-json";

// O haiku às vezes embrulha o JSON em prosa/backticks ou o emite malformado.
// Antes, JSON.parse direto quebrava o post SILENCIOSAMENTE. Estes testes fixam
// o comportamento robusto: extrair o objeto e (no route) retentar se inválido.

describe("parseContentJson", () => {
  it("parseia JSON limpo", () => {
    expect(parseContentJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("remove cercas ```json ... ```", () => {
    const raw = '```json\n{"postTitle":"x"}\n```';
    expect(parseContentJson<{ postTitle: string }>(raw)).toEqual({ postTitle: "x" });
  });

  it("extrai o objeto quando há prosa antes/depois", () => {
    const raw = 'Claro! Aqui está:\n{"ok":true}\nEspero que ajude.';
    expect(parseContentJson<{ ok: boolean }>(raw)).toEqual({ ok: true });
  });

  it("lança em JSON estruturalmente malformado (→ o chamador retenta)", () => {
    const raw = '{"a":1,"b":}'; // valor faltando
    expect(() => parseContentJson(raw)).toThrow();
  });
});

// Bug C4: o haiku às vezes OMITE campos (tags/slides). Sem normalizar, content.tags[0]
// lança TypeError ANTES do `?? kw` e derruba a vaga inteira. normalizeContentJson coage
// o tipo (nunca lança) e missingEssentialContent decide se regenera (não publica vazio).
describe("normalizeContentJson — coação de tipos (bug C4)", () => {
  it("JSON SEM tags → tags:[] (não lança em content.tags[0])", () => {
    const c = normalizeContentJson(parseContentJson('{"postTitle":"t","slides":["a"],"cta":"c?"}'));
    expect(c.tags).toEqual([]);
    expect(c.tags[0] ?? "kw").toBe("kw"); // exatamente o acesso que quebrava
  });

  it("JSON SEM slides → slides:[] (content.slides.map não lança)", () => {
    const c = normalizeContentJson(parseContentJson('{"postTitle":"t","cta":"c?"}'));
    expect(c.slides).toEqual([]);
    expect(() => c.slides.map((s) => s)).not.toThrow();
  });

  it("campos de tipo errado (slides=string, tags=number) → arrays vazios", () => {
    const c = normalizeContentJson({ postTitle: "t", slides: "não é array", cta: "c?", tags: 5 });
    expect(c.slides).toEqual([]);
    expect(c.tags).toEqual([]);
  });

  it("filtra itens não-string dentro dos arrays", () => {
    const c = normalizeContentJson({ slides: ["a", 2, null, "b"], tags: ["x", {}] });
    expect(c.slides).toEqual(["a", "b"]);
    expect(c.tags).toEqual(["x"]);
  });

  it("preserva campos válidos e opcionais (videoQueries)", () => {
    const c = normalizeContentJson({ postTitle: "t", slides: ["a"], cta: "c?", tags: ["x"], videoQueries: ["q"] });
    expect(c.postTitle).toBe("t");
    expect(c.videoQueries).toEqual(["q"]);
  });
});

describe("missingEssentialContent — regenerar em vez de publicar vazio (bug C4)", () => {
  it("conteúdo completo → nada faltando", () => {
    expect(missingEssentialContent({ postTitle: "t", slides: ["a"], cta: "c?" })).toEqual([]);
  });

  it("slides vazio → 'slides' faltando (senão publicaria carrossel sem insight)", () => {
    expect(missingEssentialContent({ postTitle: "t", slides: [], cta: "c?" })).toEqual(["slides"]);
  });

  it("título/cta em branco (só espaços) contam como ausentes", () => {
    expect(missingEssentialContent({ postTitle: "  ", slides: ["a"], cta: "" })).toEqual(["postTitle", "cta"]);
  });
});
