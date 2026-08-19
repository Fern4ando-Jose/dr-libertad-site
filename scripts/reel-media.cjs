// ─── Mídia visual REAL de um Reel (guarda anti-preto, #3) ─────────────────────
// Um Reel só tem fundo de verdade se houver ≥1 CLIPE de footage (Pexels) OU uma
// ILUSTRAÇÃO (img). Sem nenhum dos dois, o Reel.tsx cai no último recurso (fundo
// INK quase preto + marca d'água) — visualmente "quebrado". Esse Reel NÃO pode ir
// ao ar (caso Nº 102, capa preta). Esta função é a FONTE ÚNICA da regra: o
// workflow decide pular a publicação por ela, e o teste invariante a fixa.
//
// CommonJS de propósito: o passo do GitHub Actions a chama via `node -e require()`
// sem build de TS; o teste (src/lib/reel-media.invariants.test.ts) usa a MESMA
// implementação (sem duplicar a lógica → não dessincroniza).

/** @param {{clips?: unknown, img?: unknown}|null|undefined} props */
function hasVisualMedia(props) {
  if (!props || typeof props !== "object") return false;
  const clips = props.clips;
  if (Array.isArray(clips) && clips.some((c) => typeof c === "string" && c.trim() !== "")) {
    return true;
  }
  if (typeof props.img === "string" && props.img.trim() !== "") return true;
  return false;
}

// ─── TRAVA DE PEÇA PRONTA (ordem do dono 15/08) ───────────────────────────────
// "deve chegar o texto, o audio e imagens e video" antes de publicar. O Reel só
// publica com os 4 componentes no reel-props.json:
//   texto   → title não-vazio E slides com ≥1 E caption não-vazio;
//   áudio   → narrationUrl não-vazio;
//   imagens → img não-vazio;
//   vídeo   → clips com ≥1 string não-vazia.
// Faltou um → { ok:false, faltando:[...] } (fail-closed: o workflow NÃO renderiza/
// publica — o catchup redispara a vaga depois). Entrada inválida → { ok:false,
// faltando:["props"] }. Irmã de hasVisualMedia (que segue intacta, guarda anti-preto).

/** @param {{title?: unknown, slides?: unknown, narrationUrl?: unknown, img?: unknown, clips?: unknown}|null|undefined} props
 *  @param {unknown} caption */
function reelPronto(props, caption) {
  if (!props || typeof props !== "object") return { ok: false, faltando: ["props"] };
  const faltando = [];

  const titleOk = typeof props.title === "string" && props.title.trim() !== "";
  const slidesOk =
    Array.isArray(props.slides) &&
    props.slides.some((s) => typeof s === "string" && s.trim() !== "");
  const captionOk = typeof caption === "string" && caption.trim() !== "";
  if (!titleOk) faltando.push("texto (title)");
  if (!slidesOk) faltando.push("texto (slides)");
  if (!captionOk) faltando.push("texto (caption)");

  if (!(typeof props.narrationUrl === "string" && props.narrationUrl.trim() !== "")) {
    faltando.push("áudio");
  }

  if (!(typeof props.img === "string" && props.img.trim() !== "")) {
    faltando.push("imagens");
  }

  const clipsOk =
    Array.isArray(props.clips) &&
    props.clips.some((c) => typeof c === "string" && c.trim() !== "");
  if (!clipsOk) faltando.push("vídeo");

  return faltando.length ? { ok: false, faltando } : { ok: true, faltando: [] };
}

// ─── LOOP DE CORREÇÃO (ordem do dono 15/08) ──────────────────────────────────
// "o trabalho deve ser 100% efetivado, se faltar algo ele tem que corrigir,
// tem que criar um looping em cada uma das travas… está conferido 100% siga a
// proxima etapa, não está volte e refaça, até finalir." O teste real pegou a
// trava barrando `faltou: imagens` e o dono reprovou o comportamento passivo:
// faltou → o motor CORRIGE (chama o corretor injetado para os componentes
// ausentes) e RE-CONFERE até 100% (ou teto de tentativas / sem progresso).
// Fail-closed no fim: não resolveu → ok:false (o catchup redispara a vaga).
//
// `corrigir(faltando, props, caption)` é injetado (testável): devolve
// `{ props?, caption? }` atualizados (novo estado), ou null se não resolveu.
// A parada "sem progresso" impede loop infinito (e re-pagar o mesmo componente).

/** @param {object} props
 *  @param {string} caption
 *  @param {(faltando: string[], props: object, caption: string) => Promise<{props?: object, caption?: string}|null>} corrigir
 *  @param {number} maxTentativas */
