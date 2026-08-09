import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { isAllowedFetchUrl } from "@/lib/safe-fetch";
import { isRateLimited } from "@/lib/rate-limit";
import { loadFraunces } from "@/lib/og-font";

export const runtime = "edge";

// ─── Dimensões ────────────────────────────────────────────────────────────────
const W = 1080;
const H = 1350;

// ─── Paleta EXATA do site (EditorialGrid / PosterFace) ───────────────────────
const INK       = "#0B0B0C";
const OFFWHITE  = "#F4F0E8";
const RED       = "#A45A5A";
const INK_70    = "rgba(11,11,12,0.70)";
const INK_65    = "rgba(11,11,12,0.65)";
const INK_55    = "rgba(11,11,12,0.55)";
const INK_22    = "rgba(11,11,12,0.22)";
const INK_20    = "rgba(11,11,12,0.20)";
const INK_10    = "rgba(11,11,12,0.10)";
const RED_45    = "rgba(164,90,90,0.45)";

// ─── Proporções: site usa aspect-square para o PosterFace ────────────────────
// Card width = W - 2*CM. PosterFace é quadrado = CW × CW. Caption bar abaixo.
const CM = 44;          // margem frame → cartão
const CW = W - CM * 2; // 992px — largura do cartão
// O cartão tem: poster quadrado (992×992) + caption bar (88px) = 1080px total
// Mas nosso frame é 1350px, então temos 270px extras distribuídos acima/abaixo do card
const CAPTION_H = 88;
const CH = CW + CAPTION_H;  // 1080px total do cartão (poster 992² + caption 88)

// ─── Escala: site original ~394px → nosso ~992px → factor ≈ 2.52 ───────────
const F = CW / 394; // ≈ 2.52

// Padding interno: p-7 = 28px original → ~71px
const PAD = Math.round(28 * F);

// ─── Tamanho da fonte do título ───────────────────────────────────────────────
const SERIF = '"Fraunces", ui-serif, Georgia, serif';

// ESCALA (subida 2026-08-09, medida — não opinada): a capa publicada em 09/08 ocupava
// **76% da largura**; as 10 contas de referência ficam entre **85% e 95%**. Margem grande
// no feed é espaço desperdiçado: a frase É o assunto da peça, não uma legenda por cima da
// foto. Cada degrau subiu ~18%, mantendo a mesma curva (frase curta domina mais).
// A trava de segurança continua sendo `fitTitleSize`: se a palavra mais longa estourar a
// largura, ou se passar do número de linhas, o corpo desce sozinho.
function titleSize(text: string): number {
  const l = text.length;
  if (l <= 14) return 176;
  if (l <= 22) return 150;
  if (l <= 32) return 128;
  if (l <= 44) return 110;
  if (l <= 58) return 94;
  if (l <= 76) return 76;
  return 64;
}

// Garante que o título caiba na largura: limita pela palavra MAIS LONGA
// (Fraunces 700 em caixa-alta ≈ 0.66·fontSize por caractere). Evita corte.
//
// Clamp de ALTURA (médio, auditoria 30/06): satori NÃO reflui p/ caber — um título
// longo (muitas palavras médias) passava por byWord mas transbordava o box na
// VERTICAL. Aqui limitamos também por Nº DE LINHAS (independente de px, robusto p/
// todos os call-sites): estima linhas com ~0.55·fontSize por char (média Fraunces
// caixa-alta) e reduz o corpo até caber em `maxLines` (piso 40). Título curto normal
// (1-3 linhas) NÃO muda — o laço nem executa; só o título patológico encolhe.
/**
 * Corta a manchete nos pontos de VIRADA da frase (`;` `—` `:` e a vírgula da antítese),
 * não por contagem de caracteres. É onde a voz da marca dobra — «você tem direito a fazer
 * o que quiser; **eu tenho direito de dizer o que penso**» — e é a linha que precisa
 * respirar sozinha. Devolve 1 bloco quando não há virada: aí o satori quebra como antes.
 */
function quebrarPorSentido(texto: string): string[] {
  const t = texto.trim();
  const m = t.match(/^(.+?[;:—–])\s*(.+)$/);
  if (m && m[1].length > 8 && m[2].length > 8) return [m[1].trim(), m[2].trim()];
  // Vírgula só vale como virada quando os dois lados têm corpo — senão parte uma
  // enumeração no meio, que é pior do que não quebrar.
  const v = t.match(/^(.{18,}?),\s*(.{18,})$/);
  if (v) return [v[1].trim() + ",", v[2].trim()];
  return [t];
}

function fitTitleSize(text: string, maxWidth: number, maxLines = 5): number {
  const base = titleSize(text);
  const longest = text.split(/\s+/).reduce((m, w) => Math.max(m, w.length), 0);
  const byWord = Math.floor(maxWidth / Math.max(longest, 1) / 0.66);
  let size = Math.max(40, Math.min(base, byWord));
  const estLines = (f: number) => Math.ceil(text.length / Math.max(1, Math.floor(maxWidth / (f * 0.55))));
  while (size > 40 && estLines(size) > maxLines) size -= 2;
  return Math.max(40, size);
}

