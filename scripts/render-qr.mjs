#!/usr/bin/env node
// ─── QR da pesquisa — BR e ES, no padrão da marca ────────────────────────────
// Gera, para cada idioma:
//   public/qr/pesquisa-<lang>-qr.png            QR puro, 1600×1600 (colar em
//                                               qualquer arte, imprimir, projetar)
//   public/qr/pesquisa-<lang>-card-1080x1350.png  cartão pronto para compartilhar
//
//   npm run render:qr
//
// Decisões que existem por causa de LEITURA, não de estética:
//  • o endereço é curto (drlibertad.com/qr) — o redirect no next.config.js leva à
//    pesquisa já com a marcação de campanha. Menos caracteres = menos módulos =
//    QR legível de longe, no escuro, com celular ruim;
//  • correção de erro H (30%): o código continua lendo sujo, dobrado ou com o
//    dedo cobrindo um canto;
//  • módulos ESCUROS sobre painel CLARO, sempre — QR invertido (claro no escuro)
//    falha em leitor antigo. A marca aparece na moldura, não dentro do código;
//  • zona de silêncio preservada: nada de texto ou borda encostando no código.
//
// O script CONFERE o resultado: decodifica os PNGs gerados e falha se o que sai
// não apontar exatamente para a URL pedida. QR bonito que não abre é lixo caro.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "qr");

const INK = "#0B0B0C";
const OFFWHITE = "#F4F0E8";
const RED = "#A45A5A";

const COPY = {
  br: {
    url: "https://drlibertad.com/qr",
    kicker: "Pesquisa · Dr. Liberdade",
    head: ["As redes destruíram", "o amor —"],
    headAccent: "ou salvaram?",
    instruction: "Aponte a câmera do celular.",
    terms: ["3 minutos", "anônimo", "vira livro"],
    urlLabel: "drlibertad.com/qr",
    foot: "Sua resposta entra na conta do estudo.",
    locale: "pt-BR",
  },
  es: {
    url: "https://drlibertad.com/qr-es",
    kicker: "Investigación · Dr. Libertad",
    head: ["¿Las redes destruyeron", "el amor —"],
    headAccent: "o lo salvaron?",
    instruction: "Apunta la cámara del móvil.",
    terms: ["3 minutos", "anónimo", "se vuelve libro"],
    urlLabel: "drlibertad.com/qr-es",
    foot: "Tu respuesta entra en la cuenta del estudio.",
    locale: "es-ES",
  },
};

const CARD = { w: 1080, h: 1350, margin: 84 };

// ─── Fontes embutidas ─────────────────────────────────────────────────────────
function dataUrl(path, mime) {
  return `data:${mime};base64,${readFileSync(path).toString("base64")}`;
}
const FRAUNCES = dataUrl(join(ROOT, "public", "fonts", "fraunces-700.woff2"), "font/woff2");
const FRAUNCES_EXT = dataUrl(join(ROOT, "public", "fonts", "fraunces-700-ext.woff2"), "font/woff2");
const MONO = dataUrl(join(ROOT, "scripts", "fonts", "IBMPlexMono-Regular.ttf"), "font/ttf");

const QR_OPTS = {
  errorCorrectionLevel: "H",
  margin: 2, // zona de silêncio (em módulos) — abaixo de 2 leitor sofre
  color: { dark: INK, light: OFFWHITE },
};