async function corrigirAtePronto(props, caption, corrigir, maxTentativas = 3) {
  const log = [];
  let tentativas = 0;
  let v = reelPronto(props, caption);
  while (!v.ok && tentativas < maxTentativas) {
    const antes = v.faltando;
    let r = null;
    try {
      r = await corrigir(antes, props, caption);
    } catch (e) {
      log.push(`corretor falhou: ${e && e.message ? e.message : String(e)}`);
      break;
    }
    if (r) {
      if (r.props && typeof r.props === "object") props = r.props;
      if (typeof r.caption === "string") caption = r.caption;
    }
    tentativas++;
    v = reelPronto(props, caption);
    const depois = v.faltando;
    if (JSON.stringify(depois) === JSON.stringify(antes)) {
      log.push(`sem progresso na tentativa ${tentativas} — ainda falta: ${depois.join(", ")}`);
      break;
    }
    log.push(`tentativa ${tentativas}: ${depois.length ? "re-conferiu, ainda falta " + depois.join(", ") : "100% pronto"}`);
  }
  return { ok: v.ok, faltando: v.faltando, tentativas, log, props, caption };
}

// ─── TRAVA DA PEÇA RENDERIZADA (18/08/2026) ───────────────────────────────────
// POR QUE EXISTE: em 18/08 um Reel BR foi ao ar com a voz terminando aos 24,7 s de um
// vídeo de 31,0 s — 5,5 s finais em silêncio (medido: −47 dB) — e com a manchete
// desenhando `<<` no lugar das aspas. TODOS os robôs estavam verdes. Eles estavam
// verdes porque `reelPronto` mede PRESENÇA (o campo existe?) e ninguém media a PEÇA
// PRONTA. Presença não é qualidade: um mp3 de silêncio preenche `narrationUrl`.
//
// Estas funções são PURAS de propósito (recebem medidas, não abrem arquivo): o script
// que roda o ffmpeg fica de fora, e o teste fixa a regra sem depender de binário.

/** Quanto tempo de fim mudo uma peça pode ter. Acima disto, quem assiste ouve a peça morrer. */
const CAUDA_MUDA_MAX_S = 2.5;
/**
 * Abaixo deste nível não há som ÚTIL no celular.
 *
 * O número saiu da medição do Reel que o dono reprovou, não de tabela: a fala dele vive
 * entre −13 e −22 dB, e os 5,5 s finais — que ele ouviu como "a voz cortada" — ficaram
 * entre −36 e −48 dB (a cama musical em 0,07, o ducking da voz, tocando sozinha). Um piso
 * de −40 dB deixaria essa cauda passar como "tem som"; −32 dB separa fala de sussurro
 * inaudível, e é o mesmo piso que o revisor de voz da casa usa para "voz baixa demais"
 * (.claude/lib/revisao/audio.mjs).
 */
const SILENCIO_DB = -32;

/**
 * A peça renderizada está publicável?
 *
 * @param {{duracaoS?: number, temAudio?: boolean, caudaMudaS?: number|null, picoDb?: number|null}} medida
 * @param {{title?: unknown, slides?: unknown, caption?: unknown}} [texto]
 * @returns {{ok: boolean, achados: string[], corrigivelNoTexto: boolean}}
 */
function renderPublicavel(medida, texto = {}) {
  const achados = [];
  let corrigivelNoTexto = false;
  const m = medida && typeof medida === "object" ? medida : {};

  if (!(Number(m.duracaoS) > 0)) achados.push("não consegui medir a duração do vídeo");
  if (m.temAudio === false) achados.push("a peça NÃO tem trilha — iria ao ar muda");
  if (m.picoDb !== null && m.picoDb !== undefined && Number(m.picoDb) <= SILENCIO_DB) {
    achados.push(`a trilha existe mas é silenciosa (pico ${m.picoDb} dB)`);
  }
  if (m.caudaMudaS !== null && m.caudaMudaS !== undefined && Number(m.caudaMudaS) > CAUDA_MUDA_MAX_S) {
    achados.push(
      `os últimos ${Number(m.caudaMudaS).toFixed(1)}s da peça estão mudos (abaixo de ${SILENCIO_DB} dB) — ` +
        `quem assiste ouve a peça morrer antes de acabar`,
    );
  }

  // Tipografia que a fonte da peça desenha errado. É corrigível SEM re-gerar nada:
  // basta trocar o caractere e renderizar de novo.
  const alvos = [texto.title, ...(Array.isArray(texto.slides) ? texto.slides : []), texto.caption];
  const torto = alvos.filter((t) => typeof t === "string" && /[«»‹›]/.test(t));
  if (torto.length) {
    corrigivelNoTexto = true;
    achados.push(`texto com aspas que a fonte da peça desenha como \`<<\` (${torto.length} trecho(s))`);
  }

  return { ok: achados.length === 0, achados, corrigivelNoTexto };
}

/** Troca o que a fonte desenha mal. Irmã de `normalizarTipografia` do site (src/lib/texto-limpo.ts). */
function normalizarTipografia(texto) {
  if (typeof texto !== "string" || !texto) return texto;
  return texto.replace(/[«‹]/g, "“").replace(/[»›]/g, "”");
}

module.exports = { hasVisualMedia, reelPronto, corrigirAtePronto, renderPublicavel, normalizarTipografia, CAUDA_MUDA_MAX_S, SILENCIO_DB };
