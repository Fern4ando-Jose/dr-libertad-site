// Invariantes da grade de cor da marca — FONTE ÚNICA (antes redeclarada em
// video/Reel.tsx E video/KenBurns.tsx, risco de drift). Revisão de neuromarketing
// (estrategista-de-atenção, 2026-07-16): variar SÓ intensidade por pilar, NUNCA
// hex/matiz — estes testes travam exatamente essa regra (cor fixa, números variam).
import { describe, it, expect } from "vitest";
import { resolveGrade, gradeFilterCss, DUO_FLOOR, DUO_HIGHLIGHT, WARM_WASH, type Pillar } from "./brand-grade";

const PILLARS: Pillar[] = ["freedom", "dopamine", "anxiety", "network", "self", "mind"];

describe("resolveGrade — os 6 pilares resolvem, mind = BASE exata", () => {
  it("cobre os 6 pilares do DR sem lançar", () => {
    for (const p of PILLARS) {
      const g = resolveGrade(p);
      expect(g.saturate).toBeGreaterThan(0);
      expect(g.contrast).toBeGreaterThan(0);
    }
  });

  it("mind não tem override — é a BASE (comportamento anterior à mudança)", () => {
    const g = resolveGrade("mind");
    expect(g).toEqual({
      saturate: 0.52,
      contrast: 1.16,
      brightness: 0.95,
      sepia: 0.2,
      floorOpacity: 1.0,
      highlightOpacity: 1.0,
      washOpacity: 0.18,
    });
  });

  it("pilar desconhecido/ausente → cai no default 'mind' (fail-safe)", () => {
    expect(resolveGrade(undefined)).toEqual(resolveGrade("mind"));
    expect(resolveGrade("pilar-que-nao-existe")).toEqual(resolveGrade("mind"));
  });

  it("cada pilar com override produz um resultado DIFERENTE de mind (a variação existe)", () => {
    for (const p of PILLARS.filter((x) => x !== "mind")) {
      expect(resolveGrade(p)).not.toEqual(resolveGrade("mind"));
    }
  });
});

describe("gradeFilterCss — string CSS válida, muda só o NÚMERO por pilar", () => {
  it("gera os 4 componentes do filtro (saturate/contrast/brightness/sepia)", () => {
    const css = gradeFilterCss("freedom");
    expect(css).toMatch(/^saturate\([\d.]+\) contrast\([\d.]+\) brightness\([\d.]+\) sepia\([\d.]+\)$/);
  });

  it("pilares diferentes produzem CSS diferente (a intensidade varia)", () => {
    expect(gradeFilterCss("anxiety")).not.toBe(gradeFilterCss("dopamine"));
  });
});

// A revisão de neuromarketing foi explícita: NUNCA trocar hex/matiz — só as 3
// constantes de cor abaixo existem no módulo inteiro, e resolveGrade não expõe
// nenhum campo de cor (só multiplicadores/opacidade) — travando isso por tipo.
describe("cor duotone é FIXA — só intensidade/opacidade varia (trava de marca)", () => {
  it("DUO_FLOOR/DUO_HIGHLIGHT/WARM_WASH são os hex travados 2026-07-14/16", () => {
    expect(DUO_FLOOR).toBe("#1F1A18");
    expect(DUO_HIGHLIGHT).toBe("#ECDCC4");
    expect(WARM_WASH).toBe("#5A4636");
  });

  it("o objeto de grade NÃO tem nenhuma chave de cor (só números de intensidade)", () => {
    const g = resolveGrade("dopamine");
    const keys = Object.keys(g);
    expect(keys).toEqual(["saturate", "contrast", "brightness", "sepia", "floorOpacity", "highlightOpacity", "washOpacity"]);
    for (const v of Object.values(g)) expect(typeof v).toBe("number");
  });
});
