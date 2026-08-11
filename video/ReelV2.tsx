// ─── ReelV2 — composição de RETENÇÃO (É A PRODUÇÃO dos 3 reels footage) ────────
// ⚠️ PRODUÇÃO desde 26/06 (PR #102): os workflows `instagram-reels.yml` e
// `instagram-reels-pt.yml` renderizam `--composition=ReelV2`. O `Reel` clássico
// (`video/Reel.tsx`, capa 5s estática) ficou de RESERVA; o `ReelClassic` é o slide
// animado do run 3. (Este cabeçalho dizia "NÃO roda em produção / renderizam Reel" —
// estava DESATUALIZADO desde a promoção; corrigido 2026-07-11.)
//
// Nasceu experimental pra atacar o gargalo medido no /insights: watch médio 4,3s de
// ~25s (17%) → a galera saía DURANTE a capa de 5s. O que mudou vs. o Reel clássico:
//   1. CAPA 5,0s → 3,0s: mata o "vão" parado e leva a pessoa pro 1º insight rápido
//      (curta o bastante p/ retenção, longa o bastante p/ o gancho cinético landar).
//   2. LEGENDA CINÉTICA: capa E insights entram palavra-por-palavra (movimento constante
//      = retenção; o olho não "para" como num slide estático).
//   3. CAPA VIVA, COR DE MARCA: kicker da marca em acento no topo + palavra-chave do
//      gancho na cor da marca + glow do acento (a capa branca/"morta" foi rejeitada).
//   4. DE-DUP (dedupeSlides): a geração às vezes faz slides[0] === título → capa e
//      insight 1 mostravam a MESMA frase (~8s repetidos). Aqui o insight ~igual ao
//      título é descartado (e a duração ajusta, sem cena preta no fim).
//   5. VOZ (narrationUrl) + END-CARD do FUNIL (funnel comment→DM) — campos de ReelProps
//      que só esta composição consome (o clássico os ignora).
// Reusa a CENA/GRADE comprovada do Reel (mesma cara de marca) via `Scene` exportado —
// sem copiar, sem drift.
// Render de teste isolado: `render-reel.mjs --composition=ReelV2` (CI), publish:no.

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  interpolateColors,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { Scene, reelDefaultProps, type ReelProps, FPS, CAT_ACCENT } from "./Reel";
import { normalizePhrase } from "../src/lib/slide-dedup";
// Import RELATIVO (não `@/…`) p/ o webpack do Remotion resolver no bundle do render.
// `narration-sync` é PURO (sem next/db), seguro no bundle — mesma regra do slide-dedup.
import {
  alignScriptToTranscript,
  buildSyncPlan,
  segmentTimings,
  splitWords,
} from "../src/lib/narration-sync";
// A conta da escala e o nome da série — ambos módulos PUROS, seguros no bundle do render
// (mesma regra do slide-dedup: sem next/db, import relativo).
import {
  REEL_LARGURA_UTIL,
  REEL_MARGEM_LATERAL,
  REEL_TEXTO_TOP,
  REEL_ALTURA_MANCHETE,
  tamanhoManchete,
  tamanhoInsight,
} from "../src/lib/capa-escala";
import { selo } from "../src/lib/serie";

const { fontFamily: FRAUNCES } = loadFraunces();
// ─── A FONTE DA FRASE (2026-08-09, o dono viu no feed: "fonte errada") ──────────
// A régua da marca separa as duas: a FRASE é condensada (Anton) e a ASSINATURA/Nº é a
// Fraunces 700 — serifa no nome + condensada na frase é o contraste que a marca pede.
// O vídeo estava com Fraunces nas DUAS, e no feed a frase serifada não segura: foi
// medido em `Comparacao-Fontes-2026-08-09.html` e travado na BIBLIOTECA-FORMATOS §2.2.
// ⚠️ Não trocar a Fraunces da marca — ela continua sendo a assinatura.
const { fontFamily: ANTON } = loadAnton();

