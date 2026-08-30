/**
 * O que estes testes protegem (30/08/2026):
 *
 * O TikTok SILENCIOU 82 dos 84 vídeos das duas contas — aviso da própria plataforma, 9 vezes entre
 * 06/08 e 30/08: *"Publicação silenciada devido a sons não autorizados"*. A causa: 132 das 143
 * faixas de `public/music` têm autor na etiqueta (82 obras de Kevin MacLeod, CC BY 4.0), e obra
 * catalogada é reconhecida pelo banco de áudio da plataforma — **licença livre não é o mesmo que
 * não-reconhecida**. Como a narração divide o canal com a música, silenciar mata a peça inteira.
 *
 * Desde então, `pick-music.cjs` só pode sortear faixa da lista `public/music/livres.json`
 * (gerada de fora por `scripts/build-music-livres.mjs`, lendo a etiqueta de cada arquivo).
 * Estes testes reprovam quem afrouxar isso.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const picker = require("../../scripts/pick-music.cjs");
const RAIZ = path.resolve(__dirname, "..", "..");
const MUSIC = path.join(RAIZ, "public", "music");

const livres: string[] = JSON.parse(fs.readFileSync(path.join(MUSIC, "livres.json"), "utf8")).livres;
const pools: Record<string, string[]> = JSON.parse(fs.readFileSync(path.join(MUSIC, "pools.json"), "utf8"));
const creditos = JSON.parse(fs.readFileSync(path.join(RAIZ, "src", "content", "music-credits.json"), "utf8"));

describe("trilha: só faixa sem dono vai ao ar", () => {
  it("livres.json não está vazio e todas as faixas existem no disco", () => {
    expect(livres.length).toBeGreaterThanOrEqual(5);
    for (const f of livres) expect(fs.existsSync(path.join(RAIZ, "public", f.replace(/^music\//, "music/")))).toBe(true);
  });

  it("nenhuma faixa livre aparece nos créditos — crédito é sinal de obra catalogada", () => {
    const creditadas = new Set<string>();
    for (const c of creditos.works || []) if (c?.file) creditadas.add(`music/${String(c.file).replace(/^music\//, "")}`);
    for (const f of livres) expect(creditadas.has(f), `${f} está nos créditos: tem autor, logo é reconhecível`).toBe(false);
  });

  it("TODO tema dos pools recebe faixa livre — nunca uma das 132 com autor", () => {
    const permitidas = new Set(livres);
    for (const topic of Object.keys(pools)) {
      const escolhida = picker.pickMusic({ topic, run: 3 });
      expect(escolhida, `tema "${topic}" ficou sem trilha`).toBeTruthy();
      expect(permitidas.has(escolhida), `tema "${topic}" recebeu ${escolhida}, que não está em livres.json`).toBe(true);
    }
  });

  it("a rotação legada (por run) também respeita a peneira", () => {
    const permitidas = new Set(livres);
    for (let run = 0; run < 12; run++) {
      const f = picker.pickMusic(run);
      if (f) expect(permitidas.has(f), `run ${run} devolveu ${f}, fora de livres.json`).toBe(true);
    }
  });

  it("os 183 temas se espalham por várias faixas — pool de uma música só é o defeito de 26/07", () => {
    const usadas = new Set(Object.keys(pools).map((t) => picker.pickMusic({ topic: t, run: 1 })));
    expect(usadas.size).toBeGreaterThanOrEqual(5);
  });

  it("podeIrAoAr é FAIL-CLOSED: faixa com autor, caminho vazio ou lixo não passam", () => {
    expect(picker.podeIrAoAr("music/bed-pilar-anxiety-04.mp3")).toBe(false); // Kevin MacLeod
    expect(picker.podeIrAoAr("music/bed-pilar-freedom.mp3")).toBe(false); // JR Tundra
    expect(picker.podeIrAoAr("")).toBe(false);
    expect(picker.podeIrAoAr(null)).toBe(false);
    expect(picker.podeIrAoAr("music/nao-existe-jamais.mp3")).toBe(false);
    expect(picker.podeIrAoAr(livres[0])).toBe(true);
  });
});
