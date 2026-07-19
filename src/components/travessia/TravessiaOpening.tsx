"use client";

/**
 * A TRAVESSIA DA GAIOLA — abertura cinematográfica da home (6 cenas).
 *
 * VISUAL: section alta com palco sticky; um rAF próprio lê o scroll nativo
 * (animado pelo Lenis) e desenha no <canvas> os QUADROS dos vídeos das cenas
 * (ida e volta), com crossfade nas emendas. Fail-open: sem manifest.json, a
 * cena usa o poster parado. A cena diurna (antiga 7) SAIU da sequência
 * principal por ordem do dono (19/07) — os arquivos ficam guardados no repo.
 *
 * TIPOGRAFIA CINEMATOGRÁFICA (spec do dono, 19/07 — 22 pontos): as frases são
 * HTML real, posicionadas no ESPAÇO NEGATIVO de cada cena, protegidas por um
 * gradiente amplo e imperceptível (nunca caixa/painel/card), e cada cena tem
 * coreografia própria, atada ao scroll (reversível):
 *  · hero: revelação editorial por linhas; parada = ponto de estabilidade
 *    (respiração quase imperceptível); a SAÍDA acompanha o giro do telefone
 *    (deslocamento lateral + leve rotação de eixo + compressão) e termina
 *    ANTES da câmera atravessar a tela;
 *  · mundo digital: entra da PROFUNDIDADE (z/escala/desfoque) e sai alongando
 *    na direção da câmera ao mergulhar para a sinapse;
 *  · sinapse: 1ª frase emerge das áreas escuras e se dissolve na saturação;
 *    a 2ª ("Todo dia. A vida inteira.") entra firme e fica QUASE IMÓVEL —
 *    quanto mais agitada a imagem, mais estável a frase;
 *  · silêncio: o movimento mais lento da sequência; os 3 passos do ritual
 *    entram UM DE CADA VEZ, no MESMO lugar, substituindo-se limpos;
 *  · retorno: surge difusa e RECUPERA nitidez conforme o quarto volta;
 *  · mão/final: a frase se apaga devagar quando a mão age; a frase final
 *    entra só no gesto de pousar o telefone e permanece imóvel e nítida.
 * Máscara de linha = mecanismo técnico invisível (sem fundo/borda; folga
 * vertical para nunca cortar descendentes). prefers-reduced-motion: fades
 * suaves, sem rotação/perspectiva, conteúdo íntegro.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useLang } from "@/lib/i18n/LanguageProvider";

const SCENES = [1, 2, 3, 4, 5, 6, 7] as const;
const N = SCENES.length;
/** sobreposição do crossfade entre cenas, em fração do trecho de UMA cena */
const FADE = 0.18;
/** fração de UMA cena no progresso global (0..1) */
const SEG = 1 / N;

/* ── HERO POR CÓDIGO: o quarto SEM o telefone é o palco; o aparelho é um slab
   3D com as duas faces REAIS (frente = mestra do dono; verso = G0 sem marca),
   girando devagar por tempo enquanto a página está parada e CONDUZIDO pela
   rolagem até a frente plena na emenda com a cena 2. Motivo: o gerador de
   vídeo carimbou logo de marca no verso em 2 tentativas pagas — rotação
   precisa é CÓDIGO (loop matemático, zero risco de marca). ─────────────── */
const PALCO_HERO = "/generated/transitions/quarto-sem-telefone-G0b.png";
const FACE_FRENTE = "/generated/transitions/face-frente.png";
const FACE_VERSO = "/generated/transitions/face-verso.png";
/** âncora do centro da gaiola DENTRO do palco (fração da largura da imagem) */
const GAIOLA_X = 0.345;
/** onde a gaiola deve cair NA TELA (fração da largura do viewport) */
const GAIOLA_TELA_X = 0.42;
/** proporção do aparelho (largura/altura dos recortes frontais gêmeos) */
const FONE_PROP = 635 / 1313;
/** altura do aparelho como fração da altura desenhada do palco */
const FONE_ALT = 0.6;
/** um giro completo em segundos (parada = vivo, lento, elegante) */
const GIRO_S = 16;

function suavizar(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/* ── SINAPSE VIVA (cena 3, por código): trajetórias traçadas à mão sobre os
   filamentos REAIS do quadro pleno da sinapse do dono (frame-097). Os sinais
   percorrem o braço do neurônio esquerdo, ATRAVESSAM a fenda pelos fios,
   são recebidos no corpo direito e ACENDEM a conexão de chegada. Posição
   atada à ROLAGEM (reversível); um sopro de tempo mantém a cena viva parada;
   quantidade/brilho crescem com o avanço = saturação. Coordenadas em fração
   do quadro (16:9), válidas para desktop e celular. ─────────────────────── */
const ROTAS_SINAPSE: [number, number][][] = [
  // superior: braço alto esquerdo → arco de cima → entrada alta direita
  [[0.26, 0.36], [0.33, 0.32], [0.40, 0.29], [0.47, 0.26], [0.55, 0.30], [0.63, 0.36], [0.72, 0.41]],
  // média-alta: reta viva do meio
  [[0.29, 0.45], [0.37, 0.43], [0.45, 0.44], [0.53, 0.46], [0.62, 0.47], [0.71, 0.49]],
  // média-baixa
  [[0.28, 0.55], [0.36, 0.55], [0.44, 0.57], [0.52, 0.58], [0.61, 0.56], [0.70, 0.55]],
  // inferior: mergulha e sobe na chegada
  [[0.25, 0.63], [0.34, 0.64], [0.43, 0.67], [0.52, 0.68], [0.60, 0.64], [0.69, 0.60]],
  // diagonal ascendente
  [[0.30, 0.50], [0.40, 0.42], [0.50, 0.34], [0.58, 0.31], [0.66, 0.33], [0.73, 0.38]],
  // CONTRAMÃO (retorno raro — direção oposta, biologicamente plausível como feedback)
  [[0.73, 0.45], [0.64, 0.41], [0.55, 0.38], [0.46, 0.37], [0.37, 0.40], [0.29, 0.44]],
];

/** ponto ao longo de uma rota poligonal (t 0..1), com suavização por segmento */
function pontoNaRota(rota: [number, number][], t: number): [number, number] {
  const n = rota.length - 1;
  const x = Math.min(0.99999, Math.max(0, t)) * n;
  const i = Math.floor(x);
  const f = x - i;
  const ff = f * f * (3 - 2 * f);
  return [
    rota[i][0] + (rota[i + 1][0] - rota[i][0]) * ff,
    rota[i][1] + (rota[i + 1][1] - rota[i][1]) * ff,
  ];
}

type Manifest = {
  frameCount: number;
  pattern: string;
  first: number;
  width: number;
  height: number;
  ext: string;
  fps: number;
  sourceDuration: number;
  poster: string;
};

type SceneMedia = {
  manifest: Manifest | null;
  frames: (HTMLImageElement | null)[];
  poster: HTMLImageElement | null;
  loading: boolean;
  failed: boolean;
};

function framePath(base: string, m: Manifest, i: number) {
  const n = String(m.first + i).padStart(3, "0");
  return `${base}/${m.pattern.replace("%03d", n)}`;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number
) {
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}

/* ── micro-vida do hero (só cena 1): sinais abstratos que nascem na borda da
   gaiola, derivam devagar rumo ao aparelho e se apagam; pulsos ocasionais nos
   anéis. Sutis, adultos, sem interface literal. Rodam POR TEMPO (a cena parada
   continua viva) e se dissipam quando a narrativa avança. ─────────────────── */
type Sinal = {
  x: number; y: number; vx: number; vy: number;
  vida: number; dur: number; tipo: 0 | 1 | 2; // 0=bolha · 1=alerta · 2=coração
  r: number;
};

function desenharCoracao(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.3, y - r * 0.1, x - r * 0.55, y - r, x, y - r * 0.35);
  ctx.bezierCurveTo(x + r * 0.55, y - r, x + r * 1.3, y - r * 0.1, x, y + r * 0.9);
  ctx.fill();
}