// Constantes de texto (espelham o Reel; valores simples, isolados no V2 — não tocam
// a produção). A grade/footage vêm de `Scene`, então nada de cor de vídeo aqui.
const PAPER = "#F4F0E8";
const WHITE = "#ffffff";
const RED = "#A45A5A";
// A COR DA MARCA (o mesmo vinho de `CAT_ACCENT.freedom`). Identidade — barra do topo,
// etiqueta da série, palavra em destaque da manchete — usa SEMPRE esta, nunca o acento do
// pilar: em 11/08 o dono viu uma peça de pilar `anxiety` e disse «destaque não é da cor da
// nossa marca». O acento por pilar segue mandando no wash e no miolo da peça.
const MARCA = RED;
// ⛔ 04/08/2026 — ESTE MAPA ESTAVA PRESO NA FASE QUE O DONO REPROVOU.
//
// Em 14/07 travou-se um acento ÚNICO vinho, junto com a direção "grafite editorial
// sobre creme". Em **15/07 o dono REPROVOU essa direção inteira** e mandou restaurar
// a cinematográfica — e com ela **os 6 acentos por categoria**, porque a variação de
// cor nunca foi o problema (a Nº 228 que ele ama é dourada). A reversão chegou à
// ilustração, ao carrossel e ao `Reel.tsx` clássico; **não chegou aqui** — e o
// `ReelV2` é o motor de PRODUÇÃO dos Reels. Ou seja: por vinte dias todo Reel saiu
// com a cor da fase reprovada. É parte do que ele viu no feed em 04/08 ao dizer
// *"as capas estão horríveis, eu já havia determinado as capas"*.
//
// Agora o mapa não é mais copiado: vem de `Reel.tsx`, que já tinha a separação certa
// (achado do designer-criativos, 16/07) — **wash sobre footage** continua sempre
// vinho (os 6 matizes sobre pele real davam tom doentio) e **UI plana** (régua,
// kicker, palavra em destaque) usa o acento do pilar. Cópia de regra diverge; esta
// divergiu por vinte dias sem ninguém ver.
// Fonte da direção: .claude/marca/dr-libertad/DIRECAO-CAPAS.md
// (o mapa vem do import de `./Reel` no topo deste arquivo)
const SAFE_TOP = 340;
const SAFE_BOTTOM_TEXT = 420;
const SAFE_BOTTOM_HANDLE = 300;

// ─── Tempos V2 (capa curta) ───────────────────────────────────────────────────
// DE-DUP compartilhado (componente E Root.calculateMetadata usam o MESMO) → a duração
// da composição bate com o nº de insights REALMENTE renderizados (senão sobra cena preta
// no fim). A geração às vezes faz slides[0] === título; aqui descartamos os ~iguais.
export function dedupeSlides(title: string, slides: string[] | undefined): string[] {
  const raw = (slides && slides.length ? slides : reelDefaultProps.slides).slice(0, 3);
  // `normalizePhrase` é a FONTE ÚNICA (src/lib/slide-dedup) — antes o V2 tinha um `norm`
  // inline idêntico (risco de drift). Import RELATIVO (não `@/…`) p/ o webpack do Remotion
  // resolver no bundle do render; slide-dedup é PURO (sem next/db), seguro no bundle.
  const tnorm = normalizePhrase(title);
  const distinct = raw.filter((s) => normalizePhrase(s) !== tnorm);
  return distinct.length ? distinct : raw;
}

export function reelDurationsV2(slidesCount: number, hasFunnel = false) {
  const COVER = Math.round(FPS * 3.0); // era 5,0 — capa curta, mas com tempo do gancho cinético LANDAR
  const INSIGHT = Math.round(FPS * 5.6);
  const CTA = Math.round(FPS * 4.6);
  const FUNNEL = hasFunnel ? Math.round(FPS * 3.5) : 0; // end-card do funil (comment→DM) com a arte do livro — curto p/ retenção (casa c/ a música ~28s)
  const n = Math.min(Math.max(slidesCount || 1, 1), 3);
  return { COVER, INSIGHT, CTA, FUNNEL, n, total: COVER + INSIGHT * n + CTA + FUNNEL };
}

// (FUNNEL_SEC removido 2026-07-29: o funil agora entra em FRAMES via reelDurationsV2,
// junto do CTA, sempre DEPOIS da voz — a voz não narra mais o fecho.)

// ─── PLANO DE TEMPOS — fonte única (componente + Root.calculateMetadata) ──────
// Dois modos, na ordem de preferência:
//   1. SINCRONIZADO (a voz veio com medida): cada cena começa NO FRAME em que a voz
//      começa aquela frase, e cada palavra da legenda acende quando é falada. É o
//      conserto da dessincronia — o áudio é o relógio.
//   2. FÓRMULA (sem narração, ou medida ausente/inconsistente): capa 3,0s +
//      insight 5,6s×n + cta 4,6s — o comportamento de sempre, byte-idêntico.
// A degradação é silenciosa de propósito: um Reel sem voz nunca deve quebrar por
// causa de um campo de sincronia faltando.
export interface ReelV2Plan {
  synced: boolean;
  scenes: Array<{ fromFrame: number; durationInFrames: number }>; // capa, insights…, cta, [funil]
  wordFrames: number[][];  // por cena falada: frame RELATIVO em que cada palavra da tela acende
  usedSlides: string[];
  n: number;
  total: number;
}

