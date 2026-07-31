#!/usr/bin/env node
// ─── Criativo do anúncio da pesquisa — BR e ES, feed e reel ──────────────────
// Gera as artes do anúncio pago que leva à pesquisa. Um HTML por (idioma × formato),
// fotografado pelo Chromium headless — mesma ideia do resto do repo: a arte é CÓDIGO,
// versionada e re-rendrizável, não um PNG solto que ninguém sabe editar.
//
//   npm run render:ads                 → 4 PNGs em public/ads/
//   CHROMIUM_BIN=/caminho/chrome npm run render:ads
//
// Formatos:
//   feed  1080×1350 (4:5) — o formato que mais ocupa tela no feed
//   reel  1080×1920 (9:16) — capa do reel / story, com as zonas de UI do
//         Instagram (topo e rodapé) deixadas livres de propósito.
//
// Para trocar a copy: mexa em COPY, rode de novo. Nada mais.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "ads");

// ─── Marca (globals.css) ──────────────────────────────────────────────────────
const INK = "#0B0B0C";
const OFFWHITE = "#F4F0E8";
const WARM = "#B9B0A2";
const RED = "#A45A5A";

// ─── Copy ─────────────────────────────────────────────────────────────────────
// Curta de propósito: o anúncio tem menos de meio segundo para ser lido. A promessa
// ("3 minutos, anônimo, vira livro") é a MESMA da página — anúncio que promete o que
// a página não cumpre queima o dinheiro no primeiro clique.
const COPY = {
  br: {
    kicker: "Estudo editorial",
    brand: "Dr. Liberdade",
    lede: "Você dá match, posta, rola o feed.",
    head: ["E o amor —", "ficou melhor"],
    headAccent: "ou pior?",
    plate: "Todo mundo tem uma opinião.\nQuase ninguém tem dado.",
    fieldLabel: "amostra em coleta",
    terms: ["3 minutos", "anônimo", "vira livro"],
    cta: "drlibertad.com/pesquisa",
    locale: "pt-BR",
  },
  es: {
    kicker: "Estudio editorial",
    brand: "Dr. Libertad",
    lede: "Das match, publicas, haces scroll.",
    head: ["¿Y el amor —", "está mejor"],
    headAccent: "o peor?",
    plate: "Todo el mundo tiene una opinión.\nCasi nadie tiene datos.",
    fieldLabel: "muestra en curso",
    terms: ["3 minutos", "anónimo", "se vuelve libro"],
    cta: "drlibertad.com/investigacion",
    locale: "es-ES",
  },
};

// `safeTop`/`safeBottom` = faixas que a interface do Instagram cobre no 9:16.
// A página inteira vive DENTRO do que sobra — por isso o reel tem tipo um pouco
// menor que o feed, mesmo sendo uma tela maior: a área útil é que é menor.
const FORMATS = {
  feed: { w: 1080, h: 1350, margin: 84, head: 108, lede: 34, ledeGap: 84, safeTop: 0, safeBottom: 0, rows: 4 },
  reel: { w: 1080, h: 1920, margin: 96, head: 108, lede: 34, ledeGap: 70, safeTop: 240, safeBottom: 330, rows: 4 },
};

// ─── Fontes embutidas (base64) — render idêntico em qualquer máquina ─────────
function dataUrl(path, mime) {
  return `data:${mime};base64,${readFileSync(path).toString("base64")}`;
}
const FRAUNCES = dataUrl(join(ROOT, "public", "fonts", "fraunces-700.woff2"), "font/woff2");
const FRAUNCES_EXT = dataUrl(join(ROOT, "public", "fonts", "fraunces-700-ext.woff2"), "font/woff2");
const MONO = dataUrl(join(ROOT, "scripts", "fonts", "IBMPlexMono-Regular.ttf"), "font/ttf");

// ─── Campo de marcas ─────────────────────────────────────────────────────────
// Cada traço é uma resposta. A maioria em cinza; algumas em vermelho — a leitura
// muda de "decoração" para "dado sendo colhido" sem uma linha de texto explicando.
// Semente fixa: re-render dá exatamente a mesma arte (arte versionada não pode
// mudar sozinha entre dois `npm run`).
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function markField({ cols, rows, seed }) {
  const rnd = mulberry32(seed);
  const marks = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const roll = rnd();
      // ~1 em 7 acende em vermelho; o resto respira em cinza, com alturas
      // ligeiramente diferentes para o campo não virar textura de máquina.
      const hot = roll > 0.86;
      const h = 18 + Math.round(rnd() * 14);
      marks.push(
        `<span class="mk${hot ? " hot" : ""}" style="height:${hot ? h + 6 : h}px"></span>`
      );
    }
  }
  return marks.join("");
}

