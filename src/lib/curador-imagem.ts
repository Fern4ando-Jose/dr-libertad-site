// ─── O CURADOR DE IMAGENS — a foto tem de conversar com a frase ──────────────
// POR QUE EXISTE (2026-08-09): a capa do acervo passou a escolher a foto pelo PILAR do tema
// (liberdade, ansiedade, mente…). Pilar é assunto grosso: para a frase "você tem direito de
// falar" ele devolveu um paredão de pedra. O cargo `curador-de-imagens` existia na casa e
// nunca encostou numa peça publicada — porque ele roda no Claude Code, e quem publica é o
// site. Este módulo é o crivo dele DENTRO da linha: entre as fotos do pilar, escolhe a que
// tem o mesmo SUJEITO da frase.
//
// Custo: uma chamada curta (a frase + até 12 descrições), ~US$ 0,001. Fail-open: qualquer
// falha devolve a escolha determinística de antes — nunca deixa a peça sem capa.

import { FOOTAGE_LIBRARY } from "@/lib/footage-library";
import { isPhotoUrl } from "@/lib/footage-media";
import { anthropicCost, logSpend, type Automation } from "@/lib/spend";

const MODELO = "claude-haiku-4-5-20251001";

interface Candidata {
  url: string;
  descricao: string;
}

function candidatasDoPilar(cat: string): Candidata[] {
  const lista = FOOTAGE_LIBRARY[cat as keyof typeof FOOTAGE_LIBRARY] ?? [];
  const out: Candidata[] = [];
  for (const c of lista) {
    const url = c.poster || (isPhotoUrl(c.url) ? c.url : "");
    if (url) out.push({ url, descricao: c.why || "sem descrição" });
  }
  return out;
}

/**
 * Escolhe, entre as fotos do pilar, a que casa com a FRASE da capa.
 * Devolve `null` quando não pôde decidir — quem chama mantém a escolha determinística.
 */
export async function curarCapa(
  cat: string,
  frase: string,
  opts: { automation: Automation }
): Promise<string | null> {
  const cands = candidatasDoPilar(cat);
  if (cands.length < 2) return cands[0]?.url ?? null;

  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) return null;

  const lista = cands.map((c, i) => `${i + 1}. ${c.descricao}`).join("\n");
  const p = `A capa de um post vai levar esta frase:

"${frase}"

Abaixo, fotos disponíveis (só a descrição do que aparece em cada uma):
${lista}

Escolha a ÚNICA que melhor sustenta a frase. Critério, nesta ordem:
1. O SUJEITO da foto é o sujeito da frase (se a frase fala de gente, a foto tem gente; se fala
   de silêncio ou solidão, a foto mostra alguém só — não paisagem vazia).
2. A cena tem tensão ou gesto humano, não é cartão-postal.
3. Não é literal a ponto de virar ilustração óbvia da palavra.

Responda SÓ com o número da escolhida. Nada além do número.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": chave, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODELO, max_tokens: 8, messages: [{ role: "user", content: p }] }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    await logSpend({
      automation: opts.automation,
      platform: "anthropic",
      operation: "curadoria-imagem",
      model: MODELO,
      units: (data?.usage?.input_tokens ?? 0) + (data?.usage?.output_tokens ?? 0),
      costUsd: anthropicCost(MODELO, data?.usage),
    });
    const n = parseInt(String(data?.content?.[0]?.text ?? "").replace(/\D+/g, ""), 10);
    if (!Number.isFinite(n) || n < 1 || n > cands.length) return null;
    return cands[n - 1].url;
  } catch {
    return null;
  }
}
