// Invariante #3 — NUNCA publicar Reel preto.
// hasVisualMedia (scripts/reel-media.cjs) é a regra única que decide se um Reel
// tem fundo de verdade (footage OU ilustração). O workflow pula a publicação
// quando ela é falsa. Este teste barra o merge se a regra afrouxar.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { hasVisualMedia, reelPronto } = require("../../scripts/reel-media.cjs") as {
  hasVisualMedia: (props: unknown) => boolean;
  reelPronto: (props: unknown, caption: unknown) => { ok: boolean; faltando: string[] };
};

describe("hasVisualMedia (guarda anti-preto do Reel)", () => {
  it("SEM clips e SEM img → não tem mídia (deve pular publicação)", () => {
    expect(hasVisualMedia({ clips: [], img: undefined })).toBe(false);
    expect(hasVisualMedia({})).toBe(false);
    expect(hasVisualMedia(null)).toBe(false);
    expect(hasVisualMedia({ clips: [], img: "" })).toBe(false);
    expect(hasVisualMedia({ clips: ["", "  "], img: "   " })).toBe(false);
  });

  it("≥1 clipe de footage não-vazio → tem mídia", () => {
    expect(hasVisualMedia({ clips: ["https://x/a.mp4"] })).toBe(true);
    expect(hasVisualMedia({ clips: ["", "https://x/b.mp4"] })).toBe(true);
  });

  it("ilustração (img) presente, mesmo sem clips → tem mídia", () => {
    expect(hasVisualMedia({ clips: [], img: "https://x/cover.png" })).toBe(true);
    expect(hasVisualMedia({ img: "https://x/cover.png" })).toBe(true);
  });

  it("entradas inválidas não derrubam a guarda", () => {
    expect(hasVisualMedia(undefined)).toBe(false);
    expect(hasVisualMedia({ clips: "not-an-array" } as unknown)).toBe(false);
    expect(hasVisualMedia({ clips: [123, null] } as unknown)).toBe(false);
  });
});

// ─── Trava de peça pronta (ordem do dono 15/08) ───────────────────────────────
// O Reel só publica com texto + áudio + imagens + vídeo. Fail-closed: peça
// incompleta → ok:false, o workflow não renderiza/publica (o catchup redispara).
describe("reelPronto (peça completa antes de publicar)", () => {
  const pecaCompleta = {
    title: "La verdad incómoda",
    slides: ["slide 1", "slide 2"],
    narrationUrl: "https://x/narracion.mp3",
    img: "https://x/cover.png",
    clips: ["https://x/clip1.mp4", "https://x/clip2.mp4"],
  };

  it("peça completa (texto + áudio + imagens + vídeo) → ok", () => {
    expect(reelPronto(pecaCompleta, "legenda completa")).toEqual({ ok: true, faltando: [] });
  });

  it("faltou áudio → não publica, aponta áudio", () => {
    expect(reelPronto({ ...pecaCompleta, narrationUrl: undefined }, "legenda")).toEqual({
      ok: false,
      faltando: ["áudio"],
    });
  });

  it("faltou vídeo (clips) → não publica, aponta vídeo", () => {
    expect(reelPronto({ ...pecaCompleta, clips: [] }, "legenda")).toEqual({
      ok: false,
      faltando: ["vídeo"],
    });
  });

  it("faltou imagem (img) → não publica, aponta imagens", () => {
    expect(reelPronto({ ...pecaCompleta, img: "" }, "legenda")).toEqual({
      ok: false,
      faltando: ["imagens"],
    });
  });

  it("faltou texto (title / slides / caption) → não publica, aponta cada um", () => {
    expect(reelPronto({ ...pecaCompleta, title: "  " }, "legenda")).toEqual({
      ok: false,
      faltando: ["texto (title)"],
    });
    expect(reelPronto({ ...pecaCompleta, slides: [] }, "legenda")).toEqual({
      ok: false,
      faltando: ["texto (slides)"],
    });
    expect(reelPronto(pecaCompleta, "  ")).toEqual({ ok: false, faltando: ["texto (caption)"] });
  });

  it("entradas inválidas → fail-closed (nunca publica)", () => {
    expect(reelPronto(null, "x")).toEqual({ ok: false, faltando: ["props"] });
    expect(reelPronto(undefined, "x")).toEqual({ ok: false, faltando: ["props"] });
    expect(reelPronto({}, "")).toEqual({ ok: false, faltando: [
      "texto (title)", "texto (slides)", "texto (caption)", "áudio", "imagens", "vídeo",
    ] });
  });
});
