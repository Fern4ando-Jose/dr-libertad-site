// ─── Redator → ReelPassos: mapeamento do formato ATUAL (title+slides+cta) para
//     o formato que a composição ReelPassos consome (steps[] + cta) ────────────
//
// O redator (`generateContent`, api/publish/route.ts) continua gerando EXATAMENTE
// o mesmo formato de sempre — title, slides, cta — porque é ELE que passa pelo
// revisor editorial, pela guarda §8 (a polêmica do dia) e pela trava anti-idioma
// (lang-guard.ts). Reescrever o prompt para "nascer em steps" duplicaria essa
// trilha inteira sem necessidade: o caminho mais simples é um MAPEAMENTO puro,
// sem estado, aplicado DEPOIS que o texto já passou por tudo isso — título vira
// o 1º passo, cada slide vira um passo, e o cta (já gerado) é o bloco final.
//
// CommonJS de propósito (mesmo padrão de reel-media.cjs/pick-music.cjs): o
// workflow chama via `require()` sem build de TS; o teste usa a MESMA função.

/**
 * @param {{title?: unknown, slides?: unknown, cta?: unknown}} content
 * @returns {{steps: {text: string}[], cta: string}}
 */
function mapContentToPassosSteps(content) {
  const c = content && typeof content === "object" ? content : {};
  const title = typeof c.title === "string" ? c.title.trim() : "";
  const slides = Array.isArray(c.slides)
    ? c.slides.filter((s) => typeof s === "string" && s.trim() !== "").map((s) => s.trim())
    : [];
  const cta = typeof c.cta === "string" ? c.cta.trim() : "";

  const steps = [];
  if (title) steps.push({ text: title });
  for (const s of slides) steps.push({ text: s });

  return { steps, cta };
}

module.exports = { mapContentToPassosSteps };
