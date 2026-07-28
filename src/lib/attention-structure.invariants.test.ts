// Invariantes de la Estructura de Atención inyectada en el prompt de generateContent.
// La régua (fuente única) es .claude/marca/atencao/ESTRUTURA-ATENCAO.html: 5 ranuras
// fijas + portón de 4 preguntas + persuasión prohibida. Aquí probamos OFFLINE que el
// bloque codifica esa MECÁNICA (genérica y reutilizable), sin llamar a ninguna API paga
// (P2) y sin hardcodear reframes-título concretos (P4 — eso es contenido del dueño).
import { describe, it, expect } from "vitest";
import {
  ATTENTION_STRUCTURE,
  ATTENTION_GATE,
  FORBIDDEN_PERSUASION,
  buildAttentionMechanics,
} from "./attention-structure";

describe("ATTENTION_STRUCTURE — las 5 ranuras fijas (el molde)", () => {
  const s = ATTENTION_STRUCTURE.toUpperCase();
  it("nombra las 5 ranuras en orden", () => {
    expect(s).toContain("RANURA 1");
    expect(s).toContain("RANURA 2");
    expect(s).toContain("RANURA 3");
    expect(s).toContain("RANURA 4");
    expect(s).toContain("RANURA 5");
    // orden: 1 aparece antes que 5
    expect(ATTENTION_STRUCTURE.indexOf("RANURA 1")).toBeLessThan(
      ATTENTION_STRUCTURE.indexOf("RANURA 5"),
    );
  });
  it("cada ranura lleva su mecánica: gancho, verdad, micro-prueba, frase-espejo, CTA", () => {
    expect(s).toContain("GANCHO");
    expect(s).toContain("VERDAD DESMITIFICADORA");
    expect(s).toContain("MICRO-PRUEBA");
    expect(s).toContain("FRASE-ESPEJO");
    expect(s).toContain("CTA");
  });
  it("mapea las ranuras sobre los campos EXISTENTES (no cambia el esquema)", () => {
    expect(ATTENTION_STRUCTURE).toContain("postTitle");
    expect(ATTENTION_STRUCTURE).toContain("slide 1");
    expect(ATTENTION_STRUCTURE).toContain("slide 2");
    expect(ATTENTION_STRUCTURE).toContain("slide 3");
    expect(ATTENTION_STRUCTURE).toContain('"cta"');
    // no pide slides nuevos ni "slide 4/5"
    expect(ATTENTION_STRUCTURE).not.toContain("slide 4");
    expect(ATTENTION_STRUCTURE).not.toContain("slide 5");
  });
  it("micro-prueba = MECANISMO, nunca estadística inventada (par con credibilidad)", () => {
    expect(ATTENTION_STRUCTURE).toContain("MECANISMO");
    expect(s).toContain("NUNCA UNA ESTADÍSTICA");
  });
});

describe("ATTENTION_GATE — el portón de 4 preguntas", () => {
  const g = ATTENTION_GATE;
  it("tiene exactamente 4 preguntas numeradas", () => {
    expect(g).toMatch(/1\)/);
    expect(g).toMatch(/2\)/);
    expect(g).toMatch(/3\)/);
    expect(g).toMatch(/4\)/);
    expect(g).not.toMatch(/5\)/);
  });
  it("cubre las 4 dimensiones del portón de la régua", () => {
    const u = g.toUpperCase();
    expect(u).toContain("GANCHO EN 3S"); // 1
    expect(u).toContain("DOR NOMBRADA"); // 2
    expect(u).toContain("MOTIVO-DE-COMPARTIR"); // 3
    expect(u).toContain("SUSTANCIA DESMITIFICADORA"); // 4
  });
  it("prohíbe la promesa mágica (marca científico-leve, no autoayuda)", () => {
    expect(g.toUpperCase()).toContain("JAMÁS");
    expect(g).toMatch(/5 minutos/i);
  });
});

describe("FORBIDDEN_PERSUASION — el gate ético (sid 621)", () => {
  const f = FORBIDDEN_PERSUASION.toUpperCase();
  it("banea las 4 clases de persuasión manipuladora de la pendencia", () => {
    expect(f).toContain("ESCASEZ"); // escasez/urgencia artificial
    expect(f).toContain("URGENCIA ARTIFICIAL");
    expect(f).toContain("PRUEBA SOCIAL VANIDOSA");
    expect(f).toContain("AUTORIDAD"); // autoridad/gurú
    expect(f).toContain("GURÚ");
    expect(f).toContain("CTA MANIPULADOR");
  });
});

describe("buildAttentionMechanics — bloque completo del prompt", () => {
  const block = buildAttentionMechanics();
  it("junta estructura + portón + persuasión prohibida", () => {
    expect(block).toContain(ATTENTION_STRUCTURE);
    expect(block).toContain(ATTENTION_GATE);
    expect(block).toContain(FORBIDDEN_PERSUASION);
  });
  it("es MECÁNICA genérica: NO hardcodea reframes-título concretos (P4)", () => {
    const lower = block.toLowerCase();
    // ejemplos citados como PROHIBIDOS en el brief de la misión — no deben estar fijados
    expect(lower).not.toContain("secuestrado");
    expect(lower).not.toContain("sequestrado");
    expect(lower).not.toContain("preguiçoso");
    expect(lower).not.toContain("perezoso");
  });
  it("respeta la voz de marca: promesa de ENTENDIMIENTO, no de cura mágica", () => {
    expect(block).toContain("ENTENDIMIENTO");
  });
});