function html(lang, formatKey) {
  const c = COPY[lang];
  const f = FORMATS[formatKey];
  const cols = 30;
  const seed = lang === "br" ? 20260731 : 19870514;

  return `<!doctype html>
<html lang="${c.locale}"><head><meta charset="utf-8">
<style>
  @font-face { font-family: Fraunces; src: url("${FRAUNCES}") format("woff2"); font-weight: 100 900; font-display: block; }
  @font-face { font-family: FrauncesExt; src: url("${FRAUNCES_EXT}") format("woff2"); font-weight: 100 900; font-display: block; }
  @font-face { font-family: Plex; src: url("${MONO}") format("truetype"); font-weight: 400; font-display: block; }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${f.w}px; height: ${f.h}px; }
  body {
    background: ${INK};
    color: ${OFFWHITE};
    font-family: Fraunces, FrauncesExt, serif;
    font-variation-settings: "wght" 700, "SOFT" 0, "WONK" 0;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  /* Tudo é medido a partir DESTA caixa (e não da janela do navegador): a arte
     tem tamanho absoluto, então a moldura e a página não podem depender de
     quanto o Chromium resolveu dar de viewport. */
  .canvas { position: relative; width: ${f.w}px; height: ${f.h}px; overflow: hidden; }

  /* Luz baixa vinda de cima à esquerda + queda para o preto no rodapé: dá
     profundidade ao papel escuro sem nenhum elemento gráfico a mais. */
  .glow {
    position: absolute; inset: 0;
    background:
      radial-gradient(120% 68% at 18% -6%, rgba(244,240,232,0.085) 0%, rgba(244,240,232,0) 58%),
      radial-gradient(90% 55% at 92% 8%, rgba(164,90,90,0.10) 0%, rgba(164,90,90,0) 60%),
      linear-gradient(180deg, rgba(11,11,12,0) 55%, rgba(0,0,0,0.55) 100%);
  }
  /* Grão fino (SVG inline) — tira o "digital limpo demais" da chapa escura. */
  .grain {
    position: absolute; inset: 0; opacity: 0.16; mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='180' height='180' filter='url(%23n)' opacity='0.5'/></svg>");
  }

  /* A moldura abraça a PÁGINA, não a tela: no formato reel, a faixa que o
     Instagram cobre com a própria interface vira passe-partout — vazio de
     propósito, e não um pedaço de arte que a UI do app vai comer. */
  .frame {
    position: absolute;
    left: ${f.margin - 26}px; right: ${f.margin - 26}px;
    top: ${f.margin + f.safeTop - 26}px; bottom: ${f.margin + f.safeBottom - 26}px;
    border: 1px solid rgba(185,176,162,0.16);
  }

  .page {
    position: absolute;
    left: ${f.margin}px; right: ${f.margin}px;
    top: ${f.margin + f.safeTop}px; bottom: ${f.margin + f.safeBottom}px;
    display: flex; flex-direction: column;
    /* Respiro final: o espaçador elástico empurra o rodapé até o fim da página —
       sem este piso, a descendente do "g" de investigacion encosta no filete. */
    padding-bottom: 28px;
  }

  .row { display: flex; align-items: baseline; justify-content: space-between; gap: 24px; }
  .tag {
    font-family: Plex, monospace; font-weight: 400;
    font-size: 19px; letter-spacing: 0.30em; text-transform: uppercase;
    color: rgba(185,176,162,0.72);
  }
  .tag.red { color: ${RED}; }

  .lede {
    margin-top: ${f.ledeGap}px;
    font-family: Plex, monospace;
    font-size: ${f.lede}px; line-height: 1.5; letter-spacing: 0.012em;
    color: rgba(185,176,162,0.88);
  }

  h1 {
    margin-top: 26px;
    font-size: ${f.head}px; line-height: 1.02; letter-spacing: -0.024em;
    font-weight: 700;
  }
  h1 .accent { color: ${RED}; display: block; }
  /* Régua fina sob a pergunta: fecha o bloco e amarra o vermelho ao rodapé. */
  .rule { margin-top: ${formatKey === "reel" ? 54 : 40}px; width: 132px; height: 2px; background: ${RED}; }

  .plate {
    margin-top: ${formatKey === "reel" ? 46 : 34}px;
    font-family: Plex, monospace;
    font-size: ${formatKey === "reel" ? 27 : 25}px; line-height: 1.62;
    letter-spacing: 0.005em; color: rgba(244,240,232,0.62);
    white-space: pre-line;
  }

  .spacer { flex: 1 1 auto; min-height: 24px; }
  /* Modo sonda: empilha em bloco e congela o respiro, para medir a altura
     NATURAL do conteúdo (com o espaçador elástico, tudo "cabe" por definição). */
  .page.probe { display: block; }
  .page.probe .spacer { display: block; height: 24px; }

  .field { display: flex; flex-direction: column; gap: 13px; }
  .field .marks {
    display: grid; grid-template-columns: repeat(${cols}, 1fr);
    align-items: end; gap: 9px; height: ${f.rows * 42}px;
    grid-auto-rows: 1fr;
  }
  .mk { display: block; width: 3px; background: rgba(185,176,162,0.30); border-radius: 2px; justify-self: center; align-self: end; }
  .mk.hot { background: ${RED}; opacity: 0.92; }
  .field .cap {
    font-family: Plex, monospace; font-size: 17px; letter-spacing: 0.26em;
    text-transform: uppercase; color: rgba(185,176,162,0.48);
  }

  .foot { margin-top: ${formatKey === "reel" ? 58 : 44}px; border-top: 1px solid rgba(185,176,162,0.18); padding-top: 26px; }
  .terms { display: flex; gap: 18px; align-items: center; font-family: Plex, monospace; font-size: 20px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(185,176,162,0.80); }
  .terms .dot { width: 4px; height: 4px; border-radius: 50%; background: ${RED}; }
  .cta {
    margin-top: 18px;
    font-size: ${formatKey === "reel" ? 44 : 40}px; line-height: 1.24; letter-spacing: -0.012em;
    color: ${OFFWHITE};
  }
  .cta em { font-style: normal; color: ${RED}; }
</style></head>
<body>
 <div class="canvas">
  <div class="glow"></div>
  <div class="frame"></div>

  <div class="page">
    <div class="row">
      <div class="tag">${c.kicker} · ${c.brand}</div>
      <div class="tag red">${lang.toUpperCase()}</div>
    </div>

    <p class="lede">${c.lede}</p>
    <h1>${c.head.map((l) => `<span>${l}</span><br>`).join("")}<span class="accent">${c.headAccent}</span></h1>
    <div class="rule"></div>
    <p class="plate">${c.plate}</p>

    <div class="spacer"></div>

    <div class="field">
      <div class="marks">${markField({ cols, rows: f.rows, seed })}</div>
      <div class="cap">${c.fieldLabel}</div>
    </div>

    <div class="foot">
      <div class="terms">
        ${c.terms.map((t) => `<span>${t}</span>`).join('<span class="dot"></span>')}
      </div>
      <div class="cta">${c.cta.replace(/\/(.+)$/, "/<em>$1</em>")}</div>
    </div>
  </div>

  <div class="grain"></div>
 </div>
  <script>
    // Sonda de encaixe: o render confere se a página CABE na área útil antes de
    // fotografar. Copy nova que estoura a moldura falha na hora, em vez de virar
    // um PNG bonito com o CTA pendurado fora do quadro.
    addEventListener("load", () => {
      const p = document.querySelector(".page");
      const box = p.clientHeight;
      p.classList.add("probe");
      const kids = p.children;
      const last = kids[kids.length - 1];
      // scrollHeight não serve: a página tem altura fixa, então ele nunca desce
      // abaixo da caixa. O que interessa é onde o ÚLTIMO bloco termina.
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

/** Lê a sonda de encaixe (título da página) e devolve [conteúdo, área útil]. */
function measure(tmp, { w, h }, bin) {
  const dom = execFileSync(
    bin,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      `--window-size=${w},${h}`,
      "--virtual-time-budget=3000",
      "--dump-dom",
      `file://${tmp}`,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 }
  );
  const m = dom.match(/FIT:(\d+)\/(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : [0, 0];
}

function shoot(htmlText, out, { w, h }, bin) {
  const tmp = join(tmpdir(), `ad-card-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(tmp, htmlText, "utf8");
  try {
    // Folga mínima: a última linha não pode encostar na moldura (a Fraunces tem
    // descendente longa — "g" de investigacion cruza o filete se ficar rente).
    const BREATH = 28;
    const [content, box] = measure(tmp, { w, h }, bin);
    if (content + BREATH > box) {
      throw new Error(
        `a arte não cabe: ${content}px de conteúdo (+${BREATH}px de folga) para ${box}px de área útil ` +
          `(${out.split("/").pop()}). ` +
          `Encurte a copy ou baixe \`head\`/\`rows\` em FORMATS.`
      );
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
        "--default-background-color=00000000",
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

function main() {
  const bin = findChromium();
  mkdirSync(OUT_DIR, { recursive: true });
  for (const lang of ["br", "es"]) {
    for (const [key, f] of Object.entries(FORMATS)) {
      const out = join(OUT_DIR, `pesquisa-${lang}-${key}-${f.w}x${f.h}.png`);
      shoot(html(lang, key), out, f, bin);
      console.log(`✓ ${out.replace(`${ROOT}/`, "")}`);
    }
  }
}

main();
