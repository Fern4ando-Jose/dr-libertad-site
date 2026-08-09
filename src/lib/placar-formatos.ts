// ─── O ANALISTA DE MÉTRICAS — o placar por FORMATO ───────────────────────────
// POR QUE EXISTE (2026-08-09): a biblioteca de formatos nasceu com uma regra dura —
// *"formato que não performa é DESCARTADO, não melhorado; a biblioteca madura é uma lista
// de sobreviventes"*. Isso é impossível sem medir por formato: até aqui o cargo
// `analista-de-metricas` existia na casa e nunca encostou numa peça publicada, porque ele
// roda no Claude Code e quem publica é o site.
//
// A régua NÃO é curtida. É **alcance** e, principalmente, **envio no direct** — o sinal que
// o Instagram premia em 2026 e que vale 3 a 5 vezes a curtida. Curtida entra só como ruído
// de contexto.
//
// ⚠️ NUNCA estimar: se o número não veio da plataforma, ele não entra no placar. Linha sem
// métrica aparece como `semDados`, não como zero — zero é uma medição, ausência não é.

export interface LinhaPlacar {
  formato: string;
  pecas: number;
  alcance: number | null;
  envios: number | null;
  curtidas: number | null;
  /** peças cuja métrica ainda não voltou da plataforma */
  semDados: number;
}

interface RegistroPeca {
  formato: string | null;
  reach?: number | null;
  shares?: number | null;
  likes?: number | null;
}

/**
 * Agrega as peças por formato. Função PURA — quem busca no banco/Graph é quem chama, para
 * que o placar seja testável sem rede e sem chave.
 */
export function montarPlacar(pecas: RegistroPeca[]): LinhaPlacar[] {
  const mapa = new Map<string, LinhaPlacar>();
  for (const p of pecas) {
    const f = (p.formato || "").trim();
    if (!f) continue; // peça anterior ao carimbo de formato — não inventa categoria
    if (!mapa.has(f)) mapa.set(f, { formato: f, pecas: 0, alcance: null, envios: null, curtidas: null, semDados: 0 });
    const l = mapa.get(f)!;
    l.pecas++;
    const temAlgo = p.reach != null || p.shares != null || p.likes != null;
    if (!temAlgo) { l.semDados++; continue; }
    if (p.reach != null) l.alcance = (l.alcance ?? 0) + p.reach;
    if (p.shares != null) l.envios = (l.envios ?? 0) + p.shares;
    if (p.likes != null) l.curtidas = (l.curtidas ?? 0) + p.likes;
  }
  // Ordena pelo que decide: envios por peça, depois alcance por peça. Formato sem nenhuma
  // medição vai para o fim — não é "o pior", é o desconhecido.
  return [...mapa.values()].sort((a, b) => {
    const ea = a.envios != null && a.pecas ? a.envios / a.pecas : -1;
    const eb = b.envios != null && b.pecas ? b.envios / b.pecas : -1;
    if (eb !== ea) return eb - ea;
    const aa = a.alcance != null && a.pecas ? a.alcance / a.pecas : -1;
    const ab = b.alcance != null && b.pecas ? b.alcance / b.pecas : -1;
    return ab - aa;
  });
}

/** Quantas peças um formato precisa antes de o placar dele valer alguma coisa. */
export const MINIMO_PARA_JULGAR = 6;

/**
 * O veredito por formato. `manter` | `observar` | `descartar` — e NUNCA "descartar" sem
 * amostra: reprovar um formato com 2 peças é ler ruído como sinal.
 */
export function veredito(l: LinhaPlacar, medianaEnviosPorPeca: number): "manter" | "observar" | "descartar" {
  if (l.pecas < MINIMO_PARA_JULGAR || l.envios == null) return "observar";
  const porPeca = l.envios / l.pecas;
  if (porPeca >= medianaEnviosPorPeca) return "manter";
  return porPeca < medianaEnviosPorPeca * 0.5 ? "descartar" : "observar";
}

/** Mediana de envios por peça entre os formatos que TÊM medição. */
export function medianaEnvios(linhas: LinhaPlacar[]): number {
  const vals = linhas.filter((l) => l.envios != null && l.pecas > 0).map((l) => l.envios! / l.pecas).sort((a, b) => a - b);
  if (!vals.length) return 0;
  const meio = Math.floor(vals.length / 2);
  return vals.length % 2 ? vals[meio] : (vals[meio - 1] + vals[meio]) / 2;
}
