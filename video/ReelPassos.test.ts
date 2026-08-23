// Trava os invariantes puros do `ReelPassos` (composição NOVA, molde grid+numeral+
// barra-de-progresso). Nenhum destes testes renderiza JSX/Chromium — cobrem a mesma
// classe de defeito que os testes de tempo do ReelV2 (`ReelV2.sync.test.ts`):
//   1. a barra de progresso avança certo (activeIndexAtFrame);
//   2. o numeral do passo bate com o índice (numeralFor/labelFor × scene.stepIndex);
//   3. nenhum frame fica sem conteúdo (cenas contíguas, sem buraco nem sobreposição).
import { describe, it, expect } from "vitest";
import {
  reelDurationsPassos,
  reelPlanPassos,
  activeIndexAtFrame,
  numeralFor,
  labelFor,
  stepWord,
  doneWord,
  reelPassosDefaultProps,
} from "./ReelPassos";
import { FPS } from "./Reel";

describe("reelPlanPassos — nenhum frame fica sem conteúdo", () => {
  it("as cenas são contíguas desde o frame 0, sem buraco nem sobreposição", () => {
    for (const stepsCount of [1, 2, 3, 4, 5, 8]) {
      const plan = reelPlanPassos(stepsCount);
      let expected = 0;
      for (const s of plan.scenes) {
        expect(s.fromFrame).toBe(expected);
        expect(s.durationInFrames).toBeGreaterThanOrEqual(1);
        expected += s.durationInFrames;
      }
      expect(plan.total).toBe(expected);
    }
  });

  it("todo frame de 0 até total-1 pertence a EXATAMENTE uma cena", () => {
    const plan = reelPlanPassos(4);
    for (let f = 0; f < plan.total; f++) {
      const owners = plan.scenes.filter((s) => f >= s.fromFrame && f < s.fromFrame + s.durationInFrames);
      expect(owners).toHaveLength(1);
    }
  });

  it("a última cena é sempre o CTA, e vem depois de todos os passos", () => {
    const plan = reelPlanPassos(5);
    const last = plan.scenes[plan.scenes.length - 1];
    expect(last.kind).toBe("cta");
    const steps = plan.scenes.filter((s) => s.kind === "step");
    expect(steps).toHaveLength(plan.n);
    expect(last.fromFrame).toBe(steps[steps.length - 1].fromFrame + steps[steps.length - 1].durationInFrames);
  });

  it("nº de passos é limitado a [1,8] — nunca 0, nunca cena vazia", () => {
    expect(reelDurationsPassos(0).n).toBe(1);
    expect(reelDurationsPassos(-3).n).toBe(1);
    expect(reelDurationsPassos(99).n).toBe(8);
  });
});

describe("activeIndexAtFrame — a barra de progresso avança certo", () => {
  it("dentro da janela de cada passo, o índice ativo é o stepIndex daquela cena", () => {
    const plan = reelPlanPassos(4);
    for (const scene of plan.scenes) {
      if (scene.kind !== "step") continue;
      const mid = scene.fromFrame + Math.floor(scene.durationInFrames / 2);
      expect(activeIndexAtFrame(mid, plan)).toBe(scene.stepIndex);
      expect(activeIndexAtFrame(scene.fromFrame, plan)).toBe(scene.stepIndex);
      expect(activeIndexAtFrame(scene.fromFrame + scene.durationInFrames - 1, plan)).toBe(scene.stepIndex);
    }
  });

  it("durante o bloco de CTA, o índice ativo é n (concluído — todos os marcadores acesos)", () => {
    const plan = reelPlanPassos(4);
    const cta = plan.scenes[plan.scenes.length - 1];
    expect(activeIndexAtFrame(cta.fromFrame, plan)).toBe(plan.n);
    expect(activeIndexAtFrame(cta.fromFrame + cta.durationInFrames - 1, plan)).toBe(plan.n);
  });

  it("o índice ativo NUNCA regride — avança monotonicamente do início ao fim", () => {
    const plan = reelPlanPassos(6);
    let prev = -1;
    for (let f = 0; f < plan.total; f += 3) {
      const idx = activeIndexAtFrame(f, plan);
      expect(idx).toBeGreaterThanOrEqual(prev);
      prev = idx;
    }
    expect(prev).toBe(plan.n); // termina "concluído"
  });

  it("fail-safe: frame negativo ou além do total nunca deixa a barra sem posição", () => {
    const plan = reelPlanPassos(3);
    expect(activeIndexAtFrame(-10, plan)).toBe(0);
    expect(activeIndexAtFrame(plan.total + 999, plan)).toBe(plan.n);
  });
});