export function reelPlanV2(props: Partial<ReelProps>, fps: number = FPS): ReelV2Plan {
  const safeSlides = dedupeSlides(props.title ?? "", props.slides);
  const { COVER, INSIGHT, CTA, FUNNEL, n, total } = reelDurationsV2(safeSlides.length, !!props.funnel);
  const usedSlides = safeSlides.slice(0, n);

  const fallback = (): ReelV2Plan => {
    const scenes: Array<{ fromFrame: number; durationInFrames: number }> = [];
    let cursor = 0;
    const push = (d: number) => { scenes.push({ fromFrame: cursor, durationInFrames: d }); cursor += d; };
    push(COVER);
    for (let i = 0; i < n; i++) push(INSIGHT);
    push(CTA);
    if (FUNNEL > 0) push(FUNNEL);
    return { synced: false, scenes, wordFrames: [], usedSlides, n, total };
  };

  const segments = Array.isArray(props.narrationSegments) ? props.narrationSegments.filter(Boolean) : [];
  const durationSec = Number(props.narrationDurationSec ?? 0);
  // Precisa de: áudio + duração medida + os blocos do roteiro na quantidade que a
  // voz FALA. Duas contagens válidas:
  //   n+2 = capa + insights + FECHO falado — o caminho de HOJE nos DOIS idiomas
  //         (o ES ganhou fecho em 10/08: sem ele a voz parava aos 18,4 s de um vídeo
  //         de 27,2 s e o dono ouviu isso como "áudio truncado");
  //   n+1 = capa + insights, SEM fecho — o formato de 29/07 a 10/08, que ainda chega
  //         aqui por áudio guardado ou por idioma sem frase de fecho declarada.
  // Qualquer outra contagem → fórmula, como sempre.
  const comFecho = segments.length === n + 2;
  if (!props.narrationUrl || !(durationSec > 0) || (segments.length !== n + 1 && !comFecho)) return fallback();

  const scriptWords = segments.flatMap(splitWords);
  if (!scriptWords.length) return fallback();

  const words = alignScriptToTranscript(
    scriptWords,
    Array.isArray(props.narrationWords) ? props.narrationWords : [],
    durationSec,
  );
  const plan = buildSyncPlan(segments, words, durationSec, fps, 0);
  const timings = segmentTimings(segments, words);
  const scenes = [...plan.scenes];
  let totalFrames = plan.totalFrames;
  if (comFecho) {
    // BR: a ÚLTIMA cena falada É o CTA — começa quando a voz começa o fecho e ganha
    // um respiro de leitura DEPOIS da fala (esticar a última cena falada não empurra
    // ninguém que fale; o funil entra depois dela, como sempre).
    const HOLD = Math.round(fps * 2.0);
    scenes[scenes.length - 1] = {
      ...scenes[scenes.length - 1],
      durationInFrames: scenes[scenes.length - 1].durationInFrames + HOLD,
    };
    totalFrames += HOLD;
  } else {
    // ES: o CTA segue como cena de tela, sem fala, depois da voz.
    scenes.push({ fromFrame: totalFrames, durationInFrames: CTA });
    totalFrames += CTA;
  }
  if (FUNNEL > 0) {
    scenes.push({ fromFrame: totalFrames, durationInFrames: FUNNEL });
    totalFrames += FUNNEL;
  }

  // Frames de cada palavra, RELATIVOS ao início da sua cena (dentro de uma Sequence
  // o Remotion zera o frame). O texto na tela é o do slide (sem a pontuação que o
  // roteiro adiciona), então só aplicamos quando a contagem de palavras bate — senão
  // aquela cena usa a revelação de ritmo fixo, sem arriscar legenda torta.
  const screenTexts = [props.title ?? "", ...usedSlides];
  const wordFrames: number[][] = screenTexts.map((text, i) => {
    const t = timings[i];
    const scene = scenes[i];
    if (!t || !scene) return [];
    const screenCount = splitWords(text).length;
    const spokenCount = t.to - t.from + 1;
    if (!screenCount || screenCount !== spokenCount) return [];
    return words
      .slice(t.from, t.to + 1)
      .map((w) => Math.max(0, Math.round(w.start * fps) - scene.fromFrame));
  });

  return { synced: true, scenes, wordFrames, usedSlides, n, total: totalFrames };
}

export const reelV2DefaultProps: ReelProps = reelDefaultProps;

/**
 * O idioma da peça, lido do @ da conta — as duas contas são operações separadas e o
 * handle é o único campo que a composição já recebe e que distingue as duas
 * (`@dr.liberdade.br` × `@dr.liberdad`). Preferi isto a acrescentar um campo em
 * `ReelProps`, que é compartilhado com o Reel clássico e com o carrossel.
 */
