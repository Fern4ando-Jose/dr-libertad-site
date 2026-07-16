// ─── Prova visual: acento de UI PLANA varia por pilar; wash do footage NÃO ────
// Script de USO ÚNICO (prova P4, 2026-07-16) — NÃO faz parte do pipeline de
// produção. Adaptado de `render-grade-proof.mjs` (mesma composição "Reel", mesma
// busca de footage Pexels): aqui a prova é a SEPARAÇÃO dos dois acentos —
//   frame  60 → cena de CAPA (footage de VÍDEO): régua deve mudar de cor por
//               pilar (uiAccent), o WASH sobre o vídeo deve continuar o MESMO
//               vinho quente em todos os 6 (washAccent = #A45A5A travado).
//   frame 180 → cena de INSIGHT (footage de FOTO + Ken Burns): a palavra
//               "acento" (accentWords) deve mudar de cor por pilar; o wash por
//               trás continua idêntico.
// Sai em Arquivo-Midia/prova-ui-acento-6-cores/<pilar>-{1-capa,2-insight}.png
// (pasta NOVA — não sobrescreve `prova-grade-pilares/`, da prova anterior).
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "Arquivo-Midia", "prova-ui-acento-6-cores");

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const BROWSER_EXECUTABLE = process.env.PROOF_BROWSER_EXECUTABLE || undefined;
// Se o browser apontado for o Chromium "full" (não headless-shell), o
// `chromeMode` precisa bater (ver PROOF_CHROME_MODE). Nesta máquina usamos o
// chrome-headless-shell do Playwright já instalado (mesmo binário que o
// Remotion baixaria sozinho) — chromeMode default "headless-shell" serve.
const CHROME_MODE = process.env.PROOF_CHROME_MODE || undefined;

const PILLARS_ENV = process.env.PROOF_PILLARS ? process.env.PROOF_PILLARS.split(",") : null;
const PILLARS = PILLARS_ENV || ["freedom", "dopamine", "anxiety", "network", "self", "mind"];
const PILLAR_TERM = {
  freedom: "person arms open nature",
  dopamine: "person scrolling phone in bed",
  anxiety: "anxious person looking at phone",
  network: "lonely person in crowd",
  self: "person reflection window thinking",
  mind: "calm person meditating",
};

async function searchOneVideo(term) {
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(term)}&orientation=portrait&size=medium&per_page=5`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
  const data = await res.json();
  const v = (data.videos || []).find((x) => x.height >= x.width);
  if (!v) return null;
  const files = (v.video_files || []).filter((f) => f.height >= f.width);
  files.sort((a, b) => Math.abs(a.width - 1080) - Math.abs(b.width - 1080));
  return files[0]?.link || null;
}

async function searchOnePhoto(term) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(term)}&orientation=portrait&size=large&per_page=5`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
  const data = await res.json();
  const p = (data.photos || []).find((x) => x.height >= x.width);
  return p?.src?.large2x || p?.src?.large || null;
}

async function main() {
  if (!PEXELS_API_KEY) {
    console.error("[proof] PEXELS_API_KEY ausente — não dá pra buscar footage real pra prova.");
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  console.log("[proof] empacotando bundle Remotion…");
  const serveUrl = await bundle({ entryPoint: resolve(ROOT, "video", "index.ts") });

  for (const pillar of PILLARS) {
    const t0 = Date.now();
    const term = PILLAR_TERM[pillar];
    console.log(`[proof] ${pillar}: buscando footage real ("${term}")… (+${Date.now() - t0}ms)`);
    const videoUrl = await searchOneVideo(term);
    const photoUrl = await searchOnePhoto(term);
    if (!videoUrl || !photoUrl) {
      console.log(`[proof] ${pillar}: não achei vídeo+foto — pulando`);
      continue;
    }

    // "acento" aparece no insight — vira a palavra em destaque (Highlighted),
    // colorida com uiAccent (deve mudar por pilar). O wash por trás (GradeOverlay)
    // usa sempre washAccent = RED, travado.
    const baseProps = {
      title: `Prova ${pillar}`,
      slides: ["O acento muda por pilar aqui"],
      accentWords: ["acento"],
      cta: "prova",
      kw: pillar.toUpperCase(),
      ed: "PROVA",
      clips: [videoUrl, photoUrl],
      cat: pillar,
      handle: "@dr.liberdad",
      brand: "Dr. Libertad",
    };

    const composition = await selectComposition({
      serveUrl,
      id: "Reel",
      inputProps: baseProps,
      browserExecutable: BROWSER_EXECUTABLE,
      chromeMode: CHROME_MODE,
    });

    // Frame ~60 (2s) dentro da cena de CAPA (clips[0] = vídeo) — régua visível.
    await renderStill({
      composition,
      serveUrl,
      output: resolve(OUT_DIR, `${pillar}-1-capa.png`),
      frame: 60,
      inputProps: baseProps,
      browserExecutable: BROWSER_EXECUTABLE,
      chromeMode: CHROME_MODE,
    });
    console.log(`[proof] ${pillar}: still de CAPA (vídeo) renderizado`);

    // Frame dentro da cena de INSIGHT (clips[1] = foto, Ken Burns) — palavra
    // "acento" em destaque com a cor de UI do pilar.
    await renderStill({
      composition,
      serveUrl,
      output: resolve(OUT_DIR, `${pillar}-2-insight.png`),
      frame: 180,
      inputProps: baseProps,
      browserExecutable: BROWSER_EXECUTABLE,
      chromeMode: CHROME_MODE,
    });
    console.log(`[proof] ${pillar}: still de INSIGHT (foto Ken Burns) renderizado`);
  }

  console.log(`[proof] pronto — stills em ${OUT_DIR}`);
}

main().catch((e) => {
  console.error("[proof] ERRO:", e);
  process.exit(1);
});
