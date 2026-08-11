// ─── O SOM COBRE A PEÇA INTEIRA? ─────────────────────────────────────────────
// Renderiza SÓ O ÁUDIO da composição (leve — não desenha um quadro sequer) numa duração
// escolhida e mede o volume segundo a segundo. Existe por causa de um defeito real:
//
//   11/08/2026, o dono ouviu o Reel publicado e disse "áudio quebra". Medido: o som caía
//   de −17 dB para −85 dB aos ~27 s num vídeo de 30,6 s — **2,6 segundos mudos** no fecho,
//   em cima do convite. A causa não era o fade: **toda trilha do acervo tem exatamente
//   28,000 s**, e a peça passou disso quando o fecho falado entrou em 10/08.
//
// O teste de invariante trava o `loop` no código; este script prova o efeito no ÁUDIO.
//
//   node scripts/medir-audio.mjs <saida-dir> [segundos]

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(process.argv[2] || ".");
const SEGUNDOS = Number(process.argv[3] || 32);
mkdirSync(OUT, { recursive: true });

// ⚠️ A PEÇA TEM DE SER MAIS LONGA QUE A TRILHA — senão o teste não toca no defeito.
// Sem narração, o plano do ReelV2 chega no máximo a ~27,9 s (capa 3,0 + 3 insights de 5,6
// + cta 4,6 + funil 3,5) e NUNCA cruza os 28,0 s da trilha: forçar só a duração da
// composição produz silêncio legítimo (o fade já terminou) e engana quem estiver medindo —
// foi o que aconteceu na 1ª tentativa. Por isso aqui vai uma narração de 30 s: é ela que
// estica o plano, exatamente como na peça que o dono ouviu (30,6 s).
const NARRACAO_SEG = 30;
const PROPS = {
  title: "Ninguém te prendeu: a porta está aberta",
  slides: ["Um", "Dois", "Três"],
  cta: "O que você faria hoje sem o telefone por perto?",
  kw: "PORTA",
  ed: "245",
  cat: "freedom",
  handle: "@dr.liberdade.br",
  brand: "Dr. Liberdade",
  ctaFollow: "Siga",
  ctaBio: "→ Mais no link da bio",
  music: "music/bed-0.mp3", // 28,000 s — a duração de TODA trilha do acervo
  // Narração de mentira só para esticar o plano: 5 blocos = capa + 3 insights + fecho.
  narrationUrl: "music/bed-1.mp3",
  narrationDurationSec: NARRACAO_SEG,
  narrationSegments: [
    "Ninguém te prendeu a porta está aberta",
    "Primeiro bloco falado desta peça de teste",
    "Segundo bloco falado desta peça de teste",
    "Terceiro bloco falado desta peça de teste",
    "Fecho falado desta peça de teste",
  ],
  narrationWords: [],
};

const browserExecutable =
  process.env.REMOTION_BROWSER_EXECUTABLE || "C:/Program Files/Google/Chrome/Application/chrome.exe";

// ⚠️ O ffmpeg escreve a medição em **stderr**, não em stdout. Lendo só o stdout, a
// medição volta vazia — e um medidor que não mede NUNCA pode devolver "está tudo bem":
// aqui ele explode, porque "não consegui medir" e "não há buraco" são coisas opostas.
const volumeEm = (arquivo, s) => {
  // `spawnSync` e não `execFileSync`: só ele devolve stdout E stderr separados, e a
  // medição do ffmpeg sai em stderr — `execFileSync` entregava apenas o stdout, vazio.
  const r = spawnSync(
    "ffmpeg",
    ["-v", "info", "-ss", String(s), "-t", "1", "-i", arquivo, "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  const m = /mean_volume:\s*(-?[\d.]+) dB/.exec(`${r.stdout ?? ""}${r.stderr ?? ""}`);
  if (m) return Number(m[1]);
  throw new Error(`não consegui medir o volume em ${s}s — medidor cego não vira aprovação`);
};

async function main() {
  const serveUrl = await bundle({ entryPoint: resolve(ROOT, "video", "index.ts") });
  const comp = await selectComposition({ serveUrl, id: "ReelV2", inputProps: PROPS, browserExecutable });
  // A duração é a que o PRÓPRIO plano da peça calculou (é ela que passa dos 28 s da
  // trilha). Só se pede um número na linha de comando é que se força outra.
  const frames = process.argv[3] ? Math.round(SEGUNDOS * comp.fps) : comp.durationInFrames;
  const dur = frames / comp.fps;
  const saida = resolve(OUT, `audio-${dur.toFixed(1)}s.mp3`);
  console.log(`[audio] peça de ${dur.toFixed(1)}s contra trilha de 28,0s`);

  await renderMedia({
    composition: { ...comp, props: PROPS, durationInFrames: frames },
    serveUrl,
    codec: "mp3",
    // ⚠️ `outputLocation`, NÃO `output`: com o nome errado o Remotion renderiza, devolve
    // sucesso e **não grava arquivo nenhum** — falha silenciosa que custou uma rodada.
    outputLocation: saida,
    browserExecutable,
    overwrite: true,
  });

  console.log(`[audio] som renderizado → ${saida}`);
  let mudos = 0;
  for (let s = 0; s < Math.floor(dur); s++) {
    const v = volumeEm(saida, s);
    const marca = v == null ? "?" : v < -60 ? "  ← MUDO" : "";
    if (v != null && v < -60) mudos++;
    if (s >= Math.floor(dur) - 10 || s % 5 === 0) console.log(`[audio] ${String(s).padStart(2)}s: ${v ?? "?"} dB${marca}`);
  }
  console.log(mudos ? `[audio] ⛔ ${mudos} segundo(s) MUDO(s)` : "[audio] ✅ som do começo ao fim, sem buraco");
  process.exit(mudos ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