function desenharSino(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI, 0);
  ctx.lineTo(x + r, y + r * 0.7);
  ctx.lineTo(x - r, y + r * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y + r * 0.95, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

/** Uma frase da narrativa: texto + posição própria (espaço negativo da cena). */
type Beat = {
  id: string;
  text: string;
  kind: "title" | "words";
  /** classes de POSIÇÃO — cada cena ancora sua frase no espaço negativo dela */
  pos: string;
  accent?: boolean;
  /** tamanho reduzido (frases de apoio) */
  small?: boolean;
  /** cena CLARA (final do livro): texto tinta + proteção de leitura clara */
  claro?: boolean;
};

export default function TravessiaOpening() {
  const { t, lang } = useLang();
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const beatsWrapRef = useRef<HTMLDivElement | null>(null);
  const slabRef = useRef<HTMLDivElement | null>(null);
  const stepsRef = useRef<HTMLDivElement | null>(null);
  const ctasRef = useRef<HTMLDivElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<SceneMedia[]>([]);
  const rafRef = useRef<number>(0);
  const [reduced, setReduced] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(0);

  const tv = t.travessia;

  // preferências / viewport
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setReduced(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => {
      mq.removeEventListener("change", onMq);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const variant = isMobile ? "mobile" : "desktop";

  /**
   * As frases da jornada (6 cenas). Posições escolhidas contra os quadros
   * reais: hero = alto-esquerda (o homem ocupa o baixo-esquerda, o telefone o
   * centro); mundo digital = baixo-esquerda (o palco é centrado); sinapse =
   * baixo-esquerda (área escura da imagem); silêncio = centro-esquerda; volta
   * e final = esquerda, acima da mesa. No mobile todas descem para o terço
   * inferior (o corte vertical centraliza o telefone).
   */
  const beats = useMemo<Beat[]>(
    () => [
      { id: "m1", text: tv.c1a, kind: "title", pos: "inset-x-6 bottom-[16vh] md:inset-x-14 md:top-[24vh] md:bottom-auto" },
      { id: "m2", text: tv.c2b, kind: "title", pos: "inset-x-6 bottom-[16vh] md:inset-x-14 md:bottom-[20vh]" },
      { id: "m3a", text: tv.c3b, kind: "title", pos: "inset-x-6 bottom-[16vh] md:inset-x-14 md:bottom-[18vh]" },
      { id: "m3b", text: tv.c3c, kind: "title", pos: "inset-x-6 bottom-[16vh] md:inset-x-14 md:bottom-[18vh]" },
      { id: "m4", text: tv.b90, kind: "words", pos: "inset-x-6 bottom-[22vh] md:inset-x-14 md:top-[34vh] md:bottom-auto", small: true },
      { id: "m5", text: tv.c5a, kind: "title", pos: "inset-x-6 bottom-[16vh] md:inset-x-14 md:bottom-[22vh]" },
      { id: "m6", text: tv.bfim, kind: "title", pos: "inset-x-6 bottom-[18vh] md:inset-x-14 md:top-[26vh] md:bottom-auto", accent: true },
      // 7 · o prêmio: o homem lendo — frase final estável sobre a cena clara
      { id: "m7", text: tv.c7, kind: "title", pos: "inset-x-6 bottom-[16vh] md:left-[48%] md:right-14 md:top-[28vh] md:bottom-auto", claro: true },
    ],
    [tv]
  );

  /** passos do ritual — um por vez, no MESMO lugar, dentro do silêncio */
  const steps = t.hero.deckSteps;

  const loadScene = useCallback(
    (idx: number) => {
      const media = mediaRef.current[idx];
      if (!media || media.loading || media.manifest || media.failed) return;
      media.loading = true;
      const base = `/generated/sequences/scene-0${SCENES[idx]}/${variant}`;
      fetch(`${base}/manifest.json`)
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.json() as Promise<Manifest>;
        })
        .then((m) => {
          media.manifest = m;
          media.frames = new Array(m.frameCount).fill(null);
          // fila de carregamento (6 por vez) — evita rajada de ~100 requisições
          let next = 0;
          let inFlight = 0;
          const pump = () => {
            while (inFlight < 6 && next < m.frameCount) {
              const i = next++;
              inFlight++;
              const img = new Image();
              img.decoding = "async";
              img.onload = img.onerror = () => {
                media.frames[i] = img;
                inFlight--;
                pump();
              };
              img.src = framePath(base, m, i);
            }
          };
          pump();
        })
        .catch(() => {
          media.failed = true;
        })
        .finally(() => {
          media.loading = false;
        });
    },
    [variant]
  );

  // mídia: posters sempre; quadros sob demanda.
  // Cena 1 é o HERO POR CÓDIGO: palco fixo (quarto sem telefone) + slab 3D —
  // não busca quadros de vídeo (failed=true faz o pick cair no pôster).
  useEffect(() => {
    if (reduced) return;
    mediaRef.current = SCENES.map((s, i) => {
      const poster = new Image();
      poster.decoding = "async";
      poster.src = i === 0 ? PALCO_HERO : `/generated/storyboard/scene-0${s}.png`;
      return { manifest: null, frames: [], poster, loading: false, failed: i === 0 };
    });
    loadScene(1);
    const first = mediaRef.current[0].poster;
    if (first) {
      if (first.complete) setReady(true);
      else first.onload = () => setReady(true);
    }
    return () => {
      mediaRef.current = [];
    };
  }, [reduced, loadScene]);

  // laço do CANVAS: progresso -> desenho dos quadros + cena ativa (pontos)
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastActive = -1;
    const nascidoEm = performance.now();

    // micro-vida do hero
    const sinais: Sinal[] = [];
    let tAnterior = performance.now();
    let proxPulso = 1.6; // segundos até o próximo pulso da gaiola
    const pulsos: { r: number; alfa: number }[] = [];

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.round(canvas.clientWidth * dpr);
      const ch = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }

      const idx = Math.min(N - 1, Math.floor(p / SEG));
      const local = (p - idx * SEG) / SEG;

      loadScene(idx);
      if (idx + 1 < N) loadScene(idx + 1);

      const pick = (i: number, lp: number): HTMLImageElement | null => {
        const m = mediaRef.current[i];
        if (!m) return null;
        if (m.manifest && m.frames.length) {
          const fi = Math.min(
            m.manifest.frameCount - 1,
            Math.max(0, Math.round(lp * (m.manifest.frameCount - 1)))
          );
          for (let k = fi; k >= 0; k--) {
            const f = m.frames[k];
            if (f && f.complete && f.naturalWidth > 0) return f;
          }
        }
        const po = m.poster;
        return po && po.complete && po.naturalWidth > 0 ? po : null;
      };

      ctx.fillStyle = "#0B0B0C";
      ctx.fillRect(0, 0, cw, ch);

      /* palco do hero: desenho ANCORADO (a gaiola cai em GAIOLA_TELA_X mesmo
         no corte vertical do celular) + geometria compartilhada com o slab */
      const drawPalco = (image: HTMLImageElement, alfa: number) => {
        const iw = image.naturalWidth || 1;
        const ih = image.naturalHeight || 1;
        const esc = Math.max(cw / iw, ch / ih);
        const dw = iw * esc;
        const dh = ih * esc;
        let ox = cw * GAIOLA_TELA_X - GAIOLA_X * dw;
        ox = Math.min(0, Math.max(cw - dw, ox));
        const oy = (ch - dh) / 2;
        ctx.globalAlpha = alfa;
        ctx.drawImage(image, ox, oy, dw, dh);
        ctx.globalAlpha = 1;
        return { ox, oy, dw, dh };
      };

      /* cena 3: o vídeo é só a ENTRADA (primeiros 28% do trecho); dali em
         diante o quadro pleno da sinapse segura o palco e os SINAIS por
         código assumem o movimento (reversível com a rolagem). */
      const localQuadro = idx === 2 ? Math.min(1, local / 0.28) : local;
      const img = pick(idx, localQuadro);
      let geoPalco: { ox: number; oy: number; dw: number; dh: number } | null = null;
      if (img) {
        if (idx === 0) geoPalco = drawPalco(img, 1);
        else drawCover(ctx, img, cw, ch);
      }
      if (idx > 0 && local < FADE) {
        const prev = pick(idx - 1, 1);
        if (prev) {
          const alfa = 1 - local / FADE;
          if (idx === 1) geoPalco = drawPalco(prev, alfa);
          else {
            ctx.globalAlpha = alfa;
            drawCover(ctx, prev, cw, ch);
            ctx.globalAlpha = 1;
          }
        }
      }

      /* slab 3D do hero: posição/escala saem da MESMA geometria do palco;
         giro por tempo na espera, conduzido à frente plena pela rolagem, e
         dissolve no crossfade para a cena 2 (o vídeo assume o aparelho). */
      const slab = slabRef.current;
      if (slab) {
        const local0 = Math.min(1, p / SEG);
        const emC2 = p > SEG ? Math.min(1, (p - SEG) / (SEG * FADE)) : 0;
        if (geoPalco && emC2 < 1) {
          const dpr2 = dpr;
          let alturaFone = (geoPalco.dh * FONE_ALT) / dpr2;
          let cx = (geoPalco.ox + (GAIOLA_X + 0.004) * geoPalco.dw) / dpr2;
          let cy = (geoPalco.oy + 0.485 * geoPalco.dh) / dpr2;
          /* emenda 1→2: durante o dissolve, o slab é CONDUZIDO até a posição/
             escala exatas do aparelho no 1º quadro do vídeo da cena 2 (medido:
             centro 0.493×0.478, altura 0.545 da fonte) — um aparelho só, sem
             imagem dupla na travessia. */
          if (emC2 > 0) {
            const img2 = pick(1, 0);
            if (img2) {
              const iw2 = img2.naturalWidth || 1;
              const ih2 = img2.naturalHeight || 1;
              const esc2 = Math.max(cw / iw2, ch / ih2);
              const dw2 = iw2 * esc2;
              const dh2 = ih2 * esc2;
              const ox2 = (cw - dw2) / 2;
              const oy2 = (ch - dh2) / 2;
              /* chega ao alvo na METADE do dissolve: a maior parte do fade
                 acontece com os dois aparelhos já perfeitamente alinhados. */
              const m = suavizar(0, 0.5, emC2);
              cx = cx * (1 - m) + ((ox2 + 0.493 * dw2) / dpr2) * m;
              cy = cy * (1 - m) + ((oy2 + 0.478 * dh2) / dpr2) * m;
              alturaFone = alturaFone * (1 - m) + ((dh2 * 0.545) / dpr2) * m;
            }
          }
          const larguraFone = alturaFone * FONE_PROP;
          const tempoS = (performance.now() - nascidoEm) / 1000;
          const giroLivre = (tempoS / GIRO_S) * 360;
          const conducao = suavizar(0.2, 0.6, local0);
          const alvo = Math.round(giroLivre / 360) * 360; // frente mais próxima
          const teta = giroLivre + (alvo - giroLivre) * conducao;
          slab.style.display = "block";
          slab.style.left = `${cx - larguraFone / 2}px`;
          slab.style.top = `${cy - alturaFone / 2}px`;
          slab.style.width = `${larguraFone}px`;
          slab.style.height = `${alturaFone}px`;
          slab.style.opacity = String(1 - emC2);
          const miolo = slab.firstElementChild as HTMLElement | null;
          if (miolo) miolo.style.transform = `rotateY(${teta}deg)`;
        } else {
          slab.style.display = "none";
        }
      }

      /* SINAPSE VIVA (cena 3): sinais percorrem os filamentos reais, cruzam a
         fenda com brilho maior e ACENDEM a conexão na chegada; contramão rara;
         quantidade e intensidade crescem com o avanço (saturação). */
      if (idx === 2 && img) {
        const vida = suavizar(0.3, 0.5, local);
        const saturacao = suavizar(0.35, 0.95, local);
        if (vida > 0.01) {
          const iw2 = img.naturalWidth || 1;
          const ih2 = img.naturalHeight || 1;
          const esc2 = Math.max(cw / iw2, ch / ih2);
          const dw2 = iw2 * esc2;
          const dh2 = ih2 * esc2;
          const ox2 = (cw - dw2) / 2;
          const oy2 = (ch - dh2) / 2;
          const tSin = performance.now() / 1000;
          const nSinais = 4 + Math.round(8 * saturacao);
          ctx.globalCompositeOperation = "lighter";
          for (let k = 0; k < nSinais; k++) {
            const rota = ROTAS_SINAPSE[k % ROTAS_SINAPSE.length];
            const veloc = 1 + (k % 3) * 0.5;
            const fase = (k * 0.173) % 1;
            // rolagem manda (reversível); sopro de tempo mantém vivo parado
            const t = (((local * 2.2 * veloc + fase + tSin * 0.015) % 1) + 1) % 1;
            const [px, py] = pontoNaRota(rota, t);
            const sx = ox2 + px * dw2;
            const sy = oy2 + py * dh2;
            const fenda = 1 - Math.abs(t - 0.5) * 2;
            const chegada = suavizar(0.86, 0.97, t);
            const alfa = vida * (0.32 + 0.38 * saturacao) * (0.7 + 0.5 * fenda);
            const r = (dh2 / 720) * (2.2 + 1.6 * fenda + 2.4 * chegada) * (0.8 + 0.4 * saturacao);
            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 3);
            grad.addColorStop(0, `rgba(255,214,160,${alfa})`);
            grad.addColorStop(0.4, `rgba(255,170,90,${alfa * 0.5})`);
            grad.addColorStop(1, "rgba(255,150,60,0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx, sy, r * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(255,240,220,${Math.min(1, alfa * 1.6)})`;
            ctx.beginPath();
            ctx.arc(sx, sy, r * 0.55, 0, Math.PI * 2);
            ctx.fill();
            // rastro curto atrás do sinal
            for (let e = 1; e <= 3; e++) {
              const te = t - e * 0.02 * veloc;
              if (te < 0) continue;
              const ea = alfa * (0.5 - e * 0.13);
              if (ea <= 0) continue;
              const [ex, ey] = pontoNaRota(rota, te);
              ctx.fillStyle = `rgba(255,190,120,${ea})`;
              ctx.beginPath();
              ctx.arc(ox2 + ex * dw2, oy2 + ey * dh2, r * 0.4, 0, Math.PI * 2);
              ctx.fill();
            }
            // a chegada ACENDE a conexão no corpo receptor
            if (chegada > 0.01) {
              const fim = rota[rota.length - 1];
              const fxs = ox2 + fim[0] * dw2;
              const fys = oy2 + fim[1] * dh2;
              const fr = Math.max(1, r * 5 * chegada);
              const g2 = ctx.createRadialGradient(fxs, fys, 0, fxs, fys, fr);
              g2.addColorStop(0, `rgba(255,220,170,${0.35 * chegada * vida})`);
              g2.addColorStop(1, "rgba(255,170,80,0)");
              ctx.fillStyle = g2;
              ctx.beginPath();
              ctx.arc(fxs, fys, fr, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.globalCompositeOperation = "source-over";
        }
      }

      /* COSTURA 4→5: a saída da sinapse não corta — os sinais remanescentes
         DESACELERAM, rareiam e escorrem como brilhos de ambiente até o vidro
         do aparelho que volta ao quadro na cena 5. Uma única fase contínua
         atravessa a fronteira (fim da cena 4 → crossfade da cena 5); tudo é
         função da rolagem, logo reversível. */
      if ((idx === 3 && local > 0.66) || (idx === 4 && local < FADE)) {
        const fase =
          idx === 3
            ? suavizar(0.66, 1, local) * 0.55
            : 0.55 + (local / FADE) * 0.45;
        const tS = performance.now() / 1000;
        // o aparelho da cena 5 vive à esquerda do centro (âncora do G2)
        const axc = cw * 0.4;
        const ayc = ch * 0.48;
        const alfaBase = Math.sin(fase * Math.PI) * 0.5;
        const nPontos = Math.max(2, Math.round(9 * (1 - fase * 0.75)));
        // avanço desacelerado: derivada (1 − fase) → quase parados no fim
        const tk = fase - fase * fase * 0.5;
        ctx.globalCompositeOperation = "lighter";
        for (let k = 0; k < nPontos; k++) {
          const rota = ROTAS_SINAPSE[k % ROTAS_SINAPSE.length];
          const veloc = 1 + (k % 3) * 0.4;
          const faseK = (k * 0.211) % 1;
          const t =
            ((tk * 1.3 * veloc + faseK + tS * 0.01 * (1 - fase)) % 1 + 1) % 1;
          const [px, py] = pontoNaRota(rota, t);
          // deriva: da rota da sinapse para um halo elíptico junto ao vidro
          const mix = suavizar(0.5, 1, fase);
          const angK = faseK * Math.PI * 2 + k;
          const rx = ch * 0.1 * (0.5 + 0.5 * ((k * 0.37) % 1));
          const gx = axc + Math.cos(angK) * rx;
          const gy = ayc + Math.sin(angK) * rx * 1.6;
          const sx = px * cw * (1 - mix) + gx * mix;
          const sy = py * ch * (1 - mix) + gy * mix;
          const alfa = alfaBase * (0.5 + 0.5 * ((k * 0.53) % 1));
          if (alfa <= 0.01) continue;
          const r = (ch / 720) * (2.6 - 1.6 * mix);
          const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 3);
          grad.addColorStop(0, `rgba(255,214,160,${alfa})`);
          grad.addColorStop(0.5, `rgba(255,175,95,${alfa * 0.4})`);
          grad.addColorStop(1, "rgba(255,150,60,0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(sx, sy, r * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255,240,220,${Math.min(1, alfa * 1.3)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, r * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      }

      /* micro-vida (só na cena 1): sinais rumo ao aparelho + pulsos na gaiola.
         Intensidade morre conforme a cena sai (local>0.6) — nada compete com a
         transição. Tempo próprio: a cena PARADA continua viva. */
      const agora = performance.now();
      const dt = Math.min(0.05, (agora - tAnterior) / 1000);
      tAnterior = agora;
      if (idx === 0) {
        const forca = local < 0.6 ? 1 : Math.max(0, 1 - (local - 0.6) / 0.3);
        // atrator = centro real do aparelho (mesma geometria do palco/slab)
        const ax = geoPalco ? geoPalco.ox + (GAIOLA_X + 0.004) * geoPalco.dw : cw * 0.42;
        const ay = geoPalco ? geoPalco.oy + 0.485 * geoPalco.dh : ch * 0.48;
        if (forca > 0.05) {
          // nascem na periferia da gaiola, poucos por vez
          if (sinais.length < 13 && Math.random() < 0.05) {
            const ang = Math.random() * Math.PI * 2;
            const dist = Math.min(cw, ch) * (0.34 + Math.random() * 0.2);
            const sorte = Math.random();
            sinais.push({
              x: ax + Math.cos(ang) * dist,
              y: ay + Math.sin(ang) * dist * 0.85,
              vx: 0, vy: 0, vida: 0,
              dur: 5 + Math.random() * 4,
              tipo: sorte < 0.55 ? 0 : sorte < 0.82 ? 1 : 2,
              r: (2.4 + Math.random() * 3.2) * (cw / 1600),
            });
          }
          if ((proxPulso -= dt) <= 0) {
            proxPulso = 3 + Math.random() * 2.6;
            pulsos.push({ r: Math.min(cw, ch) * 0.16, alfa: 0.34 });
          }
        }
        for (let i = sinais.length - 1; i >= 0; i--) {
          const s = sinais[i];
          s.vida += dt;
          if (s.vida > s.dur) { sinais.splice(i, 1); continue; }
          // deriva lenta rumo ao aparelho, com leve flutuação orgânica
          const dx = ax - s.x; const dy = ay - s.y;
          const d = Math.hypot(dx, dy) || 1;
          s.vx += (dx / d) * 6 * dt + Math.sin(agora / 900 + i) * 0.6 * dt;
          s.vy += (dy / d) * 5 * dt + Math.cos(agora / 1100 + i * 2) * 0.6 * dt;
          s.x += s.vx; s.y += s.vy;
          const fase = Math.min(s.vida / 1.2, 1) * Math.min((s.dur - s.vida) / 1.4, 1);
          const alfa = 0.42 * fase * forca;
          if (alfa <= 0.01) continue;
          ctx.globalAlpha = alfa;
          if (s.tipo === 2) {
            ctx.fillStyle = "#A45A5A";
            desenharCoracao(ctx, s.x, s.y, s.r * 1.15);
          } else if (s.tipo === 1) {
            ctx.fillStyle = "#C98A3D";
            desenharSino(ctx, s.x, s.y, s.r);
          } else {
            ctx.fillStyle = "#BE7A2A";
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * 0.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        for (let i = pulsos.length - 1; i >= 0; i--) {
          const p = pulsos[i];
          p.r += dt * Math.min(cw, ch) * 0.09;
          p.alfa -= dt * 0.14;
          if (p.alfa <= 0.01) { pulsos.splice(i, 1); continue; }
          ctx.globalAlpha = p.alfa * forca;
          ctx.strokeStyle = "#C98A3D";
          ctx.lineWidth = Math.max(1, cw / 1400);
          ctx.beginPath();
          ctx.ellipse(ax, ay + ch * 0.18, p.r, p.r * 0.34, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (sinais.length || pulsos.length) {
        sinais.length = 0;
        pulsos.length = 0;
      }

      if (idx !== lastActive) {
        lastActive = idx;
        setActive(idx);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [reduced, loadScene]);

  /**
   * TIPOGRAFIA CINEMATOGRÁFICA — uma timeline-mestra scrubada (reversível),
   * com coreografia própria por cena. gsap.context limpa tudo ao desmontar.
   */
  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current;
    const wrap = beatsWrapRef.current;
    if (!section || !wrap) return;

    gsap.registerPlugin(ScrollTrigger, SplitText);

    // no celular, perspectiva e deslocamentos laterais são reduzidos
    const M = isMobile ? 0.35 : 1;

    const ctx = gsap.context(() => {
      const fontsReady: Promise<unknown> =
        (document as any).fonts?.ready ?? Promise.resolve();

      fontsReady.then(() => {
        if (!beatsWrapRef.current) return;

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.9,
          },
        });

        const el = (id: string) =>
          wrap.querySelector<HTMLElement>(`[data-beat="${id}"]`);
        const splitOf = (id: string) => {
          const host = el(id);
          if (!host) return null;
          host.style.visibility = "visible";
          const beat = beats.find((b) => b.id === id)!;
          return new SplitText(host.querySelector(".beat-text")!, {
            type: beat.kind === "words" ? "lines,words" : "lines",
            mask: "lines",
            linesClass: "beat-line",
          });
        };
        const shadeOf = (id: string) =>
          el(id)?.querySelector<HTMLElement>(".beat-shade") ?? null;

        /* ── CENA 1 · HERO ──────────────────────────────────────────────
           entrada editorial no CARREGAMENTO (tempo); parada = estabilidade
           com respiração imperceptível; saída CARREGADA pelo giro do
           telefone, terminando antes da travessia da tela. */
        const s1 = splitOf("m1");
        if (s1?.lines?.length) {
          gsap.from(s1.lines, {
            yPercent: 100,
            opacity: 0,
            filter: "blur(10px)",
            scale: 0.98,
            duration: 1.1,
            delay: 0.3,
            stagger: 0.1,
            ease: "power3.out",
          });
          const heroP = el("m1")!.querySelector(".beat-text");
          // respiração quase imperceptível (só opacidade; nada flutua)
          gsap.to(heroP, {
            opacity: 0.96,
            duration: 3.4,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
            delay: 1.8,
          });
          const sh1 = shadeOf("m1");
          if (sh1) gsap.from(sh1, { opacity: 0, duration: 1.4, delay: 0.25 });

          // saída: atraída pelo movimento do giro (lateral + eixo + compressão)
          tl.to(
            el("m1"),
            {
              xPercent: 16 * M,
              yPercent: -8,
              rotationY: 7 * M,
              rotationZ: 1 * M,
              scale: 0.96,
              transformOrigin: "60% 50%",
              duration: 0.2 * SEG,
            },
            0.62 * SEG
          );
          tl.to(
            s1.lines,
            {
              opacity: 0,
              filter: "blur(13px)",
              yPercent: (i: number) => -4 * i, // linhas convergem levemente
              duration: 0.2 * SEG,
              stagger: (0.05 * SEG) / Math.max(1, s1.lines.length - 1),
            },
            0.64 * SEG
          );
          const sh = shadeOf("m1");
          if (sh) tl.to(sh, { opacity: 0, duration: 0.16 * SEG }, 0.66 * SEG);
          // some por completo antes da câmera atravessar a tela (fim da cena 1)
        }

        /* ── CENA 2 · MUNDO DIGITAL ─────────────────────────────────────
           entra da PROFUNDIDADE; sai alongando na direção da câmera. */
        const s2 = splitOf("m2");
        if (s2?.lines?.length) {
          tl.fromTo(
            el("m2"),
            { z: -120 * M, scale: 0.9, transformOrigin: "50% 50%" },
            { z: 0, scale: 1, duration: 0.3 * SEG },
            (1 + 0.16) * SEG
          );
          tl.fromTo(
            s2.lines,
            { opacity: 0, filter: "blur(14px)" },
            {
              opacity: 1,
              filter: "blur(0px)",
              duration: 0.26 * SEG,
              stagger: (0.06 * SEG) / Math.max(1, s2.lines.length - 1),
            },
            (1 + 0.18) * SEG
          );
          const sh = shadeOf("m2");
          if (sh) tl.fromTo(sh, { opacity: 0 }, { opacity: 1, duration: 0.2 * SEG }, (1 + 0.18) * SEG);
          // saída rumo à sinapse: alonga em direção à câmera e dissolve
          tl.to(
            el("m2"),
            { z: 70 * M, scale: 1.05, duration: 0.22 * SEG },
            (1 + 0.68) * SEG
          );
          tl.to(
            s2.lines,
            { opacity: 0, filter: "blur(12px)", duration: 0.2 * SEG },
            (1 + 0.7) * SEG
          );
          if (sh) tl.to(sh, { opacity: 0, duration: 0.18 * SEG }, (1 + 0.7) * SEG);
        }

        /* ── CENA 3 · SINAPSE ───────────────────────────────────────────
           1ª frase emerge das áreas escuras e se dissolve NA saturação;
           2ª entra firme e fica quase imóvel (estável contra a agitação). */
        const s3a = splitOf("m3a");
        if (s3a?.lines?.length) {
          tl.fromTo(
            s3a.lines,
            { opacity: 0, filter: "blur(9px)", yPercent: 24 },
            {
              opacity: 1,
              filter: "blur(0px)",
              yPercent: 0,
              duration: 0.24 * SEG,
              stagger: (0.05 * SEG) / Math.max(1, s3a.lines.length - 1),
            },
            (2 + 0.12) * SEG
          );
          const sh = shadeOf("m3a");
          if (sh) tl.fromTo(sh, { opacity: 0 }, { opacity: 1, duration: 0.18 * SEG }, (2 + 0.13) * SEG);
          // dissolve encoberta pela luz da saturação (sem deslocamento)
          tl.to(
            s3a.lines,
            { opacity: 0, filter: "blur(14px)", duration: 0.16 * SEG },
            (2 + 0.46) * SEG
          );
          if (sh) tl.to(sh, { opacity: 0, duration: 0.14 * SEG }, (2 + 0.48) * SEG);
        }
        const s3b = splitOf("m3b");
        if (s3b?.lines?.length) {
          // firme e direta; depois QUASE imóvel — contraste com a sinapse ativa
          tl.fromTo(
            s3b.lines,
            { opacity: 0, yPercent: 14 },
            {
              opacity: 1,
              yPercent: 0,
              duration: 0.13 * SEG,
              stagger: (0.03 * SEG) / Math.max(1, s3b.lines.length - 1),
            },
            (2 + 0.66) * SEG
          );
          const sh = shadeOf("m3b");
          if (sh) tl.fromTo(sh, { opacity: 0 }, { opacity: 1, duration: 0.12 * SEG }, (2 + 0.66) * SEG);
          // sai POR COMPLETO antes da fronteira com o silêncio
          tl.to(
            s3b.lines,
            { opacity: 0, filter: "blur(8px)", duration: 0.11 * SEG },
            (2 + 0.86) * SEG
          );
          if (sh) tl.to(sh, { opacity: 0, duration: 0.09 * SEG }, (2 + 0.87) * SEG);
        }

        /* ── CENA 4 · SILÊNCIO ──────────────────────────────────────────
           o movimento mais LENTO da sequência; depois os 3 passos entram
           um por vez, no MESMO lugar, substituindo-se limpos. */
        const s4 = splitOf("m4");
        if (s4) {
          const alvo4 = s4.words?.length ? s4.words : s4.lines;
          tl.fromTo(
            alvo4,
            { opacity: 0, filter: "blur(10px)", yPercent: 20 },
            {
              opacity: 1,
              filter: "blur(0px)",
              yPercent: 0,
              duration: 0.3 * SEG,
              stagger: (0.14 * SEG) / Math.max(1, alvo4.length - 1),
            },
            (3 + 0.08) * SEG
          );
          const sh = shadeOf("m4");
          if (sh) tl.fromTo(sh, { opacity: 0 }, { opacity: 1, duration: 0.2 * SEG }, (3 + 0.1) * SEG);
          tl.to(
            alvo4,
            { opacity: 0, filter: "blur(8px)", yPercent: -10, duration: 0.12 * SEG },
            (3 + 0.42) * SEG
          );
          if (sh) tl.to(sh, { opacity: 0, duration: 0.1 * SEG }, (3 + 0.44) * SEG);
        }
        // passos do ritual — sequência limpa no mesmo espaço
        if (stepsRef.current) {
          const stepEls = Array.from(
            stepsRef.current.querySelectorAll<HTMLElement>("[data-step]")
          );
          stepEls.forEach((se, i) => {
            se.style.visibility = "visible";
            const split = new SplitText(se, {
              type: "lines",
              mask: "lines",
              linesClass: "beat-line",
            });
            const at = (3 + 0.5 + i * 0.15) * SEG;
            tl.fromTo(
              split.lines,
              { opacity: 0, filter: "blur(8px)", yPercent: 18 },
              { opacity: 1, filter: "blur(0px)", yPercent: 0, duration: 0.08 * SEG },
              at
            );
            tl.to(
              split.lines,
              { opacity: 0, filter: "blur(8px)", yPercent: -12, duration: 0.06 * SEG },
              at + 0.11 * SEG
            );
          });
        }

        /* ── CENA 5 · RETORNO AO QUARTO ─────────────────────────────────
           surge difusa junto com a volta do quarto e RECUPERA nitidez. */
        const s5 = splitOf("m5");
        if (s5?.lines?.length) {
          tl.fromTo(
            s5.lines,
            { opacity: 0, filter: "blur(12px)" },
            {
              opacity: 0.65,
              filter: "blur(4px)",
              duration: 0.2 * SEG,
              stagger: (0.05 * SEG) / Math.max(1, s5.lines.length - 1),
            },
            (4 + 0.12) * SEG
          );
          // o quarto volta → a frase encontra nitidez e estabilidade plenas
          tl.to(
            s5.lines,
            { opacity: 1, filter: "blur(0px)", duration: 0.16 * SEG },
            (4 + 0.36) * SEG
          );
          const sh = shadeOf("m5");
          if (sh) tl.fromTo(sh, { opacity: 0 }, { opacity: 1, duration: 0.22 * SEG }, (4 + 0.14) * SEG);
          // a mão vai agir: a frase se apaga devagar, sem movimento brusco
          tl.to(
            s5.lines,
            { opacity: 0, filter: "blur(6px)", duration: 0.2 * SEG },
            (4 + 0.72) * SEG
          );
          if (sh) tl.to(sh, { opacity: 0, duration: 0.16 * SEG }, (4 + 0.74) * SEG);
        }

        /* ── CENA 6 · GESTO ─────────────────────────────────────────────
           a frase entra no pouso do telefone, tem tempo de leitura, e sai
           POR COMPLETO antes da luz do epílogo. */
        const s6 = splitOf("m6");
        if (s6?.lines?.length) {
          tl.fromTo(
            s6.lines,
            { opacity: 0, filter: "blur(8px)", yPercent: 16 },
            {
              opacity: 1,
              filter: "blur(0px)",
              yPercent: 0,
              duration: 0.18 * SEG,
              stagger: (0.05 * SEG) / Math.max(1, s6.lines.length - 1),
            },
            (5 + 0.52) * SEG
          );
          const sh = shadeOf("m6");
          if (sh) tl.fromTo(sh, { opacity: 0 }, { opacity: 1, duration: 0.16 * SEG }, (5 + 0.53) * SEG);
          tl.to(
            s6.lines,
            { opacity: 0, filter: "blur(8px)", duration: 0.12 * SEG },
            (5 + 0.84) * SEG
          );
          if (sh) tl.to(sh, { opacity: 0, duration: 0.1 * SEG }, (5 + 0.85) * SEG);
        }

        /* ── CENA 7 · O LIVRO (final, ordem do dono 19/07) ──────────────
           o prêmio da jornada: o homem lendo na luz. A frase final surge
           devagar com a manhã e permanece imóvel, nítida, até o fim. */
        const s7 = splitOf("m7");
        if (s7?.lines?.length) {
          tl.fromTo(
            s7.lines,
            { opacity: 0, filter: "blur(9px)", yPercent: 18 },
            {
              opacity: 1,
              filter: "blur(0px)",
              yPercent: 0,
              duration: 0.26 * SEG,
              stagger: (0.07 * SEG) / Math.max(1, s7.lines.length - 1),
            },
            (6 + 0.3) * SEG
          );
          const sh = shadeOf("m7");
          if (sh) tl.fromTo(sh, { opacity: 0 }, { opacity: 1, duration: 0.2 * SEG }, (6 + 0.32) * SEG);
          // sem saída: imóvel até o fim (tempo de leitura garantido)
        }

        // CTAs — discretos, só na conclusão, sem competir com o gesto
        if (ctasRef.current) {
          tl.fromTo(
            ctasRef.current,
            { autoAlpha: 0, y: 18 },
            { autoAlpha: 1, y: 0, duration: 0.03 },
            0.965
          );
        }

        // indicador de rolagem — some assim que a jornada começa
        if (hintRef.current) {
          tl.to(hintRef.current, { autoAlpha: 0, duration: 0.018 }, 0.006);
        }

        // âncora em 1.0: a timeline dura exatamente o percurso da rolagem
        tl.set({}, {}, 1);

        ScrollTrigger.refresh();
      });
    }, wrap);

    return () => ctx.revert();
  }, [reduced, beats, isMobile, steps]);

  const scrollToManifesto = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("manifesto");
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 88;
    const lenis = (window as any).__lenis;
    if (lenis?.scrollTo) lenis.scrollTo(y);
    else window.scrollTo({ top: y, behavior: "smooth" });
  }, []);

  const estudoHref = lang === "es" ? "/el-estudio" : "/o-estudo";

  /* ---------- Movimento reduzido: fades suaves, sequência íntegra ---------- */
  if (reduced) {
    const staticTexts = [
      tv.c1a,
      tv.c2b,
      `${tv.c3b} ${tv.c3c}`,
      `${tv.b90} ${steps.join(". ")}.`,
      tv.c5a,
      tv.bfim,
      tv.c7,
    ];
    return (
      <section id="top" className="border-b border-warm-gray/10">
        {SCENES.map((s, i) => (
          <figure key={s} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/generated/storyboard/scene-0${s}.png`}
              alt=""
              className="block h-auto w-full"
              loading={i === 0 ? "eager" : "lazy"}
            />
            <figcaption className="mx-auto max-w-3xl px-6 py-10">
              <p className="font-serif text-[clamp(1.6rem,3vw,2.6rem)] leading-[1.2]">
                {staticTexts[i]}
              </p>
              {i === N - 1 && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href="#manifesto" className="inline-flex items-center rounded-full border border-warm-gray/25 px-6 py-3 text-xs tracking-[0.22em] uppercase text-offwhite/90">
                    {t.hero.ctaPrimary} →
                  </a>
                  <a href={estudoHref} className="inline-flex items-center rounded-full border border-muted-red/40 px-6 py-3 text-xs tracking-[0.22em] uppercase text-offwhite/90">
                    {t.hero.ctaSecondary} →
                  </a>
                </div>
              )}
            </figcaption>
          </figure>
        ))}
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative border-b border-warm-gray/10"
      style={{ height: isMobile ? `${N * 92}vh` : `${N * 105}vh` }}
    >
      {/* máscara técnica INVISÍVEL: sem fundo/borda; folga vertical para nunca
          cortar descendentes ("g", "ç"); o wrapper nunca vira um bloco visível */}
      <style>{`
        .beat-text .beat-line, .trav-step .beat-line {
          padding-bottom: 0.18em;
          margin-bottom: -0.18em;
          background: none;
          border: 0;
        }
      `}</style>
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-ink">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {/* O APARELHO DO HERO — slab 3D com as duas faces REAIS (frente = a
            mestra; verso = G0 sem marca). Gira devagar por tempo na espera;
            a rolagem o conduz à frente plena antes da travessia da tela.
            Posição/escala escritas pelo laço do canvas (mesma geometria). */}
        <div
          ref={slabRef}
          aria-hidden="true"
          className="absolute z-[5]"
          style={{ display: "none", perspective: "1400px" }}
        >
          <div
            className="relative h-full w-full"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={FACE_FRENTE}
              alt=""
              className="absolute inset-0 h-full w-full rounded-[9%] object-cover"
              style={{ backfaceVisibility: "hidden", transform: "translateZ(3px)" }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={FACE_VERSO}
              alt=""
              className="absolute inset-0 h-full w-full rounded-[9%] object-cover"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(3px)" }}
            />
            {/* bordas metálicas (espessura do aparelho) */}
            <div
              aria-hidden="true"
              className="absolute bottom-[2%] left-0 top-[2%] w-[6px]"
              style={{
                background: "linear-gradient(#3a3a3e, #17171a 30%, #232327 70%, #3a3a3e)",
                transform: "rotateY(-90deg)",
                transformOrigin: "left center",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute bottom-[2%] right-0 top-[2%] w-[6px]"
              style={{
                background: "linear-gradient(#3a3a3e, #17171a 30%, #232327 70%, #3a3a3e)",
                transform: "rotateY(90deg)",
                transformOrigin: "right center",
              }}
            />
          </div>
        </div>

        {/* tela de espera discreta até o 1º quadro */}
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink">
            <div className="h-[2px] w-24 overflow-hidden rounded bg-warm-gray/20">
              <div className="h-full w-1/3 animate-pulse bg-[#BE7A2A]" />
            </div>
          </div>
        )}

        {/* AS FRASES — HTML real, cada uma no espaço negativo da SUA cena,
            protegida por um gradiente amplo e imperceptível (nunca uma caixa) */}
        <div
          ref={beatsWrapRef}
          className="absolute inset-0 z-10"
          style={{ perspective: "1000px" }}
        >
          {beats.map((b) => (
            <div
              key={b.id}
              data-beat={b.id}
              className={`absolute ${b.pos}`}
              style={{ visibility: "hidden", transformStyle: "preserve-3d" }}
            >
              {/* proteção de leitura: gradiente radial amplo, sem borda perceptível
                  (escuro nas cenas noturnas; CLARO na cena final do livro) */}
              <div
                aria-hidden="true"
                className="beat-shade pointer-events-none absolute -inset-x-[34%] -inset-y-[85%]"
                style={{
                  background: b.claro
                    ? "radial-gradient(ellipse 58% 52% at 42% 52%, rgba(244,240,232,0.55), rgba(244,240,232,0.25) 46%, transparent 72%)"
                    : "radial-gradient(ellipse 58% 52% at 42% 52%, rgba(11,11,12,0.5), rgba(11,11,12,0.22) 46%, transparent 72%)",
                }}
              />
              <p
                className={`beat-text relative max-w-[14ch] md:max-w-3xl font-serif leading-[1.16] tracking-[-0.02em] ${
                  b.kind === "title" && !b.small
                    ? "text-[clamp(2rem,5vw,4.1rem)]"
                    : "text-[clamp(1.55rem,3.2vw,2.8rem)]"
                } ${b.accent ? "text-muted-red" : b.claro ? "text-ink" : "text-offwhite"}`}
                style={{
                  textShadow: b.claro
                    ? "0 1px 20px rgba(244,240,232,0.6)"
                    : "0 1px 22px rgba(11,11,12,0.55)",
                }}
              >
                {b.text}
              </p>
            </div>
          ))}

          {/* ritual — 3 passos, um por vez, no MESMO lugar (cena do silêncio) */}
          <div
            ref={stepsRef}
            className="absolute inset-x-6 bottom-[14vh] md:inset-x-14 md:top-[52vh] md:bottom-auto"
          >
            {steps.map((s, i) => (
              <p
                key={s}
                data-step={i}
                className="trav-step absolute inset-x-0 font-serif text-[clamp(1.3rem,2.4vw,2rem)] leading-[1.2] text-offwhite/90"
                style={{ visibility: "hidden", textShadow: "0 1px 18px rgba(11,11,12,0.6)" }}
              >
                {s}.
              </p>
            ))}
          </div>
        </div>

        {/* CTAs — apenas na conclusão, discretos sobre o quadro final */}
        <div
          ref={ctasRef}
          className="invisible absolute inset-x-6 bottom-[6vh] z-10 opacity-0 md:inset-x-14 md:bottom-[8vh]"
        >
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#manifesto"
              onClick={scrollToManifesto}
              className="inline-flex items-center rounded-full border border-warm-gray/25 bg-black/35 px-6 py-3 text-xs tracking-[0.22em] uppercase text-offwhite/90 backdrop-blur-sm transition hover:bg-black/55"
            >
              {t.hero.ctaPrimary} <span className="ml-3 text-muted-red">→</span>
            </a>
            <a
              href={estudoHref}
              className="inline-flex items-center rounded-full border border-muted-red/40 bg-black/35 px-6 py-3 text-xs tracking-[0.22em] uppercase text-offwhite/90 backdrop-blur-sm transition hover:border-muted-red/70"
            >
              {t.hero.ctaSecondary} <span className="ml-3 text-muted-red">→</span>
            </a>
          </div>
        </div>

        {/* indicador discreto de rolagem — primeira tela apenas */}
        <div
          ref={hintRef}
          aria-hidden="true"
          className="absolute bottom-[4vh] left-1/2 z-10 -translate-x-1/2"
        >
          <div className="h-12 w-[1.5px] overflow-hidden rounded bg-warm-gray/25">
            <div className="trav-hint-dot h-4 w-full bg-[#BE7A2A]" />
          </div>
          <style>{`
            .trav-hint-dot { animation: travHint 1.9s ease-in-out infinite; }
            @keyframes travHint {
              0% { transform: translateY(-100%); opacity: 0; }
              25% { opacity: 1; }
              100% { transform: translateY(300%); opacity: 0; }
            }
          `}</style>
        </div>

        {/* trilha de progresso da narrativa (6 pontos) */}
        <div
          aria-hidden="true"
          className="absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-2.5 md:flex"
        >
          {SCENES.map((s, i) => (
            <span
              key={s}
              className="h-2 w-2 rounded-full transition-all duration-500"
              style={{
                background: i === active ? "#BE7A2A" : "rgba(185,176,162,0.3)",
                transform: i === active ? "scale(1.35)" : "scale(1)",
              }}
            />
          ))}
        </div>

        {/* pular a abertura (acessibilidade + pressa) */}
        <a
          href="#manifesto"
          onClick={scrollToManifesto}
          className="absolute right-5 top-24 z-10 rounded-full border border-warm-gray/25 bg-black/30 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-warm-gray/90 hover:text-offwhite transition"
        >
          {tv.skip} ↓
        </a>
      </div>
    </section>
  );
}