// RNG determinístico por post: mesmo seed → mesmo desenho (estável entre renders)
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a: number): () => number {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Direção de arte por tema (sem IA: cor de tinta + motivo procedural) ──────
const M = 88; // margem interna (full-bleed)

type Cat = "freedom" | "self" | "network" | "dopamine" | "anxiety" | "mind";

// 21 motivos distintos — um por TEMA (não por categoria). A cor segue a
// categoria (coesão de marca); o DESENHO é único por tema.
type MotifId =
  | "gateway" | "iris" | "web" | "spiral" | "burst" | "branches"
  | "waves" | "bars" | "isolation" | "ripple" | "descent" | "boundary"
  | "clock" | "synapse" | "squares" | "orbit" | "decay" | "masks"
  | "unplug" | "embrace" | "mirror";

const MOTIF_IDS: readonly MotifId[] = [
  "gateway", "iris", "web", "spiral", "burst", "branches",
  "waves", "bars", "isolation", "ripple", "descent", "boundary",
  "clock", "synapse", "squares", "orbit", "decay", "masks",
  "unplug", "embrace", "mirror",
];

interface CatStyle { accent: string; label: string }

// ACENTO ÚNICO = a cor do SITE (drlibertad.com): rosa/vinho `#A45A5A` (globals.css,
// junto de creme #f4f0e8 e dark #0B0B0C). Antes cada categoria tinha um acento próprio
// (azul/verde/âmbar…) → "fugia muito" da identidade do site (pedido do dono 2026-06-26:
// "acentuar as cores do site"). Agora os slides usam o MESMO acento do site em tudo
// (número, rodapé, kicker, subtítulo, tom do motivo) → carrossel e site falam a mesma
// língua visual. A CATEGORIA segue distinguindo o MOTIVO (desenho) e o RÓTULO, não a cor.
const SITE_ACCENT = "#A45A5A";
const CATS: Record<Cat, CatStyle> = {
  freedom:  { accent: SITE_ACCENT, label: "LIBERTAD"   },
  dopamine: { accent: SITE_ACCENT, label: "RECOMPENSA" },
  anxiety:  { accent: SITE_ACCENT, label: "ANSIEDAD"   },
  network:  { accent: SITE_ACCENT, label: "CONEXIÓN"   },
  self:     { accent: SITE_ACCENT, label: "EL YO"      },
  mind:     { accent: SITE_ACCENT, label: "LA MENTE"   },
};

// ─── i18n do criativo (ES default / PT-BR) ───────────────────────────────────
// Mantém o /api/og autossuficiente (edge): sem importar de @/lib/accounts.
type OgLang = "es" | "br";

const BRAND: Record<OgLang, string> = { es: "Dr. Libertad", br: "Dr. Liberdade" };

// @handle por idioma (para a faixa creme da capa). Espelha ACCOUNTS (accounts.ts),
// mas o /api/og é edge-autossuficiente → constante local (não importa de @/lib).
const HANDLE: Record<OgLang, string> = { es: "@dr.liberdad", br: "@dr.liberdade.br" };

// Rótulo da categoria por idioma (substitui CATS[cat].label, que era só ES).
const CAT_LABEL: Record<OgLang, Record<Cat, string>> = {
  es: { freedom: "LIBERTAD",  dopamine: "RECOMPENSA", anxiety: "ANSIEDAD",  network: "CONEXIÓN", self: "EL YO", mind: "LA MENTE" },
  br: { freedom: "LIBERDADE", dopamine: "RECOMPENSA", anxiety: "ANSIEDADE", network: "CONEXÃO",  self: "O EU",  mind: "A MENTE"  },
};

// Micro-copy fixa do criativo por idioma.
const UI_TEXT: Record<OgLang, { swipe: string; question: string; answer: string }> = {
  es: { swipe: "Desliza para leer", question: "UNA PREGUNTA", answer: "Responde en los comentarios" },
  br: { swipe: "Deslize para ler",  question: "UMA PERGUNTA", answer: "Responda nos comentários" },
};

// Slide-final do FUNIL (comment→DM): convida a comentar a palavra-chave (= palavra de
// marca, LIBERTAD/LIBERDADE) p/ receber a prévia grátis do livro. Texto fixo por idioma
// (BR é BR, ES é ES); a palavra (kw) vem por parâmetro. O nome do livro é universal.
const GUIDE_TEXT: Record<OgLang, { eyebrow: string; book: string; sub: string; action: string; note: string }> = {
  es: { eyebrow: "ADELANTO GRATIS", book: "I LOVE DOPAMINA", sub: "El placer, el vicio y el camino de vuelta al equilibrio.", action: "Comenta esta palabra:", note: "y te lo enviamos al Direct — gratis." },
  br: { eyebrow: "PRÉVIA GRÁTIS",   book: "I LOVE DOPAMINA", sub: "O prazer, o vício e o caminho de volta ao equilíbrio.",  action: "Comente esta palavra:", note: "e mandamos no seu Direct — grátis." },
};

// Motivo padrão por categoria (fallback quando ?motif= não vem)
const CAT_DEFAULT_MOTIF: Record<Cat, MotifId> = {
  freedom: "gateway", dopamine: "burst", anxiety: "waves",
  network: "web", self: "masks", mind: "synapse",
};

// Deriva a categoria a partir do tópico/keyword (heurística por palavras-chave)
function detectCat(s: string): Cat {
  const t = (s || "").toLowerCase();
  if (/dopamin|recompens|validac|aplauso|like|adicc|desintox|casino|tragamoned|tel[eé]fono|atenci|pantalla|trafican/.test(t)) return "dopamine";
  if (/ansied|miedo|fracaso|perfeccion|burnout|procrastin|culpa|paraliz|estr[eé]s|sabote/.test(t)) return "anxiety";
  if (/red|social|comparaci|soledad|amigo|conect|relacion/.test(t)) return "network";
  if (/ego|m[aá]scar|autoconoc|amor propio|autoexig|l[ií]mite|yo real|espejo|conscien/.test(t)) return "self";
  if (/mente|neuroplast|aburr|cambiar|cerebro|reprogram/.test(t)) return "mind";
  if (/libert|elecc|elegir|decis/.test(t)) return "freedom";
  return "freedom";
}

function rgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ─── Camada de motivo procedural — desenhada POR POST (seed) e POR TEMA ────────
// SVG inline (curvas/espirais/ramos reais). 21 motivos distintos; cada post tem
// seed estável → o mesmo tema sempre desenha igual, temas diferentes diferem.
function MotifLayer({ motif, accent, dark, seed }: {
  motif: MotifId; accent: string; dark: boolean; seed: number;
}) {
  const rng = mulberry32(seed);
  const rnd = (a: number, b: number) => a + rng() * (b - a);
  const ri  = (a: number, b: number) => Math.floor(rnd(a, b + 1));
  // satori serializa <svg> inline para string e NÃO aceita filhos montados
  // dinamicamente (array/fragment) → emitimos o SVG como string e renderizamos
  // via <img> data-URI. Cor = accent; opacidade separada (rgba inline é frágil).
  const a = (op: number) => ((dark ? 1 : 0.62) * op).toFixed(3);
  const TAU = Math.PI * 2;
  const parts: string[] = [];
  const f = (n: number) => n.toFixed(1);

  const ring = (cx: number, cy: number, r: number, op: number, w: number) =>
    parts.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(Math.max(1, r))}" fill="none" stroke="${accent}" stroke-opacity="${a(op)}" stroke-width="${w}"/>`);
  const dot = (cx: number, cy: number, r: number, op: number) =>
    parts.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(Math.max(1, r))}" fill="${accent}" fill-opacity="${a(op)}"/>`);
  const seg = (x1: number, y1: number, x2: number, y2: number, op: number, w: number) =>
    parts.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${accent}" stroke-opacity="${a(op)}" stroke-width="${w}" stroke-linecap="round"/>`);
  const pline = (pts: [number, number][], op: number, w: number) =>
    parts.push(`<polyline points="${pts.map(p => `${f(p[0])},${f(p[1])}`).join(" ")}" fill="none" stroke="${accent}" stroke-opacity="${a(op)}" stroke-width="${w}" stroke-linecap="round"/>`);
  const pth = (d: string, op: number, w: number) =>
    parts.push(`<path d="${d}" fill="none" stroke="${accent}" stroke-opacity="${a(op)}" stroke-width="${w}" stroke-linecap="round"/>`);

  switch (motif) {
    case "gateway": { // Libertad mental — portal/arco + raios de luz
      const cx = rnd(0.46, 0.64) * W, top = rnd(0.16, 0.24) * H;
      let w = rnd(0.44, 0.56) * W;
      for (let i = 0, n = ri(2, 3); i < n; i++) {
        const x1 = cx - w / 2, x2 = cx + w / 2, sh = w * 0.5;
        pth(`M ${x1} ${H} L ${x1} ${top + sh} C ${x1} ${top}, ${x2} ${top}, ${x2} ${top + sh} L ${x2} ${H}`, 0.72 - i * 0.22, rnd(7, 11));
        w *= rnd(0.6, 0.72);
      }
      for (let i = 0, n = ri(3, 5); i < n; i++) {
        const rx = cx + rnd(-0.12, 0.12) * W;
        seg(rx, top - rnd(20, 60), rx, top - rnd(140, 260), 0.4, 3);
      }
      break;
    }
    case "iris": { // Autoconocimiento — olho / íris (mirar para dentro)
      const cx = rnd(0.44, 0.66) * W, cy = rnd(0.16, 0.30) * H;
      const ew = rnd(300, 420), eh = ew * rnd(0.46, 0.56);
      pth(`M ${cx - ew / 2} ${cy} Q ${cx} ${cy - eh}, ${cx + ew / 2} ${cy}`, 0.7, 5);
      pth(`M ${cx - ew / 2} ${cy} Q ${cx} ${cy + eh}, ${cx + ew / 2} ${cy}`, 0.7, 5);
      for (let i = 0, n = ri(3, 5); i < n; i++) ring(cx, cy, eh * 0.72 * (1 - i / (n + 1)), 0.6 - i * 0.08, i === 0 ? 5 : 3);
      dot(cx, cy, rnd(10, 16), 0.85);
      break;
    }
    case "web": { // Redes sociales — teia densa
      const kk = ri(9, 13);
      const pts: [number, number][] = [];
      for (let i = 0; i < kk; i++) pts.push([rnd(0.08, 0.92) * W, rnd(0.05, 0.46) * H]);
      for (let i = 0; i < kk; i++) {
        const near = pts.map((p, j) => ({ j, dd: (p[0] - pts[i][0]) ** 2 + (p[1] - pts[i][1]) ** 2 }))
          .filter(o => o.j !== i).sort((a, b) => a.dd - b.dd).slice(0, 2);
        for (const o of near) seg(pts[i][0], pts[i][1], pts[o.j][0], pts[o.j][1], 0.3, 1.5);
      }
      pts.forEach(p => dot(p[0], p[1], rnd(5, 8), 0.85));
      break;
    }
    case "spiral": { // Adicción — espiral (scroll infinito que puxa pra dentro)
      const cx = rnd(0.5, 0.72) * W, cy = rnd(0.16, 0.30) * H;
      const turns = rnd(3.2, 4.6), maxR = rnd(180, 260), steps = 160;
      const pts: [number, number][] = [];
      for (let i = 0; i <= steps; i++) { const t = i / steps, r = t * maxR, a = t * turns * TAU; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
      pline(pts, 0.65, 3.5);
      dot(cx, cy, rnd(6, 10), 0.9);
      break;
    }
    case "burst": { // Dopamina — explosão/raios de recompensa
      const cx = rnd(0.5, 0.74) * W, cy = rnd(0.14, 0.28) * H;
      const n = ri(18, 28), r0 = rnd(26, 46), r1 = rnd(150, 240);
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rnd(-0.05, 0.05), rr = r1 * rnd(0.7, 1); seg(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.5, 2.5); }
      ring(cx, cy, r0, 0.8, 3); dot(cx, cy, rnd(5, 8), 0.9);
      break;
    }
    case "branches": { // Mucha elección — árvore de bifurcações
      const grow = (x: number, y: number, ang: number, len: number, d: number) => {
        if (d <= 0 || len < 9) return;
        const x2 = x + Math.cos(ang) * len, y2 = y - Math.sin(ang) * len;
        seg(x, y, x2, y2, 0.28 + 0.07 * d, Math.max(1.5, d * 0.9));
        const sp = rnd(0.4, 0.7);
        grow(x2, y2, ang + sp, len * rnd(0.62, 0.74), d - 1);
        grow(x2, y2, ang - sp, len * rnd(0.62, 0.74), d - 1);
      };
      grow(rnd(0.4, 0.6) * W, H * rnd(0.46, 0.52), Math.PI / 2, rnd(150, 200), ri(4, 5));
      break;
    }
    case "waves": { // Ansiedad — ondas de interferência
      const n = ri(6, 9), top = rnd(0.08, 0.16) * H, gap = rnd(40, 64);
      for (let i = 0; i < n; i++) {
        const y = top + i * gap, amp = rnd(14, 30), wl = rnd(140, 220), ph = rnd(0, TAU);
        const pts: [number, number][] = [];
        for (let x = -40; x <= W + 40; x += 18) pts.push([x, y + Math.sin(x / wl * TAU + ph) * amp]);
        pline(pts, 0.42 - (i % 3) * 0.06, 2.5);
      }
      break;
    }
    case "bars": { // Comparación social — barras desiguais
      const n = ri(5, 8), bx = rnd(0.16, 0.26) * W, bw = rnd(48, 70), top = rnd(0.10, 0.18) * H, maxH = rnd(220, 320);
      seg(bx - 20, top + maxH, bx + n * bw, top + maxH, 0.3, 2);
      for (let i = 0; i < n; i++) { const h = maxH * rnd(0.3, 1), x = bx + i * bw; seg(x, top + maxH, x, top + maxH - h, 0.5, rnd(8, 12)); }
      break;
    }
    case "isolation": { // Soledad — um nó isolado longe do grupo conectado
      const cxg = rnd(0.6, 0.78) * W, cyg = rnd(0.14, 0.28) * H, kk = ri(5, 7);
      const pts: [number, number][] = [];
      for (let i = 0; i < kk; i++) pts.push([cxg + rnd(-130, 130), cyg + rnd(-110, 110)]);
      for (let i = 0; i < kk; i++) for (let j = i + 1; j < kk; j++) if (rng() < 0.5) seg(pts[i][0], pts[i][1], pts[j][0], pts[j][1], 0.3, 1.5);
      pts.forEach(p => dot(p[0], p[1], rnd(5, 8), 0.8));
      const lx = rnd(0.12, 0.24) * W, ly = rnd(0.30, 0.42) * H;
      ring(lx, ly, rnd(12, 18), 0.8, 3); dot(lx, ly, 4, 0.8);
      break;
    }
    case "ripple": { // Validación — ondas de notificação a partir de um ponto
      const cx = rnd(0.66, 0.84) * W, cy = rnd(0.10, 0.20) * H, n = ri(4, 6), step = rnd(46, 66);
      for (let i = 0; i < n; i++) ring(cx, cy, (i + 1) * step, 0.6 - i * 0.1, 3 - i * 0.2);
      dot(cx, cy, rnd(8, 12), 0.9);
      break;
    }
    case "descent": { // Miedo al fracaso — queda em escada
      const pts: [number, number][] = []; let x = rnd(0.08, 0.16) * W, y = rnd(0.10, 0.16) * H;
      const n = ri(6, 9), dx = (W * 0.78) / n;
      for (let i = 0; i < n; i++) { pts.push([x, y]); x += dx; y += rnd(20, 70); }
      pline(pts, 0.55, 4);
      pts.forEach((p, i) => { if (i % 2 === 0) dot(p[0], p[1], 4, 0.6); });
      break;
    }
    case "boundary": { // Límites sanos — dois círculos e a fronteira
      const cy = rnd(0.16, 0.28) * H, gap = rnd(60, 110), r = rnd(120, 170);
      ring(W * 0.5 - gap / 2 - r, cy, r, 0.6, 5); ring(W * 0.5 + gap / 2 + r, cy, r, 0.6, 5);
      seg(W * 0.5, cy - r - 30, W * 0.5, cy + r + 30, 0.55, 3);
      break;
    }
    case "clock": { // Procrastinación — relógio / atraso
      const cx = rnd(0.46, 0.64) * W, cy = rnd(0.16, 0.28) * H, R = rnd(130, 180);
      ring(cx, cy, R, 0.6, 4);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; seg(cx + Math.cos(a) * (R - 14), cy + Math.sin(a) * (R - 14), cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0.4, 2); }
      const a1 = rnd(0, TAU), a2 = rnd(0, TAU);
      seg(cx, cy, cx + Math.cos(a1) * R * 0.5, cy + Math.sin(a1) * R * 0.5, 0.7, 4);
      seg(cx, cy, cx + Math.cos(a2) * R * 0.78, cy + Math.sin(a2) * R * 0.78, 0.7, 3);
      dot(cx, cy, 6, 0.8);
      break;
    }
    case "synapse": { // Neuroplasticidad — religar (novas vias)
      const cols = ri(5, 7), rows = ri(3, 4), gx = (W * 0.7) / (cols - 1), gy = (H * 0.34) / (rows - 1), ox = W * 0.15, oy = H * 0.08;
      const nodes: [number, number][] = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = ox + c * gx + rnd(-8, 8), y = oy + r * gy + rnd(-8, 8); nodes.push([x, y]); dot(x, y, 3, 0.4); }
      for (let i = 0, m = ri(4, 6); i < m; i++) {
        const a = nodes[ri(0, nodes.length - 1)], b = nodes[ri(0, nodes.length - 1)];
        pth(`M ${a[0]} ${a[1]} Q ${(a[0] + b[0]) / 2 + rnd(-60, 60)} ${(a[1] + b[1]) / 2 + rnd(-50, 50)}, ${b[0]} ${b[1]}`, 0.5, 2.5);
      }
      break;
    }
    case "squares": { // Perfeccionismo — quadrados concêntricos rígidos
      const cx = rnd(0.46, 0.62) * W, cy = rnd(0.16, 0.28) * H; let s = rnd(220, 300);
      for (let i = 0, n = ri(5, 7); i < n; i++) {
        const h = s / 2;
        pline([[cx - h, cy - h], [cx + h, cy - h], [cx + h, cy + h], [cx - h, cy + h], [cx - h, cy - h]], 0.55 - i * 0.05, 3);
        s *= rnd(0.74, 0.82);
      }
      break;
    }
    case "orbit": { // Aburrimiento — uma órbita mínima (vazio fértil)
      const cx = rnd(0.46, 0.62) * W, cy = rnd(0.18, 0.30) * H, R = rnd(150, 210);
      ring(cx, cy, R, 0.45, 2.5);
      const a = rnd(0, TAU); dot(cx + Math.cos(a) * R, cy + Math.sin(a) * R, rnd(8, 12), 0.8);
      dot(cx, cy, rnd(5, 8), 0.6);
      break;
    }
    case "decay": { // Burnout — barras que decaem (energia drenando)
      const n = ri(7, 11), bx = rnd(0.12, 0.18) * W, bw = (W * 0.7) / n, base = rnd(0.30, 0.40) * H, maxH = rnd(180, 260);
      for (let i = 0; i < n; i++) { const t = 1 - i / n, h = maxH * t * rnd(0.85, 1), x = bx + i * bw; seg(x, base, x, base - h, 0.55 * t + 0.12, rnd(6, 9)); }
      break;
    }
    case "masks": { // Máscara social vs. yo real — duas faces sobrepostas
      const cy = rnd(0.14, 0.26) * H, d = rnd(150, 200), off = rnd(70, 120);
      ring(W * 0.5 - off, cy, d, 0.6, 6); ring(W * 0.5 + off, cy, d * rnd(0.85, 1.05), 0.5, 6);
      break;
    }
    case "unplug": { // Desintoxicación digital — laço quebrado/aberto
      const cx = rnd(0.5, 0.66) * W, cy = rnd(0.18, 0.30) * H, R = rnd(130, 180);
      const gap = rnd(0.6, 1.0), a0 = gap / 2, a1 = TAU - gap / 2, steps = 80;
      const pts: [number, number][] = [];
      for (let i = 0; i <= steps; i++) { const a = a0 + (a1 - a0) * i / steps; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
      pline(pts, 0.6, 4);
      const ex = cx + Math.cos(a0) * R, ey = cy + Math.sin(a0) * R;
      pth(`M ${ex} ${ey} Q ${ex + 40} ${ey - 40}, ${ex + 10} ${ey - 90}`, 0.5, 3);
      break;
    }
    case "embrace": { // Amor propio — círculos aninhados em equilíbrio
      const cx = rnd(0.46, 0.6) * W, cy = rnd(0.18, 0.30) * H;
      ring(cx, cy, rnd(160, 200), 0.5, 4); ring(cx, cy, rnd(90, 130), 0.6, 4);
      pth(`M ${cx - 210} ${cy} A 210 210 0 0 1 ${cx + 210} ${cy}`, 0.4, 3);
      dot(cx, cy, rnd(6, 10), 0.7);
      break;
    }
    case "mirror": { // El ego y el miedo — espelho partido
      const cy = rnd(0.16, 0.28) * H, cx = W * 0.5, off = rnd(120, 170), R = rnd(110, 150);
      seg(cx, cy - R - 40, cx, cy + R + 40, 0.5, 2);
      ring(cx - off, cy, R, 0.6, 5);
      for (let i = 0, segs = ri(5, 7); i < segs; i++) {
        const a0 = i / segs * TAU, a1 = (i + 1) / segs * TAU, jit = rnd(-8, 8), pts: [number, number][] = [];
        for (let s = 0; s <= 10; s++) { const a = a0 + (a1 - a0) * s / 10; pts.push([cx + off + jit + Math.cos(a) * R, cy + jit + Math.sin(a) * R]); }
        pline(pts, 0.5, 4);
      }
      break;
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex" }}>
      <img src={`data:image/svg+xml;base64,${btoa(svg)}`} width={W} height={H} style={{ position: "absolute", top: 0, left: 0 }} />
    </div>
  );
}

