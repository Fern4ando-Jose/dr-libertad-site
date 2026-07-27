// Trava o PLANO DE TEMPOS do ReelV2 (`reelPlanV2`) — a peça que decide se o Reel é
// cronometrado pela VOZ (o áudio é o relógio) ou pela fórmula de slides.
//
// Existe por causa do defeito que o dono reprovou: a voz era espremida pra caber num
// vídeo estimado por fórmula e, quando a estimativa errava, a fala atrasava/estourava.
// Dois invariantes não podem cair:
//   1. com medida da voz → cada cena começa NO FRAME em que a voz começa aquela frase;
//   2. sem medida (ou medida inconsistente) → volta EXATAMENTE ao comportamento antigo,
//      sem regressão em nenhum Reel que sai hoje sem áudio.
import { describe, it, expect } from "vitest";
import { reelPlanV2, reelDurationsV2, dedupeSlides } from "./ReelV2";
import { splitWords, TAIL_SEC } from "../src/lib/narration-sync";
import { FPS } from "./Reel";

const TITLE = "A liberdade assusta";
const SLIDES = ["O medo cobra um preço", "Você paga sem perceber"];
const FOLLOW = "Me siga se você prefere a verdade incômoda ao aplauso.";

// Roteiro como a API monta: blocos na ordem falada, com pontuação final.
const SEGMENTS = [TITLE + ".", SLIDES[0] + ".", SLIDES[1] + ".", FOLLOW];

// Voz sintética com PAUSAS entre as frases — é justamente a respiração que a
// fórmula de caracteres/segundo não sabia prever.
function fakeVoice(segments: string[], per = 0.42, pause = 0.55) {
  const words: Array<{ text: string; start: number; end: number }> = [];
  let t = 0.25; // respiro inicial da voz (pertence à capa)
  segments.forEach((seg, si) => {
    for (const w of splitWords(seg)) {
      words.push({ text: w, start: t, end: t + per });
      t += per + 0.06;
    }
    if (si < segments.length - 1) t += pause;
  });
  return { words, durationSec: words[words.length - 1].end };
}

const voice = fakeVoice(SEGMENTS);

const baseProps = {
  title: TITLE,
  slides: SLIDES,
  accentWords: [],
  cta: "O que mais rouba a sua atenção hoje?",
  kw: "LIBERTAD",
  ed: "001",
};

const syncedProps = {
  ...baseProps,
  narrationUrl: "https://exemplo.test/voz.mp3",
  narrationDurationSec: voice.durationSec,
  narrationWords: voice.words,
  narrationSegments: SEGMENTS,
};

