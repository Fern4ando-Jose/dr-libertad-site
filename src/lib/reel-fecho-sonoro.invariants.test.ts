// ─── A PEÇA NÃO EMUDECE DEPOIS DA VOZ (18/08/2026) ───────────────────────────
//
// O dono viu o Reel BR no ar e disse: *"a voz está cortada"*. Medido no arquivo que foi
// ao feed (postId 18180433186416477): 31,0 s de vídeo, fala até 24,7 s, e os 6,3 s finais
// entre −36 e −48 dB — a cama musical presa no ducking da voz (0,07). Não havia voz
// cortada: havia peça morrendo antes de acabar.
//
// A curva do volume virou função pura justamente para esta prova existir sem render (esta
// máquina não renderiza Remotion — `chrome-headless-shell` cai em quarentena).
import { describe, it, expect } from "vitest";
import { curvaDaMusica, CAMA_LIVRE } from "../../video/ReelV2";

// O caso REAL: 31,0 s a 30 fps = 930 frames; a voz acaba em 24,7 s = 741 frames.
const REEL_DE_18_08 = { total: 930, musicMax: 0.07, fimDaVozF: 741 };

describe("a cama musical sobe quando a fala termina", () => {
  it("no Reel que o dono reprovou, a cama sobe do ducking para o fecho", () => {
    const c = curvaDaMusica(REEL_DE_18_08);
    expect(c.sobeNoFecho).toBe(true);
    expect(c.y).toContain(CAMA_LIVRE);
    expect(CAMA_LIVRE).toBeGreaterThan(REEL_DE_18_08.musicMax * 5);
  });

  it("enquanto a voz fala, o volume é o do ducking — a fala continua por cima", () => {
    const c = curvaDaMusica(REEL_DE_18_08);
    const iFimDaVoz = c.x.indexOf(REEL_DE_18_08.fimDaVozF);
    expect(iFimDaVoz).toBeGreaterThan(0);
    expect(c.y[iFimDaVoz]).toBe(REEL_DE_18_08.musicMax);
  });

  it("os pontos são estritamente crescentes — senão o interpolate lança em produção", () => {
    for (const caso of [
      REEL_DE_18_08,
      { total: 930, musicMax: 0.07, fimDaVozF: null },
      { total: 930, musicMax: 0.7, fimDaVozF: 10 }, // fala curtíssima
      { total: 930, musicMax: 0.07, fimDaVozF: 900 }, // cauda mínima
      { total: 200, musicMax: 0.07, fimDaVozF: 150 },
    ]) {
      const c = curvaDaMusica(caso);
      expect(c.x.length).toBe(c.y.length);
      for (let i = 1; i < c.x.length; i++) expect(c.x[i]).toBeGreaterThan(c.x[i - 1]);
    }
  });

  it("sem medida da narração, a curva é a de SEMPRE — nada muda para quem não tem voz", () => {
    const c = curvaDaMusica({ total: 930, musicMax: 0.7, fimDaVozF: null });
    expect(c.sobeNoFecho).toBe(false);
    expect(c.x).toEqual([0, 15, 906, 930]);
    expect(c.y).toEqual([0, 0.7, 0.7, 0]);
  });

  it("cauda curta demais não mexe na curva — subir para descer em seguida é buraco, não fecho", () => {
    expect(curvaDaMusica({ total: 930, musicMax: 0.07, fimDaVozF: 900 }).sobeNoFecho).toBe(false);
  });

  it("a peça termina em fade, nunca com corte seco", () => {
    const c = curvaDaMusica(REEL_DE_18_08);
    expect(c.y[c.y.length - 1]).toBe(0);
  });
});
