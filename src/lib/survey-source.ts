// ─── Origem da resposta da pesquisa (marcação de campanha) ───────────────────
// Grava DE ONDE veio quem respondeu — só rótulo de campanha (utm_*), nunca nada
// que identifique a pessoa. O termo de participação continua verdadeiro: "não
// coleta nome, telefone nem qualquer identificador"; `ig / cpc / pesquisa-br-01`
// não é identificador, é etiqueta de anúncio.
//
// Por que existe: com anúncio pago rodando, "chegaram 40 respostas" não serve —
// o dono precisa saber QUAL criativo trouxe as 40. O Pixel da Meta responde isso
// do lado da Meta; esta coluna responde do lado de casa (o painel), inclusive
// quando o Pixel não estiver ligado.
//
// Chaves curtas no banco (s/m/c/n) porque o jsonb repete a chave em CADA linha.

export type SurveySource = {
  /** utm_source — de onde veio (ig, fb, tiktok, yt…). */
  s?: string;
  /** utm_medium — como veio (cpc, bio, stories, organico…). */
  m?: string;
  /** utm_campaign — qual campanha. */
  c?: string;
  /** utm_content — qual criativo/variação (A/B do card). */
  n?: string;
};

/** Teto por etiqueta — corta lixo/abuso sem podar nome de campanha real. */
export const SOURCE_TAG_MAX_LEN = 60;

/** Rótulo de quem chegou sem nenhuma marcação (link direto, orgânico, bio antiga). */
export const SOURCE_DIRECT_LABEL = "direto";

/**
 * Uma etiqueta de campanha vira minúscula, sem espaço e sem caractere exótico.
 * Qualquer coisa fora de [a-z0-9._-] vira "-"; sobra vazia → null (não grava).
 */
export function sanitizeTag(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, SOURCE_TAG_MAX_LEN);
  return clean === "" ? null : clean;
}

type RawSource = Record<string, unknown>;

/**
 * Normaliza o que chegou do cliente para o objeto que vai ao banco.
 * Aceita as duas formas: `{ utm_source, utm_medium, utm_campaign, utm_content }`
 * (como vem da URL) e `{ s, m, c, n }` (como já está gravado). Nada além disso
 * entra — chave desconhecida é ignorada, valor inválido some.
 */
export function normalizeSource(input: unknown): SurveySource {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return {};
  const raw = input as RawSource;
  const out: SurveySource = {};
  const s = sanitizeTag(raw.utm_source ?? raw.s ?? raw.src);
  const m = sanitizeTag(raw.utm_medium ?? raw.m);
  const c = sanitizeTag(raw.utm_campaign ?? raw.c);
  const n = sanitizeTag(raw.utm_content ?? raw.n);
  if (s) out.s = s;
  if (m) out.m = m;
  if (c) out.c = c;
  if (n) out.n = n;
  return out;
}

/** Lê a marcação da query string da página (cliente). `?src=` funciona como atalho. */
export function readSourceFromQuery(search: string): SurveySource {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  } catch {
    return {};
  }
  return normalizeSource({
    utm_source: params.get("utm_source") ?? params.get("src"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
  });
}

// ─── País da resposta ────────────────────────────────────────────────────────
// Código ISO-3166-1 alfa-2 (BR, PT, MX, AR…), lido do cabeçalho de geolocalização
// que a Vercel põe na requisição. O IP **não** é lido nem gravado em lugar nenhum:
// guarda-se só o país, que é grosso demais para identificar alguém — e é o corte
// que a análise precisa (o mesmo espanhol responde diferente no México e na
// Espanha; sem país, ES vira um bloco só).

/** Rótulo de quando a plataforma não informou o país (dev local, proxy sem geo). */
export const COUNTRY_UNKNOWN = "??";

/** Normaliza para AA maiúsculo; qualquer outra coisa → null (grava NULL). */
export function normalizeCountry(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/** Lê o país dos cabeçalhos da requisição (Vercel; Cloudflare como reserva). */
export function countryFromHeaders(headers: Headers): string | null {
  return (
    normalizeCountry(headers.get("x-vercel-ip-country")) ??
    normalizeCountry(headers.get("cf-ipcountry")) ??
    null
  );
}

/** Chave estável de agrupamento no painel — "ig / cpc / pesquisa-br-01". */
export function sourceKey(src: SurveySource | null | undefined): string {
  if (!src) return SOURCE_DIRECT_LABEL;
  const parts = [src.s, src.m, src.c, src.n].filter((p): p is string => !!p);
  return parts.length === 0 ? SOURCE_DIRECT_LABEL : parts.join(" / ");
}