export function langDoHandle(handle: string | undefined): "br" | "es" {
  return /\.br\b|liberdade/i.test(handle ?? "") ? "br" : "es";
}

function Handle({ color = PAPER, handle = "@dr.liberdad" }: { color?: string; handle?: string }) {
  return (
    <div style={{ fontFamily: FRAUNCES, fontSize: 38, fontWeight: 600, letterSpacing: 2, color: PAPER, opacity: 0.85 }}>
      {handle}
    </div>
  );
}

// ─── Legenda cinética: revela palavra-por-palavra (movimento = retenção) ───────
//
// ⛔ 2026-08-11 — A CAPA DEIXOU DE ENTRAR PALAVRA A PALAVRA (`inteiroDeInicio`).
// O que estava medido: **12,4% continuaram assistindo** no canal BR e 19,2% no ES,
// contra 70% da referência estudada. A causa apareceu quadro a quadro: no segundo 0 a
// tela não trazia mensagem nenhuma (só marca e @), a frase ia se formando e só ficava
// inteira no **3º segundo** — e a pessoa decide no primeiro. Em feed de deslizar, tela
// que começa muda é tela que ninguém espera terminar.
//
// A revelação cinética foi decidida em junho (PR #102) contra um problema DIFERENTE: a
// capa parada de 5 s, que fazia sair DURANTE a capa. Ela resolveu aquilo e criou este.
// Agora a capa nasce inteira e o movimento continua — a palavra-chave acende na cor da
// marca, o fundo respira, a barra do selo cresce. Os INSIGHTS seguem palavra a palavra:
// lá a pessoa já está dentro, e é a voz que manda no ritmo.
function KineticText({
  text,
  accent,
  accentColor,
  startFrame = 3,
  perWord = 3,
  fontSize = 88,
  wordFrames,
  inteiroDeInicio = false,
  maxWidth = REEL_LARGURA_UTIL,
}: {
  text: string;
  accent: string;
  accentColor: string;
  startFrame?: number;
  perWord?: number;
  fontSize?: number;
  // Frame (relativo à cena) em que CADA palavra é realmente falada. Quando vem, a
  // legenda acende no ritmo da voz — não num compasso fixo de 3 frames que só por
  // coincidência batia com a fala. Ausente/incompleto → ritmo fixo de sempre.
  wordFrames?: number[];
  /** Frase legível no PRIMEIRO quadro: nenhuma palavra nasce apagada. */
  inteiroDeInicio?: boolean;
  maxWidth?: number;
}) {
  const frame = useCurrentFrame();
  const words = (text || "").split(" ");
  const timed = !inteiroDeInicio && Array.isArray(wordFrames) && wordFrames.length === words.length;
  const clean = (w: string) => w.toLowerCase().replace(/[.,;:!?¿¡"']/g, "");
  return (
    <div style={{ fontFamily: ANTON, fontWeight: 400, fontSize, lineHeight: 1.12, color: WHITE, textShadow: "0 2px 28px rgba(0,0,0,0.55)", maxWidth }}>
      {words.map((w, i) => {
        const f0 = timed ? wordFrames![i] : startFrame + i * perWord;
        const o = inteiroDeInicio
          ? 1
          : interpolate(frame, [f0, f0 + 7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const y = inteiroDeInicio
          ? 0
          : interpolate(frame, [f0, f0 + 7], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const isAccent = !!accent && clean(w).includes(accent.toLowerCase());
        // Com a frase inteira desde o quadro 0, o movimento passa a ser a palavra-chave
        // ACENDENDO na cor da marca — nada apaga, nada falta, e a tela não fica parada.
        const cor = !isAccent
          ? WHITE
          : inteiroDeInicio
            ? interpolateColors(frame, [6, 16], [WHITE, accentColor])
            : accentColor;
        return (
          <span
            key={i}
            style={{ display: "inline-block", opacity: o, transform: `translateY(${y}px)`, color: cor, marginRight: "0.26em" }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
}

// Palavra de realce da CAPA: o kw da marca se aparece no título; senão a última
// palavra (a "essência" do dono costuma cair no fim da frase). Vai na cor da marca.
function pickCoverAccent(title: string, kw: string): string {
  const words = (title || "").split(/\s+/).filter(Boolean);
  const strip = (w: string) => w.toLowerCase().replace(/[^\p{L}]/gu, "");
  if (kw) {
    const m = words.find((w) => strip(w).includes(strip(kw)) && strip(kw).length > 2);
    if (m) return strip(m);
  }
  return strip(words[words.length - 1] || "");
}

// ─── Capa V2: gancho cinético + IDENTIDADE DE MARCA (cor, kicker, movimento) ───
// A capa "morta" (título branco embaixo, sem vida) foi substituída por: kicker da
// marca em ACENTO no topo, gancho que entra palavra a palavra com a palavra-chave
// na cor da marca, fundo com glow do acento.
//
// ⛔ 04/08/2026 — O QUE MUDOU, E POR QUÊ. Até aqui o frame 0 ficava LIMPO de
// propósito ("respeita a capa-de-grid sem título") e o "Nº" tinha sido tirado do
// topo por ser "ruído p/ quem chega frio". As duas decisões juntas produziram, no
// perfil, exatamente o que o dono chamou de horrível: como o Instagram usa o frame
// 0 como capa do grid, cada Reel aparecia no perfil como uma FOTO DE BANCO crua —
// sem marca, sem número, sem nada. É contra a direção que ele mesmo travou:
// `DIRECAO-CAPAS.md` manda "DR. LIBERDADE · Nº XXX no topo + @handle na base" e
// põe "footage do Pexels na capa" na lista do que MORRE.
//
// Conserto, sem perder a retenção que o gancho cinético trouxe:
//   • o kicker agora traz o **Nº da edição** (âncora de coleção da direção) e nasce
//     JÁ VISÍVEL no frame 0 — quem cai no vídeo vê a marca de cara;
//   • o gancho continua entrando palavra a palavra (nada de "vão" parado);
//   • a capa do GRID deixa de ser o frame 0 cru: `publish-reel` passa a mandar
//     `thumb_offset` no fim da capa, quando o título já está inteiro.
//
// ⛔ 2026-08-11 — TRÊS CONSERTOS MEDIDOS ENTRARAM AQUI (o dono autorizou os três):
//   1. a frase nasce INTEIRA no quadro 0 (ver o cabeçalho de `KineticText`);
//   2. a letra passa a ENCHER a largura — era 74–76% do quadro contra 85–95% das 10
//      contas de referência. A margem lateral de 90px sozinha travava o teto em 83,3%,
//      então nenhuma escolha de fonte alcançaria a régua sem mexer nela (agora 40px);
//   3. o cabeçalho ganha o NOME da série. Tínhamos "Nº 244" — número sem nome não vira
//      coleção. O nome não é invenção desta sessão: é a bandeira que o dono escolheu em
//      14/07 ("Gaiola sem grade" / "Jaula sin rejas"), e o CONCEITO-BANDEIRA.md já
//      mandava usá-la como âncora de coleção na capa numerada.
// O texto saiu da base e foi para o MIOLO do quadro: ancorado embaixo com largura cheia,
// ele passaria por baixo dos botões de curtir/comentar/enviar que o Instagram desenha na
// direita. `capa-escala.ts` tem a faixa livre medida.
function CoverTextV2({ title, accent, brand, handle, kw, ed, lang, wordFrames }: { title: string; accent: string; brand: string; handle: string; kw: string; ed?: string; lang?: string; wordFrames?: number[] }) {
  const frame = useCurrentFrame();
  const coverAccent = pickCoverAccent(title, kw);
  // Nasce em 1 (não em 0): a identidade tem de estar no primeiro quadro.
  const kickerO = 1;
  const barW = interpolate(frame, [0, 12], [42, 96], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // ⛔ 2026-08-11, 2ª rodada — O DONO VIU A PEÇA E APONTOU TRÊS COISAS:
  //   · «destaque não é da cor da nossa marca» — a barra e o selo saíam no acento do
  //     PILAR (esta peça era `anxiety` = verde-azulado #3D6360). Os 6 acentos por pilar
  //     continuam valendo para o wash e para a palavra em destaque do texto (decisão dele
  //     de 15/07), mas a IDENTIDADE — barra, selo, etiqueta — passa a ser sempre o VINHO
  //     da marca. Identidade que muda de cor a cada peça não é identidade.
  //   · «coloque o nome da série em um quadrado vermelho» — o selo virou ETIQUETA sólida.
  //   · «tamanho da letra da capa e fonte devem ser igual a desse print» — o print é uma
  //     peça nossa (Nº 363) com a manchete em CAIXA ALTA. Era a única diferença de fato:
  //     a fonte já era a mesma (Anton) e a ocupação já estava na régua.
  const manchete = (title || "").toUpperCase();
  const fontSize = tamanhoManchete(manchete);
  return (
    <AbsoluteFill>
      {/* Glow do acento atrás do texto → tira o "morto", dá profundidade de marca */}
      <AbsoluteFill style={{ background: `radial-gradient(60% 38% at 26% 78%, ${accent}38 0%, rgba(0,0,0,0) 70%)` }} />
      {/* Cabeçalho: a marca (DIRECAO-CAPAS) + a ETIQUETA da série logo abaixo */}
      <div style={{ position: "absolute", top: SAFE_TOP - 150, left: REEL_MARGEM_LATERAL, opacity: kickerO }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: barW, height: 7, backgroundColor: MARCA, borderRadius: 4 }} />
          <div style={{ fontFamily: FRAUNCES, fontSize: 36, fontWeight: 700, letterSpacing: 5, color: PAPER }}>
            {brand.toUpperCase()}
          </div>
        </div>
        <div style={{ marginTop: 16, marginLeft: 118, display: "inline-block", backgroundColor: MARCA, borderRadius: 6, padding: "12px 22px", boxShadow: "0 4px 18px rgba(0,0,0,0.45)" }}>
          <div style={{ fontFamily: FRAUNCES, fontSize: 30, fontWeight: 700, letterSpacing: 4, color: PAPER, whiteSpace: "nowrap" }}>
            {selo(lang ?? "br", ed)}
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", top: REEL_TEXTO_TOP, left: REEL_MARGEM_LATERAL, width: REEL_LARGURA_UTIL, height: REEL_ALTURA_MANCHETE, display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
        {/* A manchete inteira, em CAIXA ALTA, no tamanho que enche a largura */}
        <KineticText text={manchete} accent={coverAccent} accentColor={MARCA} fontSize={fontSize} inteiroDeInicio wordFrames={wordFrames} />
      </div>
      <div style={{ position: "absolute", bottom: SAFE_BOTTOM_HANDLE, left: REEL_MARGEM_LATERAL }}>
        <Handle color={PAPER} handle={handle} />
      </div>
    </AbsoluteFill>
  );
}

// ─── Insight V2: legenda cinética ──────────────────────────────────────────────
function InsightTextV2({ text, accent, accentColor, index, total, handle, wordFrames }: { text: string; accent: string; accentColor: string; index: number; total: number; handle: string; wordFrames?: number[] }) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: SAFE_TOP - 150, left: REEL_MARGEM_LATERAL, fontFamily: FRAUNCES, fontSize: 40, fontWeight: 700, color: PAPER, opacity: o }}>
        {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </div>
      {/* Mesma faixa livre e mesma largura útil da capa — a régua de 85% vale para a peça
          inteira, não só para o primeiro quadro. Aqui o texto SEGUE entrando palavra a
          palavra: quem chegou até o insight já decidiu ficar, e é a voz que dá o ritmo. */}
      <div style={{ position: "absolute", top: REEL_TEXTO_TOP, left: REEL_MARGEM_LATERAL, width: REEL_LARGURA_UTIL, height: REEL_ALTURA_MANCHETE, display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
        <KineticText text={text} accent={accent} accentColor={accentColor} startFrame={3} perWord={3} fontSize={tamanhoInsight(text)} wordFrames={wordFrames} />
      </div>
      <div style={{ position: "absolute", bottom: SAFE_BOTTOM_HANDLE, left: REEL_MARGEM_LATERAL }}>
        <Handle color={PAPER} handle={handle} />
      </div>
    </AbsoluteFill>
  );
}

// ─── CTA V2 (mantém o da produção) ─────────────────────────────────────────────
function CtaTextV2({ cta, accent, handle, ctaFollow, ctaBio }: { cta: string; accent: string; handle: string; ctaFollow: string; ctaBio: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entry = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 30 });
  const scale = interpolate(entry, [0, 1], [0.85, 1]);
  const o = interpolate(entry, [0, 1], [0, 1]);
  const pulse = 1 + 0.02 * Math.sin((frame / fps) * Math.PI * 2);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 90px", textAlign: "center" }}>
      <div style={{ transform: `scale(${scale})`, opacity: o, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 110, height: 8, backgroundColor: accent, marginBottom: 50, borderRadius: 4 }} />
        <div style={{ fontFamily: ANTON, fontWeight: 400, fontSize: 92, lineHeight: 1.1, color: WHITE, textShadow: "0 2px 28px rgba(0,0,0,0.55)", transform: `scale(${pulse})` }}>
          {ctaFollow} <span style={{ color: accent }}>{handle}</span>
        </div>
        <div style={{ marginTop: 50, fontFamily: FRAUNCES, fontWeight: 400, fontSize: 50, lineHeight: 1.3, color: PAPER, opacity: 0.92, maxWidth: 880, textShadow: "0 2px 20px rgba(0,0,0,0.55)" }}>
          {cta}
        </div>
        <div style={{ marginTop: 60, fontFamily: FRAUNCES, fontSize: 40, fontWeight: 600, letterSpacing: 2, color: accent }}>
          {ctaBio}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── End-card do FUNIL (comment→DM): "Comenta [palavra]" PULSANDO sobre a arte do livro ─
// Só entra quando o funil está ligado (a API manda `funnel` no preview). Fundo = a CAPA
// do "I Love Dopamina" (cérebro + gradiente) via <Scene img>. A palavra-chave pulsa
// (escala + halo) pra chamar o olho — o "movimento" que o dono pediu.
const FUNNEL_CREAM = "#F4EFE0";   // creme do livro (= fundo do slide do carrossel aprovado)
const FUNNEL_MAGENTA = "#D4357E"; // magenta da capa (halo/glow do pulso — precisa ser cor sólida)
const FUNNEL_GRAD = "linear-gradient(120deg, #E8552F 0%, #D4357E 52%, #9B3FB5 100%)"; // pílula = gradiente da capa (escolha do dono)
const FUNNEL_ART_BOTTOM = 1230;   // onde a arte termina e começa o creme (= ARTH do fundo composto)
// Fundo = imagem 9:16 composta (public/images/dopamina-funnel-bg-<lang>): a arte do livro
// (kicker + I❤DOPAMINA + cérebro) no topo, derretendo no creme; o subtítulo/autor da capa
// ficam de fora → zona creme LIMPA embaixo (sem colisão de texto). Só as cores do livro.
function FunnelCardV2({ cover, keyword, action, note, handle }: { cover?: string; keyword: string; action: string; note: string; handle: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entry = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 });
  const rise = interpolate(entry, [0, 1], [40, 0]);
  // PULSO da palavra-chave: escala ±7% + halo que respira (~1,1 Hz) → chama o olho
  const t = (frame / fps) * Math.PI * 2 * 1.1;
  const pulse = 1 + 0.07 * Math.sin(t);
  const halo = 26 + 48 * (0.5 + 0.5 * Math.sin(t));
  return (
    <AbsoluteFill style={{ backgroundColor: FUNNEL_CREAM }}>
      {cover ? <Img src={cover} style={{ width: 1080, height: 1920, objectFit: "cover" }} /> : null}
      <div style={{ position: "absolute", top: FUNNEL_ART_BOTTOM, left: 0, width: 1080, height: 1920 - FUNNEL_ART_BOTTOM, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px" }}>
        <div style={{ opacity: entry, transform: `translateY(${rise}px)`, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ fontFamily: FRAUNCES, fontWeight: 600, fontSize: 50, color: "#3A2230", marginBottom: 32 }}>
            {action}
          </div>
          <div style={{ transform: `scale(${pulse})`, borderRadius: 9999, padding: "30px 84px", background: FUNNEL_GRAD, boxShadow: `0 0 ${halo}px ${FUNNEL_MAGENTA}` }}>
            <div style={{ fontFamily: ANTON, fontWeight: 400, fontSize: 100, letterSpacing: 8, color: FUNNEL_CREAM, textTransform: "uppercase" }}>
              {keyword}
            </div>
          </div>
          <div style={{ fontFamily: FRAUNCES, fontWeight: 400, fontSize: 44, color: "rgba(42,20,30,0.72)", marginTop: 32, maxWidth: 900 }}>
            {note}
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 70, width: 1080, display: "flex", justifyContent: "center" }}>
        <div style={{ fontFamily: FRAUNCES, fontSize: 36, fontWeight: 600, letterSpacing: 2, color: "rgba(42,20,30,0.5)" }}>{handle}</div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Composição V2 ─────────────────────────────────────────────────────────────
export const ReelV2: React.FC<ReelProps> = (props) => {
  const {
    title, slides, accentWords, cta, kw, ed, img, clips, clip, music, narrationUrl, cat, funnel,
    handle = "@dr.liberdad", brand = "Dr. Libertad", ctaFollow = "Sigue", ctaBio = "→ Más en el link de la bio",
  } = props;
  const accent = CAT_ACCENT[cat ?? "freedom"] ?? RED;
  // PLANO DE TEMPOS (mesma função do Root.calculateMetadata → duração da composição
  // e cenas nunca divergem). Com voz medida, cada cena começa no frame em que a voz
  // começa a frase; sem ela, a fórmula de sempre. O DE-DUP mora dentro do plano.
  const plan = reelPlanV2(props);
  const { scenes, wordFrames, usedSlides, n, total } = plan;
  const funnelCover = funnel?.cover
    ? (/^https?:\/\//.test(funnel.cover) ? funnel.cover : staticFile(funnel.cover))
    : undefined;

  const pool = clips && clips.length ? clips : clip ? [clip] : [];
  const sceneClip = (i: number) => (pool.length ? pool[i % pool.length] : undefined);

  // Cenas na ordem: capa (0), insights (1..n), cta (n+1), funil (n+2, se houver).
  const at = (i: number) => scenes[i] ?? { fromFrame: 0, durationInFrames: 1 };
  const COVER_S = at(0);
  const CTA_S = at(n + 1);
  const FUNNEL_S = at(n + 2);

  const musicSrc = music ? (/^https?:\/\//.test(music) ? music : staticFile(music)) : null;
  // Narração (voz) por cima; quando há narração, a música vira LEITO SUAVE (ducking).
  const narrationSrc = narrationUrl ? (/^https?:\/\//.test(narrationUrl) ? narrationUrl : staticFile(narrationUrl)) : null;
  const musicMax = narrationSrc ? 0.16 : 0.7;
  // ⛔ 2026-08-11 — O VOLUME DA MÚSICA SEGUE O RELÓGIO DA PEÇA, NÃO O DA TRILHA.
  // Este `useCurrentFrame` no corpo do componente existe por um motivo exato: o callback
  // `volume={(f) => …}` do `<Audio>` recebe o frame **relativo ao áudio**, e com `loop`
  // esse frame VOLTA A ZERO a cada repetição. Medido: com o loop ligado e a curva no
  // callback, o fecho ganhou um buraco de 3 s mudo aos 25–27 s e o som "renascia" aos 28 s
  // com o fade de abertura outra vez. Lendo o frame da COMPOSIÇÃO, a curva é uma só: sobe
  // no início, segura, e só desce no fim de verdade.
  const frameDaPeca = useCurrentFrame();
  const musicVol = interpolate(frameDaPeca, [0, 15, total - 24, total], [0, musicMax, musicMax, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  let sceneIdx = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0B0B0C" }}>
      <Sequence from={COVER_S.fromFrame} durationInFrames={COVER_S.durationInFrames}>
        <Scene clip={sceneClip(sceneIdx++)} img={img} kw={kw} accent={accent} dur={COVER_S.durationInFrames} cat={cat}>
          <CoverTextV2 title={title} accent={accent} brand={brand} handle={handle} kw={kw} ed={ed} lang={langDoHandle(handle)} wordFrames={wordFrames[0]} />
        </Scene>
      </Sequence>

      {usedSlides.map((text, i) => {
        const s = at(i + 1);
        return (
          <Sequence key={i} from={s.fromFrame} durationInFrames={s.durationInFrames}>
            <Scene clip={sceneClip(sceneIdx++)} img={img} kw={kw} accent={accent} dur={s.durationInFrames} cat={cat}>
              <InsightTextV2 text={text} accent={accentWords?.[i] ?? ""} accentColor={accent} index={i + 1} total={n} handle={handle} wordFrames={wordFrames[i + 1]} />
            </Scene>
          </Sequence>
        );
      })}

      <Sequence from={CTA_S.fromFrame} durationInFrames={CTA_S.durationInFrames}>
        <Scene clip={sceneClip(sceneIdx++)} img={img} kw={kw} accent={accent} dur={CTA_S.durationInFrames} cat={cat}>
          <CtaTextV2 cta={cta} accent={accent} handle={handle} ctaFollow={ctaFollow} ctaBio={ctaBio} />
        </Scene>
      </Sequence>

      {funnel && (
        <Sequence from={FUNNEL_S.fromFrame} durationInFrames={FUNNEL_S.durationInFrames}>
          {/* end-card do funil: arte do livro (fundo 9:16 composto) + funil na zona creme */}
          <FunnelCardV2 cover={funnelCover} keyword={funnel.keyword} action={funnel.action} note={funnel.note} handle={handle} />
        </Sequence>
      )}

      {/* ⛔ 2026-08-11 — O ÁUDIO MORRIA ANTES DO FIM (o dono ouviu: "áudio quebra").
          Medido no Reel publicado: o som cai de −17 dB para −85 dB aos ~27 s e o vídeo
          termina aos 30,6 s — **2,6 segundos mudos** no fecho, bem em cima do convite.
          A causa não é o fade: **toda trilha do acervo tem exatamente 28,000 s** (medidas
          uma a uma) e a peça passou disso. O comentário antigo aqui dizia "casa c/ a
          música ~28s" — era uma suposição, e ela deixou de valer quando o fecho falado
          entrou em 10/08 e esticou a peça. Com `loop`, a cama recomeça e cobre qualquer
          duração; o fade final continua sendo o da interpolação abaixo. */}
      {musicSrc && <Audio src={musicSrc} loop volume={musicVol} />}
      {/* Narração em volume cheio, do frame 0 — é ela que dita o vídeo, não o contrário.
          As cenas acima já começam nos frames em que a voz vira de frase (plano
          sincronizado), então a tela nunca atrasa nem adianta em relação à fala.
          A clareza da abertura vem da velocidade NATURAL fixa (0,85), não de fade. */}
      {narrationSrc && <Audio src={narrationSrc} />}
    </AbsoluteFill>
  );
};