// ─── Superfície full-bleed: fundo + atmosfera + motivo ────────────────────────
// (A capa NÃO usa mais esta superfície — desde 2026-07-15 a CoverSlide monta a
// própria placa de arte "contain" + letterbox creme. Aqui ficou o fundo editorial
// abstrato dos slides de texto: Insight / CTA / Guide-fallback. Sem imagem/scrim.)
function Surface({ dark, accent, motif, seed, children }: {
  dark: boolean; accent: string; motif: MotifId; seed: number; children: React.ReactNode;
}) {
  return (
    <div style={{
      width: W, height: H, position: "relative", display: "flex",
      background: dark ? INK : OFFWHITE,
      color:      dark ? OFFWHITE : INK,
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex" }}>
        {/* atmosfera */}
        <div style={{
          position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex",
          background: dark
            ? `radial-gradient(circle at 78% 16%, ${rgba(accent, 0.34)}, transparent 58%), radial-gradient(circle at 18% 92%, rgba(0,0,0,0.55), transparent 55%)`
            : `radial-gradient(circle at 20% 14%, rgba(231,221,204,0.65), transparent 58%), radial-gradient(circle at 84% 86%, ${rgba(accent, 0.12)}, transparent 55%)`,
        }} />
        <MotifLayer motif={motif} accent={accent} dark={dark} seed={seed} />
      </div>
      {/* conteúdo */}
      <div style={{
        position: "relative", display: "flex", flexDirection: "column",
        width: "100%", height: "100%", padding: M,
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Cabeçalho editorial (folio + régua de acento) ────────────────────────────
function Folio({ issue, accent, dark, brand }: { issue: string; accent: string; dark: boolean; brand: string }) {
  const dim = dark ? rgba("#F4F0E8", 0.6) : INK_70;
  return (
    <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
      {/* Contagem de edição "ED. NNN" REMOVIDA do carrossel (decisão do dono 2026-06-26):
          fica só a marca + a régua de acento. `issue` segue computado (alimenta o seed do
          motivo), só não é mais exibido. */}
      <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "baseline" }}>
        <span style={{ fontFamily: SERIF, fontSize: 30, letterSpacing: "0.30em", color: dim }}>{brand.toUpperCase()}</span>
      </div>
      <div style={{ marginTop: 22, height: 2, width: "100%", background: accent, display: "flex" }} />
    </div>
  );
}

// ─── Rodapé: etiqueta + progresso ─────────────────────────────────────────────
function Footer({ left, accent, dark, num, total }: {
  left: string; accent: string; dark: boolean; num: number; total: number;
}) {
  const dim = dark ? rgba("#F4F0E8", 0.5) : INK_55;
  const dot = dark ? rgba("#F4F0E8", 0.25) : INK_20;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
      <span style={{ fontFamily: SERIF, fontSize: 24, letterSpacing: "0.26em", textTransform: "uppercase", color: dim }}>{left}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {[1, 2, 3, 4, 5, 6].slice(0, Math.max(total, 1)).map((n) => (
          <div key={n} style={{
            width:  n === num ? 16 : 9,
            height: n === num ? 16 : 9,
            borderRadius: "50%",
            background:   n === num ? accent : dot,
            display: "flex",
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── SLIDE 1: Capa ────────────────────────────────────────────────────────────
// Layout RESTAURADO 2026-07-15 ao da Nº 228 que o dono AMA e postou: a ilustração
// cinematográfica ESCURA preenche o quadro (full-bleed), com TEXTO DISCRETO por cima —
// marca "DR. LIBERDADE · Nº XXX" no topo (régua no acento) e "@handle" embaixo, ambos
// sobre as áreas escuras da imagem. SEM título de post gigante, SEM faixa creme letterbox,
// SEM scrim pesado: só véus SUAVES no topo e na base p/ a legibilidade do texto (o miolo,
// onde vive o sujeito, fica LIMPO). A arte já é 4:5 (= 1080×1350) e o enquadramento é FIXO
// (figura grande/centralizada) → o full-bleed NÃO corta o sujeito. Fundo INK cobre qualquer
// folga (nunca creme). Sem ilustração → motivo abstrato escuro (fail-open).
function CoverSlide({ title, issue, cat, motif, seed, img, lang }: {
  title: string; kw: string; issue: string; mood: "red" | "ink"; cat: Cat; motif: MotifId; total: number; seed: number; img?: string; lang: OgLang;
}) {
  const c      = CATS[cat];
  const handle = HANDLE[lang];
  const edNum  = issue.replace(/\D+/g, "") || "01"; // "ED. 243" → "243"
  const brandLine = `${BRAND[lang].toUpperCase()} · Nº ${edNum}`;
  // A CAPA FALA (2026-08-09, ordem do dono): a capa vinha MUDA desde a reversão de
  // 15/07 — o título saiu carona no que ele vetou (faixa creme + escurecimento pesado),
  // não por decisão de tirar texto. Duas de cada três peças do feed não diziam nada, e
  // quem passa o dedo não tinha por que parar. A frase entra na METADE DE BAIXO, onde o
  // véu da base já escurece: preserva o que ele aprovou (arte full-bleed, sujeito nunca
  // cortado, sem faixa, miolo limpo) e devolve a ideia a quem só vê a miniatura.
  const coverTitle = (title || "").trim();

  return (
    <div style={{ width: W, height: H, position: "relative", display: "flex", background: INK, color: OFFWHITE }}>
      {/* Arte full-bleed ESCURA (cover; 4:5→4:5 = sem corte). Fallback: motivo abstrato dark. */}
      {img ? (
        <div style={{ position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex" }}>
          <img src={img} width={W} height={H} style={{ width: W, height: H, objectFit: "cover" }} />
        </div>
      ) : (
        <div style={{ position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex" }}>
          <div style={{
            position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex",
            background: `radial-gradient(circle at 78% 16%, ${rgba(c.accent, 0.34)}, transparent 58%), radial-gradient(circle at 18% 92%, rgba(0,0,0,0.55), transparent 55%)`,
          }} />
          <MotifLayer motif={motif} accent={c.accent} dark={true} seed={seed} />
        </div>
      )}
      {/* Véus SUAVES só nas bordas (topo/base) p/ o texto — o miolo fica limpo (nada de scrim pesado). */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex",
        // A base desce mais fundo (54% em vez de 74%) e fecha mais escura porque a FRASE
        // agora mora aqui. O miolo — onde vive o sujeito da ilustração — continua limpo.
        background: `linear-gradient(180deg, rgba(11,11,12,0.50) 0%, rgba(11,11,12,0) 24%, rgba(11,11,12,0) 54%, rgba(11,11,12,0.80) 100%)`,
      }} />
      {/* Texto discreto: marca+Nº no topo (régua no acento), @handle na base. */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: M }}>
        <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <span style={{ fontFamily: SERIF, fontSize: 30, letterSpacing: "0.28em", color: rgba("#F4F0E8", 0.94), display: "flex" }}>
            {brandLine}
          </span>
          <div style={{ marginTop: 18, height: 2, width: 120, background: c.accent, display: "flex" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
          {coverTitle ? (
            // QUEBRA POR SENTIDO (2026-08-09): o corte automático caía no meio do verbo —
            // «eu tenho / direito a dizer». A virada da frase (o que vem depois do ponto-e-
            // vírgula, do travessão ou da vírgula que separa a antítese) é o GOLPE da voz e
            // ganha linha própria. 5 linhas em vez de 4: a escala subiu, então cabe mais.
            <div style={{
              fontFamily: SERIF, fontSize: fitTitleSize(coverTitle, W - 2 * M, 5), lineHeight: 1.02,
              letterSpacing: "-0.03em", color: OFFWHITE, maxWidth: W - 2 * M, display: "flex",
              flexDirection: "column", marginBottom: 34, textShadow: "0 2px 28px rgba(11,11,12,0.95)",
            }}>
              {quebrarPorSentido(coverTitle).map((linha, i) => (
                <span key={i} style={{ display: "flex" }}>{linha}</span>
              ))}
            </div>
          ) : null}
          <span style={{ fontFamily: SERIF, fontSize: 34, letterSpacing: "0.06em", color: rgba("#F4F0E8", 0.9), display: "flex" }}>
            {handle}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── SLIDE 2-N: Insight ───────────────────────────────────────────────────────
function InsightSlide({ text, num, total, kw, issue, cat, motif, seed, lang }: {
  text: string; num: number; total: number; kw: string; issue: string; cat: Cat; motif: MotifId; seed: number; lang: OgLang;
}) {
  const c = CATS[cat];
  // Dividir: última frase vira subtítulo
  const sentences = text.split(/[.!?]\s+/).map(s => s.trim()).filter(Boolean);
  let mainText: string;
  let subText: string;

  if (sentences.length >= 2) {
    subText  = sentences.pop()!;
    mainText = sentences.join(" ");
  } else {
    const words = text.split(" ");
    const half  = Math.ceil(words.length * 0.62);
    mainText = words.slice(0, half).join(" ");
    subText  = words.slice(half).join(" ");
  }

  return (
    // MESMA CARA DO POST INTEIRO (2026-08-09). Estas telas saíam em BEGE enquanto a capa e
    // o fecho saíam escuros — três aparências no mesmo carrossel, e quem desliza vê três
    // peças em vez de uma. Nenhuma das 10 contas de referência troca de fundo no meio.
    <Surface dark={true} accent={c.accent} motif={motif} seed={seed}>
      <Folio issue={issue} accent={c.accent} dark={true} brand={BRAND[lang]} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <span style={{ fontFamily: SERIF, fontSize: 132, lineHeight: 0.8, letterSpacing: "-0.04em", color: rgba(c.accent, 0.92), marginBottom: 18, display: "flex" }}>
          {String(num).padStart(2, "0")}
        </span>
        <div style={{ fontFamily: SERIF, fontSize: fitTitleSize(mainText, W - 2 * M), lineHeight: 0.96, letterSpacing: "-0.03em", color: OFFWHITE, maxWidth: W - 2 * M, display: "flex" }}>
          {mainText.toUpperCase()}
        </div>
        {subText ? (
          // Subtítulo do insight: maior + na COR DA MARCA (acento da categoria) em vez do
          // cinza estático — dá destaque sem competir com o título (pedido do dono 2026-06-26,
          // "muito estático, sem chamativos"). fontFamily SERIF p/ casar com o resto (satori
          // não herda fonte de forma confiável). Fica abaixo do mainText, leitura preservada.
          // Encolhe SÓ quando longo (≳66 chars) p/ não estourar a largura/altura — o cap do
          // insight subiu p/ 200, então uma 2ª oração longa pode chegar aqui; curto fica nos 50.
          <div style={{ fontFamily: SERIF, fontSize: Math.max(32, Math.min(50, Math.floor(3300 / Math.max(subText.length, 1)))), lineHeight: 1.4, letterSpacing: "-0.01em", color: c.accent, marginTop: 30, maxWidth: 820, display: "flex" }}>
            {subText}
          </div>
        ) : null}
      </div>
      {/* RODAPÉ SEM PALAVRA SOLTA (2026-08-09): `kw` vem de uma extração automática do
          título e devolvia coisas como «TEM» — um verbo isolado, sem sentido nenhum,
          impresso em toda tela interna. O rótulo do pilar sempre significa algo; a palavra
          extraída só entra quando tem corpo (≥4 letras) e não é palavra de ligação. */}
      <Footer left={rodapeUtil(kw, lang, cat)} accent={c.accent} dark={true} num={num} total={total} />
    </Surface>
  );
}

/** Palavra do rodapé: só usa a extraída quando ela carrega sentido; senão, o nome do pilar. */
function rodapeUtil(kw: string, lang: OgLang, cat: Cat): string {
  const p = (kw || "").trim();
  const vazias = /^(tem|ter|tém|que|com|por|para|pra|dos|das|los|las|una|uno|uma|seu|sua|ele|ela|voce|você|nao|não|sim|mas|mais|ser|foi|era|sao|são|est[aáeé]|hay|del|the|and)$/i;
  if (p.length >= 4 && !vazias.test(p)) return p;
  return CAT_LABEL[lang][cat];
}

// ─── SLIDE FINAL: CTA ─────────────────────────────────────────────────────────
function CTASlide({ text, issue, cat, motif, total, seed, lang }: {
  text: string; issue: string; cat: Cat; motif: MotifId; total: number; seed: number; lang: OgLang;
}) {
  const c = CATS[cat];
  return (
    <Surface dark={true} accent={c.accent} motif={motif} seed={seed}>
      <Folio issue={issue} accent={c.accent} dark={true} brand={BRAND[lang]} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <span style={{ fontFamily: SERIF, fontSize: 28, letterSpacing: "0.30em", color: c.accent, marginBottom: 32, display: "flex" }}>
          {UI_TEXT[lang].question}
        </span>
        <div style={{ fontFamily: SERIF, fontSize: fitTitleSize(text, W - 2 * M), lineHeight: 0.98, letterSpacing: "-0.03em", color: OFFWHITE, maxWidth: W - 2 * M, display: "flex" }}>
          {text.toUpperCase()}
        </div>
        <div style={{ display: "flex", marginTop: 46 }}>
          <div style={{ border: `2px solid ${c.accent}`, borderRadius: 9999, padding: "18px 42px", background: rgba(c.accent, 0.16), display: "flex" }}>
            <span style={{ fontFamily: SERIF, fontSize: 26, letterSpacing: "0.20em", textTransform: "uppercase", color: OFFWHITE }}>
              {UI_TEXT[lang].answer}
            </span>
          </div>
        </div>
      </div>
      <Footer left={BRAND[lang]} accent={c.accent} dark={true} num={total} total={total} />
    </Surface>
  );
}

// ─── SLIDE FINAL: GUIA / FUNIL (comment→DM) ───────────────────────────────────
// Convida a comentar a palavra-chave (kw) p/ receber a prévia do livro no Direct.
// Só é acrescentado ao carrossel quando o funil está LIGADO (ver /api/publish).
function GuideSlide({ kw, issue, cat, motif, total, seed, lang, cover }: {
  kw: string; issue: string; cat: Cat; motif: MotifId; total: number; seed: number; lang: OgLang; cover?: string;
}) {
  const c = CATS[cat];
  const G = GUIDE_TEXT[lang];

  // Fail-open: sem a arte do livro (capa não embutiu) → slide editorial dark de antes.
  if (!cover) {
    return (
      <Surface dark={true} accent={c.accent} motif={motif} seed={seed}>
        <Folio issue={issue} accent={c.accent} dark={true} brand={BRAND[lang]} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span style={{ fontFamily: SERIF, fontSize: 28, letterSpacing: "0.30em", color: c.accent, marginBottom: 28, display: "flex" }}>
            {G.eyebrow}
          </span>
          <div style={{ fontFamily: SERIF, fontSize: fitTitleSize(G.book, W - 2 * M), lineHeight: 0.9, letterSpacing: "-0.03em", color: OFFWHITE, maxWidth: W - 2 * M, display: "flex" }}>
            {G.book}
          </div>
          <div style={{ fontSize: 38, lineHeight: 1.4, color: "rgba(244,240,232,0.74)", marginTop: 26, maxWidth: 820, display: "flex" }}>
            {G.sub}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 52 }}>
            <span style={{ fontSize: 34, color: "rgba(244,240,232,0.92)", marginBottom: 22, display: "flex" }}>
              {G.action}
            </span>
            <div style={{ display: "flex" }}>
              <div style={{ border: `2px solid ${c.accent}`, borderRadius: 9999, padding: "20px 52px", background: rgba(c.accent, 0.18), display: "flex" }}>
                <span style={{ fontFamily: SERIF, fontSize: 60, letterSpacing: "0.12em", textTransform: "uppercase", color: OFFWHITE, display: "flex" }}>
                  {kw}
                </span>
              </div>
            </div>
            <span style={{ fontSize: 28, color: "rgba(244,240,232,0.6)", marginTop: 24, display: "flex" }}>
              {G.note}
            </span>
          </div>
        </div>
        <Footer left={BRAND[lang]} accent={c.accent} dark={true} num={total} total={total} />
      </Surface>
    );
  }

  // COM a ARTE FINAL DO LIVRO: a capa (cérebro + gradiente + título) sangra no
  // topo e derrete no preto; o funil comment→DM vem embaixo, com glow magenta —
  // pra dar choque e ser inconfundivelmente o livro. Acento = magenta vivo da capa.
  const COVER_W = W;                            // 1080
  const COVER_H = Math.round(W * 1536 / 1024);  // capa é 2:3 → 1620
  const CREAM = "#F4EFE0";                      // o MESMO creme da capa (= fundo do slide, sem preto)
  const MAGENTA = "#D4357E";                    // magenta da capa (ponto ativo do rodapé)
  // pílula do funil = o GRADIENTE da capa (laranja→magenta→roxo) — escolha do dono, = Reel
  const PILL = "linear-gradient(120deg, #E8552F 0%, #D4357E 52%, #9B3FB5 100%)";
  const HERO = 968;                             // arte do livro (creme+gradiente+cérebro) no topo;
                                                // o resto é o MESMO creme → sem nenhuma faixa escura
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: CREAM }}>
      <div style={{ width: W, height: HERO, position: "relative", display: "flex", flexShrink: 0 }}>
        <img src={cover} width={COVER_W} height={HERO} style={{ width: COVER_W, height: HERO, objectFit: "cover", objectPosition: "50% 0%" }} />
        {/* só um respiro de 4% pro creme do slide encostar no creme da capa, sem emenda */}
        <div style={{ position: "absolute", top: 0, left: 0, width: W, height: HERO, display: "flex",
          background: `linear-gradient(180deg, rgba(244,239,224,0) 94%, ${CREAM} 100%)` }} />
      </div>
      {/* funil no MESMO creme do livro — pílula magenta saltando, zero preto */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: CREAM }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
          <span style={{ fontSize: 36, color: "#3A2230", marginBottom: 26, display: "flex" }}>
            {G.action}
          </span>
          <div style={{ display: "flex" }}>
            <div style={{ borderRadius: 9999, padding: "24px 66px", background: PILL, display: "flex", boxShadow: "0 14px 34px rgba(0,0,0,0.18)" }}>
              <span style={{ fontFamily: SERIF, fontSize: 76, letterSpacing: "0.14em", textTransform: "uppercase", color: CREAM, display: "flex" }}>
                {kw}
              </span>
            </div>
          </div>
          <span style={{ fontSize: 32, color: "rgba(42,20,30,0.72)", marginTop: 28, display: "flex" }}>
            {G.note}
          </span>
        </div>
        <div style={{ padding: `0 ${M}px 56px ${M}px`, display: "flex", flexShrink: 0 }}>
          <Footer left={BRAND[lang]} accent={MAGENTA} dark={false} num={total} total={total} />
        </div>
      </div>
    </div>
  );
}

// ─── Fetch da ilustração com timeout + fallback ──────────────────────────────
// O satori (next/og) busca <img src> server-side SEM timeout: uma fal lenta
// bloqueava o og por ~9s → o Instagram estourava o próprio timeout de download
// da mídia (9004 "media could not be fetched"). Aqui buscamos a imagem nós
// mesmos com AbortController curto e embutimos como data-URI. Em qualquer falha
// (timeout, não-200, não-imagem) devolvemos undefined → o CoverSlide cai no
// motivo abstrato (MotifLayer), em vez de renderizar uma capa em branco.
function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000; // evita estourar o stack do String.fromCharCode
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function fetchImageDataUri(url: string, timeoutMs: number): Promise<string | undefined> {
  if (!isAllowedFetchUrl(url)) return undefined; // anti-SSRF (src/lib/safe-fetch): só host conhecido, HTTPS
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return undefined;
    const ct = res.headers.get("content-type") || "image/jpeg";
    if (!ct.startsWith("image/")) return undefined;
    const buf = await res.arrayBuffer(); // o abort cobre também a leitura do corpo
    return `data:${ct};base64,${arrayBufferToBase64(buf)}`;
  } catch {
    return undefined; // timeout/DNS/rede → motivo abstrato
  } finally {
    clearTimeout(timer);
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Rate limit por IP (fail-open; ativa só com UPSTASH_* setadas) — rota pública.
  if (await isRateLimited(req, "og", 120)) {
    return new Response("rate limited", { status: 429 });
  }
  try {
    const { searchParams } = req.nextUrl;
    const slide = searchParams.get("slide") ?? "cover";
    const title = searchParams.get("title") ?? "La mente necesita silencio";
    const text  = searchParams.get("text")  ?? "";
    const kw    = searchParams.get("kw")    ?? "";
    const tag   = searchParams.get("tag")   ?? "";
    const issue = `ED. ${searchParams.get("ed") ?? "01"}`;
    const mood  = (searchParams.get("mood") ?? "red") as "red" | "ink";
    const num   = parseInt(searchParams.get("num")   ?? "2");
    const total = parseInt(searchParams.get("total") ?? "5");
    const lang: OgLang = ["br", "pt"].includes(searchParams.get("lang") ?? "") ? "br" : "es" /* "pt" = URL antiga */;

    // Categoria (direção de arte): vem de ?cat= ou é derivada do tema
    const catParam = searchParams.get("cat");
    const cat: Cat = catParam && (catParam in CATS) ? (catParam as Cat) : detectCat(`${title} ${text} ${kw} ${tag}`);

    // Motivo (desenho) por TEMA: vem de ?motif= ou cai no padrão da categoria
    const motifParam = searchParams.get("motif");
    const motif: MotifId = motifParam && (MOTIF_IDS as readonly string[]).includes(motifParam)
      ? (motifParam as MotifId)
      : CAT_DEFAULT_MOTIF[cat];

    // Seed estável por POST (mesmo em todas as slides do carrossel) → desenho único
    const seedParam = searchParams.get("seed");
    const seed = seedParam ? hashStr(seedParam) : hashStr(`${issue}|${kw}|${cat}|${motif}`);

    // Ilustração por IA (capa): URL pública vinda do /api/publish. Ausente → motivo.
    const imgUrl = searchParams.get("img") || undefined;
    // Só a capa (slide != insight/cta/guide) usa a ilustração.
    const isCover = slide !== "insight" && slide !== "cta" && slide !== "guide";
    // Timeout do fetch da ilustração. Default 3000 (bem abaixo do teto de download do
    // IG p/ o caminho AO VIVO — evita 9004). O pré-hospedador server-side (src/lib/
    // cover-prehost) passa ?imgto= MAIOR: ele NÃO é o IG, baixa a capa com folga e
    // depois hospeda o PNG estático, então pode esperar o Blob esquentar. Clamp seguro.
    const imgTimeout = (() => {
      const raw = parseInt(searchParams.get("imgto") ?? "");
      return Number.isFinite(raw) ? Math.max(1000, Math.min(15000, raw)) : 3000;
    })();
    // Buscamos a imagem e embutimos. Falha/timeout → undefined → motivo abstrato.
    const img = imgUrl && isCover
      ? await fetchImageDataUri(imgUrl, imgTimeout)
      : undefined;
    // x-cover-source: permite ao pré-hospedador VERIFICAR se a capa embutiu a
    // ilustração aprovada ("illustration") ou caiu no motivo abstrato ("abstract").
    // Só faz sentido na capa (as outras slides não têm imagem externa).
    const coverSource = isCover ? (img ? "illustration" : "abstract") : undefined;

    // Slide do funil usa a ARTE FINAL DO LIVRO: busca a capa hospedada (mesma
    // origem) e embute. Fail-open: falha/timeout → GuideSlide cai no editorial dark.
    const guideCover = slide === "guide"
      ? await fetchImageDataUri(`${req.nextUrl.origin}/images/i-love-dopamina-capa-${lang === "br" ? "br" : "es"}.png`, 3500)
      : undefined;

    const fontBold = loadFraunces();

    let node;
    if (slide === "guide") {
      node = <GuideSlide kw={kw} issue={issue} cat={cat} motif={motif} total={total} seed={seed} lang={lang} cover={guideCover} />;
    } else if (slide === "cta") {
      node = <CTASlide text={text || title} issue={issue} cat={cat} motif={motif} total={total} seed={seed} lang={lang} />;
    } else if (slide === "insight") {
      node = <InsightSlide text={text} num={num} total={total} kw={kw} issue={issue} cat={cat} motif={motif} seed={seed} lang={lang} />;
    } else {
      node = <CoverSlide title={title} kw={kw} issue={issue} mood={mood} cat={cat} motif={motif} total={total} seed={seed} img={img} lang={lang} />;
    }

    const fonts = [{ name: "Fraunces", data: fontBold, weight: 700 as const, style: "normal" as const }];

    // og é determinístico por URL → o Instagram pode reusar o fetch (e reduz cold starts).
    const headers: Record<string, string> = {
      "cache-control": "public, max-age=86400, s-maxage=86400, immutable",
    };
    // Fonte da capa (illustration|abstract) p/ o pré-hospedador conferir sem re-render.
    if (coverSource) headers["x-cover-source"] = coverSource;

    return new ImageResponse(node, {
      width: W,
      height: H,
      fonts,
      headers,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`OG Error: ${msg}`, { status: 500 });
  }
}