function cardHtml(lang, qrSvg) {
  const c = COPY[lang];
  return `<!doctype html>
<html lang="${c.locale}"><head><meta charset="utf-8">
<style>
  @font-face { font-family: Fraunces; src: url("${FRAUNCES}") format("woff2"); font-weight: 100 900; font-display: block; }
  @font-face { font-family: FrauncesExt; src: url("${FRAUNCES_EXT}") format("woff2"); font-weight: 100 900; font-display: block; }
  @font-face { font-family: Plex; src: url("${MONO}") format("truetype"); font-weight: 400; font-display: block; }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${CARD.w}px; height: ${CARD.h}px; }
  body {
    background: ${INK}; color: ${OFFWHITE}; overflow: hidden;
    font-family: Fraunces, FrauncesExt, serif;
    font-variation-settings: "wght" 700, "SOFT" 0, "WONK" 0;
    -webkit-font-smoothing: antialiased;
  }
  .canvas { position: relative; width: ${CARD.w}px; height: ${CARD.h}px; overflow: hidden; }
  .glow {
    position: absolute; inset: 0;
    background:
      radial-gradient(120% 62% at 20% -8%, rgba(244,240,232,0.085) 0%, rgba(244,240,232,0) 58%),
      radial-gradient(80% 50% at 95% 6%, rgba(164,90,90,0.10) 0%, rgba(164,90,90,0) 62%),
      linear-gradient(180deg, rgba(11,11,12,0) 58%, rgba(0,0,0,0.5) 100%);
  }
  .grain {
    position: absolute; inset: 0; opacity: 0.15; mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='180' height='180' filter='url(%23n)' opacity='0.5'/></svg>");
  }
  .frame { position: absolute; inset: ${CARD.margin - 26}px; border: 1px solid rgba(185,176,162,0.16); }

  .page {
    position: absolute; inset: ${CARD.margin}px;
    display: flex; flex-direction: column; padding-bottom: 26px;
  }
  .tag {
    font-family: Plex, monospace; font-size: 19px; letter-spacing: 0.30em;
    text-transform: uppercase; color: rgba(185,176,162,0.72);
    display: flex; justify-content: space-between; gap: 20px;
  }
  .tag .red { color: ${RED}; }

  h1 { margin-top: 48px; font-size: 74px; line-height: 1.04; letter-spacing: -0.022em; }
  h1 .accent { color: ${RED}; display: block; }
  .rule { margin-top: 34px; width: 132px; height: 2px; background: ${RED}; }

  .spacer { flex: 1 1 auto; min-height: 20px; }
  .page.probe { display: block; }
  .page.probe .spacer { display: block; height: 20px; }

  /* Painel claro: o código NUNCA é invertido nem colorido — é o que garante a
     leitura. A marca vive na moldura, na tipografia e no cantinho vermelho. */
  .qrwrap { display: flex; align-items: center; gap: 34px; }
  .qr {
    flex: 0 0 auto;
    width: 440px; height: 440px; padding: 20px;
    background: ${OFFWHITE}; border-radius: 12px;
  }
  .qr svg { display: block; width: 100%; height: 100%; }
  .aside { display: flex; flex-direction: column; gap: 16px; }
  .instr { font-size: 40px; line-height: 1.16; letter-spacing: -0.012em; }
  .terms {
    display: flex; flex-wrap: wrap; gap: 14px; align-items: center;
    font-family: Plex, monospace; font-size: 19px; letter-spacing: 0.16em;
    text-transform: uppercase; color: rgba(185,176,162,0.82);
  }
  .terms .dot { width: 4px; height: 4px; border-radius: 50%; background: ${RED}; }
  .url { font-family: Plex, monospace; font-size: 22px; letter-spacing: 0.06em; color: rgba(244,240,232,0.92); }
  .url em { font-style: normal; color: ${RED}; }

  .foot {
    margin-top: 46px; border-top: 1px solid rgba(185,176,162,0.18); padding-top: 22px;
    font-family: Plex, monospace; font-size: 20px; letter-spacing: 0.05em;
    color: rgba(185,176,162,0.72);
  }
</style></head>
<body>
 <div class="canvas">
  <div class="glow"></div>
  <div class="frame"></div>

  <div class="page">
    <div class="tag"><span>${c.kicker}</span><span class="red">${lang.toUpperCase()}</span></div>

    <h1>${c.head.map((l) => `<span>${l}</span><br>`).join("")}<span class="accent">${c.headAccent}</span></h1>
    <div class="rule"></div>

    <div class="spacer"></div>

    <div class="qrwrap">
      <div class="qr">${qrSvg}</div>
      <div class="aside">
        <div class="instr">${c.instruction}</div>
        <div class="terms">${c.terms.map((t) => `<span>${t}</span>`).join('<span class="dot"></span>')}</div>
        <div class="url">${c.urlLabel.replace(/\/(.+)$/, "/<em>$1</em>")}</div>
      </div>
    </div>

    <div class="spacer"></div>

    <div class="foot">${c.foot}</div>
  </div>

  <div class="grain"></div>
 </div>
 <script>
   addEventListener("load", () => {
     const p = document.querySelector(".page");
     const box = p.clientHeight;
     p.classList.add("probe");
     const kids = p.children;
     const last = kids[kids.length - 1];
     const natural = Math.ceil(last.getBoundingClientRect().bottom - p.getBoundingClientRect().top);
     p.classList.remove("probe");
     document.title = "FIT:" + natural + "/" + box;
   });
 </script>
</body></html>`;
}

