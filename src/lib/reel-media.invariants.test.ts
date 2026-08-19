// Invariante #3 — NUNCA publicar Reel preto.
// hasVisualMedia (scripts/reel-media.cjs) é a regra única que decide se um Reel
// tem fundo de verdade (footage OU ilustração). O workflow pula a publicação
// quando ela é falsa. Este teste barra o merge se a regra afrouxar.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { hasVisualMedia, reelPronto, corrigirAtePronto, renderPublicavel, normalizarTipografia } = require("../../scripts/reel-media.cjs") as {
  renderPublicavel: (
    medida: { duracaoS?: number; temAudio?: boolean; caudaMudaS?: number | null; picoDb?: number | null },
    texto?: { title?: unknown; slides?: unknown; caption?: unknown },
  ) => { ok: boolean; achados: string[]; corrigivelNoTexto: boolean };
  normalizarTipografia: (t: unknown) => unknown;
  hasVisualMedia: (props: unknown) => boolean;
  reelPronto: (props: unknown, caption: unknown) => { ok: boolean; faltando: string[] };
  corrigirAtePronto: (
    props: object,
    caption: string,
    corrigir: (faltando: string[], props: object, caption: string) => Promise<{ props?: object; caption?: string } | null>,
    maxTentativas?: number
  ) => Promise<{ ok: boolean; faltando: string[]; tentativas: number; log: string[]; props: Record<string, unknown>; caption: string }>;
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

// ─── Loop de correção (ordem do dono 15/08) ───────────────────────────────────
// O teste real pegou `faltou: imagens` e o dono reprovou o comportamento passivo
// ("se faltar algo ele tem que corrigir… está conferido 100% siga a proxima etapa,
// não está volte e refaça, até finalir"). Agora faltou → o motor CORRIGE e re-confere
// em loop até 100% (ou teto de tentativas / sem progresso). Fail-closed no fim.
describe("corrigirAtePronto (faltou → corrige → re-confere)", () => {
  const pecaCompleta = {
    title: "La verdad incómoda",
    slides: ["slide 1", "slide 2"],
    narrationUrl: "https://x/narracion.mp3",
    img: "https://x/cover.png",
    clips: ["https://x/clip1.mp4", "https://x/clip2.mp4"],
  };

  it("peça completa → ok na hora, corretor NUNCA é chamado (não paga à toa)", async () => {
    const chamadas: string[][] = [];
    const res = await corrigirAtePronto(pecaCompleta, "legenda", async (faltando) => {
      chamadas.push(faltando);
      return null;
    });
    expect(res.ok).toBe(true);
    expect(res.tentativas).toBe(0);
    expect(chamadas).toHaveLength(0);
  });

  it("faltou imagens → corretor preenche → ok (1 tentativa)", async () => {
    const props = { ...pecaCompleta, img: undefined };
    const res = await corrigirAtePronto(props, "legenda", async (faltando, p) => {
      expect(faltando).toEqual(["imagens"]);
      return { props: { ...p, img: "https://x/cover.png" } };
    });
    expect(res.ok).toBe(true);
    expect(res.tentativas).toBe(1);
    expect(res.props.img).toBe("https://x/cover.png");
  });

  it("corretor não resolve (null) → continua fail-closed", async () => {
    const res = await corrigirAtePronto(
      { ...pecaCompleta, img: undefined },
      "legenda",
      async () => null
    );
    expect(res.ok).toBe(false);
    expect(res.faltando).toEqual(["imagens"]);
  });

  it("faltou imagens e vídeo → corrige os dois e fica 100%", async () => {
    const props = { ...pecaCompleta, img: undefined, clips: [] };
    const res = await corrigirAtePronto(props, "legenda", async (_f, p) => ({
      props: { ...p, img: "https://x/cover.png", clips: ["https://x/clip1.mp4"] },
    }));
    expect(res.ok).toBe(true);
    expect(res.tentativas).toBe(1);
  });

  it("corretor não muda nada → sem progresso, para NA 1ª chamada (não re-paga)", async () => {
    const props = { ...pecaCompleta, img: undefined, clips: [] };
    let chamadas = 0;
    const res = await corrigirAtePronto(props, "legenda", async (_f, p) => {
      chamadas++;
      return { props: { ...p } }; // devolve igual — nada foi corrigido
    });
    expect(chamadas).toBe(1);
    expect(res.ok).toBe(false);
  });

  it("corretor que FALHA (lança) → fail-closed, sem estourar", async () => {
    const res = await corrigirAtePronto(
      { ...pecaCompleta, img: undefined },
      "legenda",
      async () => {
        throw new Error("API fora do ar");
      }
    );
    expect(res.ok).toBe(false);
    expect(res.faltando).toEqual(["imagens"]);
  });

  it("teto de tentativas respeitado — progresso parcial não vira laço infinito", async () => {
    const props = { ...pecaCompleta, img: undefined, clips: [] };
    let chamadas = 0;
    const res = await corrigirAtePronto(
      props,
      "legenda",
      async (_f, p) => {
        chamadas++;
        return { props: { ...p, img: "https://x/cover.png" } }; // conserta 1 de 2 — progresso real
      },
      1 // teto mínimo: 1 tentativa
    );
    expect(chamadas).toBe(1); // parou no TETO, não no progresso
    expect(res.ok).toBe(false);
    expect(res.faltando).toEqual(["vídeo"]);
  });
});

