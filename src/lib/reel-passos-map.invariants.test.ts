// Invariante do mapeamento redator → ReelPassos (scripts/reel-passos-map.cjs).
// O redator continua gerando title+slides+cta (mesmo pipeline: revisor editorial,
// guarda §8, trava anti-idioma) — este mapa só reorganiza o QUE JÁ SAIU DELE em
// steps[]. Este teste barra o merge se o mapa parar de preservar título/slides/
// cta, ou passar a inventar texto que o redator não gerou.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { mapContentToPassosSteps } = require("../../scripts/reel-passos-map.cjs") as {
  mapContentToPassosSteps: (content: { title?: unknown; slides?: unknown; cta?: unknown }) => {
    steps: { text: string }[];
    cta: string;
  };
};

describe("mapContentToPassosSteps (redator → ReelPassos)", () => {
  it("título vira o 1º passo, cada slide vira um passo, cta fica separado", () => {
    const r = mapContentToPassosSteps({
      title: "El algoritmo no te conoce",
      slides: ["Te muestra lo que te retiene, no lo que te ayuda", "La app no es tu amiga"],
      cta: "¿Cuál es tu primer paso hoy?",
    });
    expect(r.steps).toEqual([
      { text: "El algoritmo no te conoce" },
      { text: "Te muestra lo que te retiene, no lo que te ayuda" },
      { text: "La app no es tu amiga" },
    ]);
    expect(r.cta).toBe("¿Cuál es tu primer paso hoy?");
  });

  it("NUNCA inventa texto — não gera passo além do title+slides recebidos", () => {
    const r = mapContentToPassosSteps({ title: "T", slides: ["A", "B", "C"], cta: "X" });
    expect(r.steps.map((s) => s.text)).toEqual(["T", "A", "B", "C"]);
  });

  it("preserva a ORDEM (título primeiro, slides na ordem original)", () => {
    const r = mapContentToPassosSteps({ title: "Primeiro", slides: ["Segundo", "Terceiro"], cta: "" });
    expect(r.steps[0].text).toBe("Primeiro");
    expect(r.steps[1].text).toBe("Segundo");
    expect(r.steps[2].text).toBe("Terceiro");
  });

  it("descarta slide vazio/whitespace (não vira passo em branco)", () => {
    const r = mapContentToPassosSteps({ title: "T", slides: ["A", "   ", "", "B"], cta: "C" });
    expect(r.steps.map((s) => s.text)).toEqual(["T", "A", "B"]);
  });

  it("sem título, os passos vêm só dos slides (não quebra)", () => {
    const r = mapContentToPassosSteps({ title: "", slides: ["A", "B"], cta: "C" });
    expect(r.steps.map((s) => s.text)).toEqual(["A", "B"]);
  });

  it("slides ausente/inválido não derruba — devolve só o título", () => {
    const r = mapContentToPassosSteps({ title: "T", slides: undefined, cta: "C" });
    expect(r.steps).toEqual([{ text: "T" }]);
  });

  it("entrada vazia/inválida devolve steps vazio e cta vazio (fail-open, sem lançar)", () => {
    expect(mapContentToPassosSteps({})).toEqual({ steps: [], cta: "" });
    expect(mapContentToPassosSteps(null as unknown as { title?: unknown })).toEqual({ steps: [], cta: "" });
  });

  it("cta sem string vira string vazia (nunca undefined/objeto)", () => {
    const r = mapContentToPassosSteps({ title: "T", slides: [], cta: undefined });
    expect(r.cta).toBe("");
  });
});