describe("numeralFor / labelFor — o numeral do passo bate com o índice", () => {
  it("numeralFor pad-a com zero e é 1-based (índice 0 → \"01\")", () => {
    expect(numeralFor(0)).toBe("01");
    expect(numeralFor(1)).toBe("02");
    expect(numeralFor(8)).toBe("09");
    expect(numeralFor(10)).toBe("11");
  });

  it("labelFor gera \"PASO 0X\" (ES, default) a partir do índice quando não há override", () => {
    expect(labelFor(0)).toBe("PASO 01");
    expect(labelFor(3)).toBe("PASO 04");
  });

  it("labelFor usa o override do passo (em caixa alta) quando fornecido", () => {
    expect(labelFor(0, "paso especial")).toBe("PASO ESPECIAL");
    expect(labelFor(2, "  ")).toBe("PASO 03"); // override em branco não conta
  });

  it("stepWord/labelFor NUNCA misturam idioma — ES é ES, BR é BR (evita o bug 'PASSO' sob @dr.liberdad)", () => {
    expect(stepWord("es")).toBe("PASO");
    expect(stepWord("br")).toBe("PASSO");
    expect(labelFor(0, undefined, "es")).toBe("PASO 01");
    expect(labelFor(0, undefined, "br")).toBe("PASSO 01");
  });

  it("doneWord (bloco final) também é lido por idioma", () => {
    expect(doneWord("es")).toBe("LISTO");
    expect(doneWord("br")).toBe("PRONTO");
  });

  it("para toda cena de passo do plano, o numeral bate com stepIndex+1 (nunca desalinha)", () => {
    const plan = reelPlanPassos(7);
    for (const scene of plan.scenes) {
      if (scene.kind !== "step") continue;
      const esperado = String(scene.stepIndex + 1).padStart(2, "0");
      expect(numeralFor(scene.stepIndex)).toBe(esperado);
    }
  });
});

describe("reelDurationsPassos — timing coerente com o padrão observado (~4-5s/passo, CTA mais longo)", () => {
  it("cada passo dura entre 4 e 5 segundos", () => {
    const { STEP } = reelDurationsPassos(4);
    expect(STEP / FPS).toBeGreaterThanOrEqual(4);
    expect(STEP / FPS).toBeLessThanOrEqual(5);
  });

  it("o CTA é mais longo que um passo isolado", () => {
    const { STEP, CTA } = reelDurationsPassos(4);
    expect(CTA).toBeGreaterThan(STEP);
  });

  it("a duração total cresce linearmente com o nº de passos", () => {
    const a = reelDurationsPassos(2).total;
    const b = reelDurationsPassos(4).total;
    const { STEP } = reelDurationsPassos(4);
    expect(b - a).toBe(STEP * 2);
  });
});

describe("reelPassosDefaultProps — sanidade dos props default (usados pelo Root.tsx)", () => {
  it("tem pelo menos 1 passo e um CTA não vazio", () => {
    expect(reelPassosDefaultProps.steps.length).toBeGreaterThan(0);
    expect(reelPassosDefaultProps.cta.trim().length).toBeGreaterThan(0);
  });

  it("nenhum passo default vem com texto vazio", () => {
    for (const s of reelPassosDefaultProps.steps) {
      expect(s.text.trim().length).toBeGreaterThan(0);
    }
  });
});
