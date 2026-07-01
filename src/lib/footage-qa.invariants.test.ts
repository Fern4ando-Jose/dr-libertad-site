// Invariante do QA de conteúdo do footage (incidente 2026-07-01: Reel com macro de
// pele/nudez). O juiz de visão olha o poster do clipe; o PARSER do veredito é
// FAIL-SAFE — na dúvida REJEITA (melhor perder um clipe que publicar algo impróprio
// numa marca de psicologia). Espelhado em scripts/fetch-footage.mjs (mesmo contrato).
import { describe, it, expect } from "vitest";
import { parseFootageVerdict } from "./footage-qa";

describe("parseFootageVerdict — fail-safe (bug footage 07-01)", () => {
  it("aprova quando o modelo diz reject:false", () => {
    expect(parseFootageVerdict('{"reject": false, "reason": "clear scene"}')).toEqual({ reject: false, reason: "clear scene" });
  });

  it("rejeita quando o modelo diz reject:true", () => {
    expect(parseFootageVerdict('{"reject": true, "reason": "skin macro"}')).toEqual({ reject: true, reason: "skin macro" });
  });

  it("extrai o JSON mesmo com prosa/backticks em volta", () => {
    const raw = 'Here is my verdict:\n```json\n{"reject": true, "reason": "nudity"}\n```';
    expect(parseFootageVerdict(raw).reject).toBe(true);
  });

  it("veredito ILEGÍVEL (sem JSON) → REJEITA (fail-safe)", () => {
    expect(parseFootageVerdict("não sei dizer").reject).toBe(true);
  });

  it("JSON malformado → REJEITA (fail-safe)", () => {
    expect(parseFootageVerdict('{"reject": tru').reject).toBe(true);
  });

  it("reject não-booleano (tipo errado) → REJEITA (fail-safe)", () => {
    expect(parseFootageVerdict('{"reject": "yes"}').reject).toBe(true);
  });

  it("entrada não-string (undefined/objeto) → REJEITA (fail-safe)", () => {
    expect(parseFootageVerdict(undefined).reject).toBe(true);
    expect(parseFootageVerdict({} as unknown).reject).toBe(true);
  });
});
