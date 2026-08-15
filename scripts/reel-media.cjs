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

module.exports = { hasVisualMedia, reelPronto };