// ─── Chromium ─────────────────────────────────────────────────────────────────
function findChromium() {
  const fromEnv = process.env.CHROMIUM_BIN;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const candidates = [
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (base) {
    for (const v of ["chromium-1194", "chromium"]) {
      const p = join(base, v, "chrome-linux", "chrome");
      if (existsSync(p)) return p;
    }
  }
  throw new Error("Chromium não encontrado — aponte CHROMIUM_BIN para o binário do Chrome/Chromium.");
}

function shoot(htmlText, out, { w, h }, bin) {
  const tmp = join(tmpdir(), `qr-card-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(tmp, htmlText, "utf8");
  try {
    const dom = execFileSync(
      bin,
      ["--headless=new", "--no-sandbox", "--disable-gpu", `--window-size=${w},${h}`, "--virtual-time-budget=3000", "--dump-dom", `file://${tmp}`],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 }
    );
    const m = dom.match(/FIT:(\d+)\/(\d+)/);
    if (m && Number(m[1]) + 20 > Number(m[2])) {
      throw new Error(`o cartão não cabe: ${m[1]}px de conteúdo para ${m[2]}px de área útil (${out.split("/").pop()}).`);
    }
    execFileSync(
      bin,
      [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--force-color-profile=srgb",
        `--window-size=${w},${h}`,
        `--screenshot=${out}`,
        "--virtual-time-budget=3000",
        `file://${tmp}`,
      ],
      { stdio: "pipe" }
    );
  } finally {
    rmSync(tmp, { force: true });
  }
}

// ─── Conferência: o PNG gerado abre a URL certa? ─────────────────────────────
function decodePng(path) {
  const png = PNG.sync.read(readFileSync(path));
  const res = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return res?.data ?? null;
}

function assertScans(path, expected) {
  const got = decodePng(path);
  if (got !== expected) {
    throw new Error(`QR ilegível ou apontando errado em ${path.split("/").pop()}: leu ${got ?? "NADA"}, esperava ${expected}`);
  }
}

async function main() {
  const bin = findChromium();
  mkdirSync(OUT_DIR, { recursive: true });

  for (const lang of ["br", "es"]) {
    const c = COPY[lang];

    // 1) QR puro, alta resolução (impressão / colar em outra arte)
    const plain = join(OUT_DIR, `pesquisa-${lang}-qr.png`);
    await QRCode.toFile(plain, c.url, { ...QR_OPTS, type: "png", width: 1600 });
    assertScans(plain, c.url);
    console.log(`✓ public/qr/pesquisa-${lang}-qr.png`);

    // 2) Cartão da marca (compartilhar / imprimir)
    const svg = await QRCode.toString(c.url, { ...QR_OPTS, type: "svg" });
    const card = join(OUT_DIR, `pesquisa-${lang}-card-${CARD.w}x${CARD.h}.png`);
    shoot(cardHtml(lang, svg), card, CARD, bin);
    assertScans(card, c.url); // o QR tem que ler DENTRO da arte, não só sozinho
    console.log(`✓ public/qr/pesquisa-${lang}-card-${CARD.w}x${CARD.h}.png`);
  }
}

await main();
