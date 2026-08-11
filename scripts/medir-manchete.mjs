// ─── Medidor da manchete NO QUADRO RENDERIZADO ────────────────────────────────
// Não confia na estimativa de largura por caractere: renderiza o quadro DE VERDADE
// (Remotion + Chromium) duas vezes — uma com o texto e outra com o texto vazio — e mede
// as colunas onde os dois diferem. Essa diferença É a letra, em pixels.
//
// Uso: node medir-quadro.mjs <saida-dir>

import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const ROOT = "D:/Claude/Meus Projetos/dr-libertad-site";
const OUT = resolve(process.argv[2] || ".");
mkdirSync(OUT, { recursive: true });

const PROPS = {
  title: "Ninguém te prendeu: a porta está aberta",
  slides: [
    "Você confere o telefone antes de decidir o próprio dia",
    "A recompensa barata cobra caro depois",
    "Fechar a mão é escolher o que solta",
  ],
  accentWords: ["telefone", "barata", "escolher"],
  cta: "O que você faria hoje sem o telefone por perto?",
  kw: "PORTA",
  ed: "245",
  cat: "freedom",
  handle: "@dr.liberdade.br",
  brand: "Dr. Liberdade",
  ctaFollow: "Siga",
  ctaBio: "→ Mais no link da bio",
};

const browserExecutable =
  process.env.REMOTION_BROWSER_EXECUTABLE || "C:/Program Files/Google/Chrome/Application/chrome.exe";

/** Colunas e linhas em que duas imagens diferem — o retângulo que o texto ocupa. */
async function caixaDaDiferenca(aPath, bPath) {
  const [a, b] = await Promise.all([
    sharp(aPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(bPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  const { width, height, channels } = a.info;
  let x0 = width, x1 = -1, y0 = height, y1 = -1, pixels = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const d =
        Math.abs(a.data[i] - b.data[i]) +
        Math.abs(a.data[i + 1] - b.data[i + 1]) +
        Math.abs(a.data[i + 2] - b.data[i + 2]);
      if (d > 60) {
        pixels++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0, x1, y0, y1, largura: x1 - x0 + 1, altura: y1 - y0 + 1, pixels, width, height };
}

async function main() {
  console.log("[medir] empacotando…");
  const serveUrl = await bundle({ entryPoint: resolve(ROOT, "video", "index.ts") });

  const comp = await selectComposition({
    serveUrl,
    id: "ReelV2",
    inputProps: PROPS,
    browserExecutable,
  });
  console.log(`[medir] composição ${comp.width}x${comp.height}, ${comp.durationInFrames} frames`);

  const quadros = [
    { nome: "capa-frame0", frame: 0 },
    { nome: "capa-frame15", frame: 15 },
    { nome: "capa-frame75", frame: 75 },
  ];

  const medidas = [];
  for (const q of quadros) {
    const comTexto = resolve(OUT, `${q.nome}.png`);
    // ⚠️ Os props vão em `composition.props`, NÃO no `inputProps` do renderStill: o
    // segundo não sobrepõe o primeiro, e as duas variantes saíam idênticas (a medição
    // devolvia "0 pixels de texto" com o texto bem visível na imagem).
    await renderStill({
      composition: { ...comp, props: PROPS },
      serveUrl,
      output: comTexto,
      frame: q.frame,
      browserExecutable,
      overwrite: true,
    });
    // O mesmo quadro SEM a frase: a diferença entre os dois é exatamente a letra.
    const semTexto = resolve(OUT, `_sem-${q.nome}.png`);
    await renderStill({
      composition: { ...comp, props: { ...PROPS, title: "" } },
      serveUrl,
      output: semTexto,
      frame: q.frame,
      browserExecutable,
      overwrite: true,
    });
    const caixa = await caixaDaDiferenca(comTexto, semTexto);
    const pct = (caixa.largura / caixa.width) * 100;
    medidas.push({ ...q, ...caixa, ocupacaoPct: Number(pct.toFixed(1)), arquivo: comTexto });
    console.log(
      `[medir] ${q.nome}: letra ocupa ${pct.toFixed(1)}% da largura (x ${caixa.x0}–${caixa.x1}), ` +
        `${caixa.pixels} pixels de texto, faixa vertical y ${caixa.y0}–${caixa.y1}`,
    );
  }

  writeFileSync(resolve(OUT, "medidas.json"), JSON.stringify({ props: PROPS, medidas }, null, 2));
  console.log(`[medir] pronto → ${OUT}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
