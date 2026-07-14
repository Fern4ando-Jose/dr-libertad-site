// ─── Trava anti-duplicata na CAMADA DE SAÍDA (o texto gerado, não a semente) ────
// As demais travas (topicUsedInOtherVaga, shuffle bag) comparam a SEMENTE do tema
// (`topic`, em espanhol). Mas o modelo (haiku) pode gerar, a partir de DUAS sementes
// DIFERENTES, o MESMO título palavra-por-palavra — e aí NADA barrava, porque as
// sementes diferiam. Foi o caso real: "Você ama ou tem medo de ficar sozinho?" saiu
// em 11/07 (Reel, tema "Amar es presentarse") e de novo em 14/07 (carrossel, tema "El
// amor se construye…") — 3 dias, título idêntico. Esta trava olha o TÍTULO gerado e,
// se ele repete um publicado recente, força a regeneração com outro ângulo.
// Funções puras → testáveis por invariante; o fetch é best-effort/fail-open.

import { normalizePhrase } from "./slide-dedup";

// Tokens significativos do título normalizado (para similaridade). PURA.
function tokens(s: string): Set<string> {
  return new Set(normalizePhrase(s).split(" ").filter(Boolean));
}

// Similaridade de Jaccard por token (0..1): interseção / união. Robusta a pequenas
// variações ("Você ama ou tem medo…" ≈ "Ama ou tem medo…"). PURA/testável.
export function titleSimilarity(a: string, b: string): number {
  const ta = tokens(a), tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

// O título candidato COLIDE com algum título recente? Colisão = normalizado IDÊNTICO
// (palavra-por-palavra, ignorando acento/pontuação/caixa) OU similaridade de tokens ≥
// `threshold` (quase-igual). Título vazio nunca colide. PURA/testável.
export const TITLE_SIM_THRESHOLD = 0.8;
export function titleCollides(candidate: string, recent: readonly string[], threshold = TITLE_SIM_THRESHOLD): boolean {
  const cn = normalizePhrase(candidate);
  if (!cn) return false;
  for (const r of recent) {
    if (!r) continue;
    if (normalizePhrase(r) === cn) return true;            // igual palavra-por-palavra
    if (titleSimilarity(candidate, r) >= threshold) return true; // quase-igual
  }
  return false;
}

// Títulos GERADOS nos últimos `days` dias no idioma `lang`. Fonte: `content_cache`
// (o JSON gerado de reel E carrossel guarda `postTitle`) — é a ÚNICA fonte que cobre
// os DOIS formatos (os Reels não entram em `posts`). Usar o cache é conservador (inclui
// alguma geração que não publicou) → no pior caso regeneramos um título à toa, o que é
// barato e raro. Fail-open: erro/sem tabela → [] (volta ao comportamento anterior, sem
// a trava). A janela default (12d) cobre o gap típico entre repetições de sentido.
export async function recentTitlesForLang(lang: string, days = 12): Promise<string[]> {
  try {
    const { sql } = await import("@vercel/postgres");
    const r = await sql<{ title: string }>`
      SELECT DISTINCT content->>'postTitle' AS title
      FROM content_cache
      WHERE lang = ${lang}
        AND content->>'postTitle' IS NOT NULL
        AND created_at > NOW() - (${days} || ' days')::interval
    `;
    return r.rows.map((x) => x.title).filter(Boolean);
  } catch {
    return [];
  }
}
