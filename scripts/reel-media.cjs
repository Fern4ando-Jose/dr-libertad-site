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

module.exports = { hasVisualMedia, reelPronto, corrigirAtePronto };