// ─── A PEÇA PRONTA (18/08/2026) ───────────────────────────────────────────────
// O dono viu o Reel BR no ar e reprovou: "a voz está cortada, a legenda com caracteres".
// Todos os robôs verdes — porque `reelPronto` mede PRESENÇA e ninguém media o ARQUIVO.
// Os números aqui são os do Reel real (31,0 s, voz até 24,7 s): se a régua afrouxar,
// aquela peça volta a passar.
const BOM = { duracaoS: 31, temAudio: true, caudaMudaS: 0.8, picoDb: -0.9 };

describe("renderPublicavel — a peça pronta, não os campos dela", () => {
  it("peça sã passa", () => {
    expect(renderPublicavel(BOM, { title: "TANTA PAZ", slides: ["a"], caption: "b" }).ok).toBe(true);
  });

  it("REPROVA a peça que emudece no fim — o defeito exato de 18/08", () => {
    const v = renderPublicavel({ ...BOM, caudaMudaS: 6.7 }, {});
    expect(v.ok).toBe(false);
    expect(v.achados.join(" ")).toMatch(/mudos/);
  });

  it("2,5s de fim mudo ainda passa; 2,6s não — o corte é onde está escrito", () => {
    expect(renderPublicavel({ ...BOM, caudaMudaS: 2.5 }, {}).ok).toBe(true);
    expect(renderPublicavel({ ...BOM, caudaMudaS: 2.6 }, {}).ok).toBe(false);
  });

  it("REPROVA peça muda e peça com trilha silenciosa", () => {
    expect(renderPublicavel({ ...BOM, temAudio: false }, {}).ok).toBe(false);
    expect(renderPublicavel({ ...BOM, picoDb: -60 }, {}).ok).toBe(false);
  });

  it("REPROVA o texto com aspas que a fonte desenha como `<<` — e diz que dá para consertar", () => {
    const v = renderPublicavel(BOM, { title: "«Tanta paz» — RESPONDENDO", slides: [], caption: "" });
    expect(v.ok).toBe(false);
    expect(v.corrigivelNoTexto).toBe(true);
  });

  it("aspa curva NÃO é defeito — é justamente o conserto", () => {
    const v = renderPublicavel(BOM, { title: "“Tanta paz” — RESPONDENDO", slides: [], caption: "" });
    expect(v.ok).toBe(true);
  });

  it("não medi ≠ está bom: sem duração, reprova", () => {
    expect(renderPublicavel({ ...BOM, duracaoS: 0 }, {}).ok).toBe(false);
  });

  it("cauda não medida (null) não inventa reprovação nem aprovação por ela", () => {
    const v = renderPublicavel({ ...BOM, caudaMudaS: null }, {});
    expect(v.achados.join(" ")).not.toMatch(/mudos/);
  });
});

describe("normalizarTipografia (irmã da do site)", () => {
  it("troca os guillemets pelas aspas que a Anton desenha", () => {
    expect(normalizarTipografia("«Tanta paz» — RESPONDENDO")).toBe("“Tanta paz” — RESPONDENDO");
    expect(normalizarTipografia("‹a›")).toBe("“a”");
  });
  it("texto normal sai idêntico, e o que não é texto volta como veio", () => {
    expect(normalizarTipografia("Isso não é paz.")).toBe("Isso não é paz.");
    expect(normalizarTipografia(undefined)).toBe(undefined);
  });
});
