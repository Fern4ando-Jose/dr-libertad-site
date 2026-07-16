// ─── Prova visual: grade por pilar convergindo em fontes heterogêneas ──────────
// Script de USO ÚNICO (prova P4, 2026-07-16) — NÃO faz parte do pipeline de
// produção. Renderiza 2 stills por pilar (1 com footage de VÍDEO Pexels, 1 com
// FOTO Pexels + Ken Burns) pra provar que `video/brand-grade.ts` produz visual
// coeso nas 2 fontes disponíveis agora (Pixabay ainda não tem chave). Sai em
// Arquivo-Midia/prova-grade-pilares/<pilar>-{video,photo}.png (fora do git).
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "Arquivo-Midia", "prova-grade-pilares");

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
// Sandbox sem acesso a remotion.dev (download do Chrome Headless Shell falha) —
// reusa o Chromium do Playwright já presente na máquina (mesmo protocolo CDP).
const BROWSER_EXECUTABLE = process.env.PROOF_BROWSER_EXECUTABLE || undefined;

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

    // Frame da CENA DE VÍDEO: cover usa sceneClip(0) = clips[0]. Título curto pra
    // não distrair da leitura de cor/textura da grade.
    const baseProps = {
      title: `Prova ${pillar}`,
      slides: ["Insight de prova — foto Ken Burns nesta cena"],
      accentWords: [],
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
    });

    // Frame ~60 (2s) dentro da cena de CAPA (clips[0] = vídeo).
    await renderStill({
      composition,
      serveUrl,
      output: resolve(OUT_DIR, `${pillar}-1-video.png`),
      frame: 60,
      inputProps: baseProps,
      browserExecutable: BROWSER_EXECUTABLE,
    });
    console.log(`[proof] ${pillar}: still de VÍDEO renderizado`);

    // Frame dentro da cena de INSIGHT (clips[1] = foto) — cover dura 150 frames
    // (5s@30fps) por padrão; entra ~30 frames depois do início do insight.
    await renderStill({
      composition,
      serveUrl,
      output: resolve(OUT_DIR, `${pillar}-2-photo.png`),
      frame: 180,
      inputProps: baseProps,
      browserExecutable: BROWSER_EXECUTABLE,
    });
    console.log(`[proof] ${pillar}: still de FOTO (Ken Burns) renderizado`);
  }

  console.log(`[proof] pronto — stills em ${OUT_DIR}`);
}

main().catch((e) => {
  console.error("[proof] ERRO:", e);
  process.exit(1);
});
