// ─── Detector de DADOS FABRICADOS (item 3, conteúdo 2026-07-01) ───────────────
// Posts reais citavam "89% según la Universidad de Boston", anos, "1 de cada 3",
// números de suicídio — ESTATÍSTICAS INVENTADAS numa marca de psicologia (risco de
// credibilidade). A regra CREDIBILIDAD do prompt já proíbe, mas o haiku fura → este é
// o detector determinístico (estilo lang-guard) que BLOQUEIA a publicação.
//
// PRESERVA A VOZ: número concreto de COMPORTAMENTO como gancho ("revisas el móvil 144
// veces al día") é PERMITIDO — só dispara em ATRIBUIÇÃO DE AUTORIDADE: porcentagem,
// ano/data, "X de cada Y", instituição nomeada, ou "según un estudio / los estudios
// dicen / pesquisa mostra". Alta precisão de propósito (falso positivo = vaga perdida).

const PATTERNS: { name: string; re: RegExp }[] = [
  // Porcentagem: "89%", "67 %" (a regra 320 já proíbe porcentagens).
  { name: "porcentagem", re: /\d+(?:[.,]\d+)?\s?%/ },
  // Ano/data concreta (a regra pede frase ATEMPORAL): 1900–2099 como token isolado.
  { name: "ano/data", re: /\b(?:19|20)\d{2}\b/ },
  // "1 de cada 3", "uno de cada 5", "um a cada 4".
  { name: "X de cada Y", re: /\b(?:\d+|un[oa]?|um[a]?)\s+(?:de|a)\s+cada\s+\d+/i },
  // Instituição/fonte NOMEADA (a atribuição é o que fabrica autoridade).
  { name: "instituição", re: /\b(?:universidad|university|universidade|harvard|stanford|yale|oxford|cambridge|princeton|pew|gallup|nielsen|statista|kinsey|oms|who|unicef|ibge|ibope|cdc)\b/i },
  // Atribuição a estudo/pesquisa (com contexto — não a palavra solta, p/ evitar falso +).
  { name: "atribuição de estudo", re: /\bseg[úu]n\s+(?:un|el|los|una|la)\b|\blos\s+estudios\s+(?:dicen|muestran|demuestran|indican|revelan)|\bun\s+estudio\s+(?:dice|muestra|demuestra|revel|encontr|de\b)|\buna\s+investigaci[óo]n\b|research\s+(?:shows|says|finds|suggests)|studies\s+show|\bestudos?\s+(?:dizem|mostram|apontam|indicam|comprovam|revelam)|\bpesquisas?\s+(?:dizem|mostram|apontam|revelam|indicam)|\bas\s+estat[íi]sticas\b|\bdados\s+(?:mostram|apontam|dizem|revelam)/i },
];

// Varre UM texto e devolve os rótulos dos sinais encontrados. PURA/testável.
export function scanForFabricatedStats(text: unknown): string[] {
  const s = typeof text === "string" ? text : "";
  const out: string[] = [];
  for (const p of PATTERNS) {
    const m = s.match(p.re);
    if (m) out.push(`${p.name}: "${m[0].trim()}"`);
  }
  return out;
}

export interface StatHit { field: string; match: string }

// Varre os campos que VÃO AO FEED (título, slides, cta, legenda). postBody/videoQueries
// ficam de fora (não são texto publicado). Devolve os hits p/ a nota de regeneração.
export function scanContentForFabricatedStats(content: {
  postTitle?: unknown; slides?: unknown; cta?: unknown; instagramCaption?: unknown;
}): StatHit[] {
  const hits: StatHit[] = [];
  const push = (field: string, text: unknown) => {
    for (const m of scanForFabricatedStats(text)) hits.push({ field, match: m });
  };
  push("postTitle", content.postTitle);
  const slides = Array.isArray(content.slides) ? content.slides : [];
  slides.forEach((s, i) => push(`slide${i + 1}`, s));
  push("cta", content.cta);
  push("instagramCaption", content.instagramCaption);
  return hits;
}

// Resumo curto dos hits p/ a nota de correção no prompt.
export function summarizeStatHits(hits: StatHit[]): string {
  return hits.map((h) => `${h.field} (${h.match})`).join("; ");
}
