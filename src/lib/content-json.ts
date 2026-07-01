// Parser robusto do JSON que o haiku devolve em generateContent.
// O modelo às vezes embrulha a saída em prosa ou em ```backticks```; extraímos
// o objeto do primeiro "{" ao último "}" e parseamos. Se ainda assim o JSON
// vier estruturalmente malformado (ex.: aspas não escapadas no meio de uma
// string), o JSON.parse lança — e o chamador (generateContent) RETENTA a
// geração, que normalmente resolve. Antes isso quebrava o post silenciosamente.
export function parseContentJson<T = unknown>(raw: string): T {
  const noFences = raw.replace(/```json|```/g, "").trim();
  const start = noFences.indexOf("{");
  const end = noFences.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? noFences.slice(start, end + 1) : noFences;
  return JSON.parse(candidate) as T;
}

// ─── Normalização do conteúdo gerado (bug C4) ────────────────────────────────
// O JSON.parse devolve o objeto CRU: se o haiku OMITE um campo (ex.: sem "tags"),
// o downstream lançava — `content.tags[0]` dá TypeError ANTES do `?? kw` e derruba
// a VAGA INTEIRA no catch (não publica). Aqui coagimos só o TIPO (array/string) dos
// campos que o pipeline consome, para o acesso nunca lançar. NÃO inventa conteúdo:
// campo ausente vira vazio; a qualidade é decidida por missingEssentialContent.
const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export interface NormalizedContent {
  postTitle: string;
  postBody: string;
  slides: string[];
  cta: string;
  instagramCaption: string;
  tags: string[];
  videoQueries?: string[];
  narration?: string;
}

export function normalizeContentJson(obj: unknown): NormalizedContent {
  const o = (obj && typeof obj === "object" ? obj : {}) as Record<string, unknown>;
  const out: NormalizedContent = {
    postTitle: asString(o.postTitle),
    postBody: asString(o.postBody),
    slides: asStringArray(o.slides),
    cta: asString(o.cta),
    instagramCaption: asString(o.instagramCaption),
    tags: asStringArray(o.tags),
  };
  if (o.videoQueries !== undefined) out.videoQueries = asStringArray(o.videoQueries);
  if (typeof o.narration === "string") out.narration = o.narration;
  return out;
}

// Campos ESSENCIAIS ausentes/vazios após normalizar → conteúdo NÃO-publicável (o
// chamador REGENERA em vez de publicar um carrossel vazio/quebrado). `tags` pode ser
// vazio (cai no kw); videoQueries/narration são opcionais. Devolve a lista do que falta.
export function missingEssentialContent(c: { postTitle: string; slides: string[]; cta: string }): string[] {
  const miss: string[] = [];
  if (!c.postTitle.trim()) miss.push("postTitle");
  if (c.slides.length === 0) miss.push("slides");
  if (!c.cta.trim()) miss.push("cta");
  return miss;
}