describe("reelPlanV2 — o vídeo se dimensiona pela VOZ", () => {
  it("sem narração: volta ao comportamento antigo, sem regressão", () => {
    const plan = reelPlanV2(baseProps, FPS);
    const n = dedupeSlides(TITLE, SLIDES).length;
    expect(plan.synced).toBe(false);
    expect(plan.total).toBe(reelDurationsV2(n).total);
    expect(plan.scenes).toHaveLength(n + 2); // capa + insights + cta
  });

  it("com voz medida: cada cena começa no frame em que a voz vira de frase", () => {
    const plan = reelPlanV2(syncedProps, FPS);
    expect(plan.synced).toBe(true);
    expect(plan.scenes[0].fromFrame).toBe(0);
    // 1ª palavra falada de cada bloco → início da cena correspondente
    let idx = 0;
    const starts: number[] = [];
    for (const seg of SEGMENTS) {
      starts.push(voice.words[idx].start);
      idx += splitWords(seg).length;
    }
    for (let i = 1; i < SEGMENTS.length; i++) {
      expect(plan.scenes[i].fromFrame).toBe(Math.round(starts[i] * FPS));
    }
  });

  it("a voz nunca é cortada: o vídeo dura a fala inteira + respiro", () => {
    const plan = reelPlanV2(syncedProps, FPS);
    expect(plan.total / FPS).toBeGreaterThanOrEqual(voice.durationSec + TAIL_SEC - 0.05);
  });

  it("as cenas são contíguas — sem buraco preto nem sobreposição", () => {
    const plan = reelPlanV2({ ...syncedProps, funnel: { keyword: "LIBERTAD", action: "a", note: "b" } }, FPS);
    let expected = 0;
    for (const s of plan.scenes) {
      expect(s.fromFrame).toBe(expected);
      expect(s.durationInFrames).toBeGreaterThanOrEqual(1);
      expected += s.durationInFrames;
    }
    expect(plan.total).toBe(expected);
  });

  it("o end-card do funil entra DEPOIS de a voz terminar", () => {
    const semFunil = reelPlanV2(syncedProps, FPS);
    const comFunil = reelPlanV2({ ...syncedProps, funnel: { keyword: "LIBERTAD", action: "a", note: "b" } }, FPS);
    expect(comFunil.scenes).toHaveLength(semFunil.scenes.length + 1);
    const funil = comFunil.scenes[comFunil.scenes.length - 1];
    expect(funil.fromFrame).toBeGreaterThanOrEqual(Math.round(voice.durationSec * FPS));
  });

  it("a legenda acende palavra a palavra, no tempo da fala", () => {
    const plan = reelPlanV2(syncedProps, FPS);
    const capa = plan.wordFrames[0];
    expect(capa).toHaveLength(splitWords(TITLE).length);
    // relativo à cena, começando em ~0 e sempre avançando
    expect(capa[0]).toBeGreaterThanOrEqual(0);
    for (let i = 1; i < capa.length; i++) expect(capa[i]).toBeGreaterThanOrEqual(capa[i - 1]);
    // o insight 1 também tem os tempos da sua própria frase
    expect(plan.wordFrames[1]).toHaveLength(splitWords(SLIDES[0]).length);
  });

  it("roteiro com nº de blocos diferente do que a tela mostra → cai na fórmula (nunca legenda torta)", () => {
    const plan = reelPlanV2({ ...syncedProps, narrationSegments: [TITLE + ".", FOLLOW] }, FPS);
    expect(plan.synced).toBe(false);
    expect(plan.total).toBe(reelDurationsV2(dedupeSlides(TITLE, SLIDES).length).total);
  });

  it("áudio sem duração medida → cai na fórmula (não confia em estimativa)", () => {
    const plan = reelPlanV2({ ...syncedProps, narrationDurationSec: 0 }, FPS);
    expect(plan.synced).toBe(false);
  });

  it("voz sem transcrição ainda sincroniza o VÍDEO pela duração real", () => {
    const plan = reelPlanV2({ ...syncedProps, narrationWords: [] }, FPS);
    expect(plan.synced).toBe(true);
    expect(plan.total / FPS).toBeGreaterThanOrEqual(voice.durationSec + TAIL_SEC - 0.05);
  });

  it("PT (mais verboso) gera vídeo MAIS LONGO que ES — não voz acelerada", () => {
    const es = ["La libertad asusta.", "El miedo cobra.", "Pagas sin verlo.", "Sígueme."];
    const pt = [
      "A liberdade assusta muito mais do que a gente admite.",
      "O medo cobra um preço alto todos os dias.",
      "E você paga sem nem perceber que está pagando.",
      "Me siga se você prefere a verdade incômoda ao aplauso.",
    ];
    const mk = (segs: string[]) => {
      const v = fakeVoice(segs);
      return reelPlanV2({
        ...baseProps,
        title: segs[0], slides: [segs[1], segs[2]],
        narrationUrl: "https://exemplo.test/voz.mp3",
        narrationDurationSec: v.durationSec, narrationWords: v.words, narrationSegments: segs,
      }, FPS).total;
    };
    expect(mk(pt)).toBeGreaterThan(mk(es));
  });
});
