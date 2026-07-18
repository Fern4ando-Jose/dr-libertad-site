// ─── QA de CONTEÚDO do footage (incidente 2026-07-01) ─────────────────────────
// Um Reel PT saiu com clipes de MACRO de pele/textura (aspecto de nudez). O footage
// (Pexels) não tinha NENHUM QA: pegava o 1º vídeo retrato ≥4s por termo (só filtrava
// orientação/duração), e a grade quente/vintage amplifica pele → borrão impróprio.
// A ilustração já tinha QA de visão; o footage não. Aqui está o juiz que faltava:
// olha o POSTER do clipe (Pexels expõe `video.image`, barato — sem baixar o mp4) e
// REJEITA close extremo de pele/corpo, textura abstrata sem cena, ou aspecto NSFW.
//
// Reputacional (marca de psicologia) → FAIL-SAFE: com a chave presente, veredito
// ilegível ou erro de API = REJEITA (descarta o clipe, tenta o próximo; se todos
// caírem, o Reel usa a ilustração estática — fallback que já existe). SEM a chave
// (config), o QA é PULADO (aceita) p/ não degradar TODO Reel — a trava de prompt
// (videoQueries endurecido) ainda reduz o risco. Espelhado em scripts/fetch-footage.mjs
// (que roda no CI e não importa TS) — manter os dois em sincronia.
import { type Automation, anthropicCost, logSpend } from "@/lib/spend";
import type { FootageClip } from "@/lib/footage-library";

// Visão BARATA: o check é grosseiro (é pele/corpo/textura/NSFW?), não conta dedos como
// a ilustração → Haiku basta (~US$0,005/imagem). Modelo na tabela de preços de spend.ts.
const QA_MODEL = "claude-haiku-4-5-20251001";

// QUEM aparece no quadro — MESMO vocabulário do campo `who` da whitelist curada
// (footage-library.ts) para que a MESMA regra pura (footage-subject.ts) case o clipe
// com o sujeito do tema, venha ele da whitelist ou da busca ao vivo.
export type FootageWho = NonNullable<FootageClip["who"]>;
const WHO_VALUES: ReadonlySet<string> = new Set(["man", "woman", "couple", "group", "none"]);

export interface FootageVerdict {
  reject: boolean;
  reason: string;
  // Sujeito do quadro. `undefined` = o juiz não disse (veredito antigo do cache, QA
  // pulado por falta de chave, ou valor fora do vocabulário) → o CHAMADOR decide o que
  // fazer com o desconhecido. Na whitelist curada "não classificado" é fail-open; no
  // material AO VIVO é fail-closed (ver liveClipMatchesTheme em footage-subject.ts).
  who?: FootageWho;
}

// 2026-07-17: o juiz passou a dizer também QUEM está no quadro. Motivo: a busca ao vivo
// entrou no caminho NORMAL (FOOTAGE_LIVE_SLOTS, ver reel-shared.ts) e ela não tem curadoria
// humana — sem saber o sujeito, um tema `man` receberia mulher da busca e o defeito da ed.
// 164 voltaria pela porta dos fundos. O `who` viaja na MESMA chamada do reject (mesma
// imagem, mesmo request) → **custo adicional ZERO**: ~15 tokens de saída a mais, nada de
// 2ª chamada. E é resposta do CLIPE, não do tema → cacheável por (source,id) para sempre,
// sem envenenar o cache (um "who" nunca depende de qual tema perguntou).
export const FOOTAGE_QA_PROMPT = `You review a single stock-video POSTER FRAME for a serious mental-health / psychology Instagram brand.
Answer ONLY with JSON: {"reject": boolean, "reason": "<=8 words", "who": "man"|"woman"|"couple"|"group"|"none"}.
Set reject=true if the frame is ANY of:
- an extreme close-up of bare skin or body parts (arm, leg, torso, lips, etc.) filling the frame;
- an abstract skin/flesh/body texture with no clear scene or subject;
- nudity, lingerie, or sexually suggestive content;
- a child or teenager (anyone who looks under ~18) as a subject in the frame;
- anything a psychology brand would be embarrassed to post.
Set reject=false only for a clear, tasteful scene with a discernible ADULT subject in context (a person doing something, a place, an object, nature).
When in doubt, reject=true.
"who" describes WHO is visible in the frame (answer it even when reject=true):
- "man": exactly one adult man, alone;
- "woman": exactly one adult woman, alone;
- "couple": exactly two people together;
- "group": three or more people;
- "none": no person at all (object, place, nature), OR the person's gender is NOT clearly discernible (silhouette, back turned, hands only, blurred, too far away).
Use "none" whenever you are not sure of the gender — never guess.`;

// Parser PURO do veredito. FAIL-SAFE: JSON ilegível → REJEITA (melhor descartar um
// clipe do que publicar conteúdo impróprio). PURA/testável.
export function parseFootageVerdict(text: unknown): FootageVerdict {
  const s = typeof text === "string" ? text : "";
  try {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const o = JSON.parse(s.slice(start, end + 1)) as { reject?: unknown; reason?: unknown; who?: unknown };
      if (typeof o.reject === "boolean") {
        // `who` é OPCIONAL e sanitizado: valor fora do vocabulário (ou ausente, como nos
        // vereditos gravados antes de 2026-07-17) vira `undefined` — nunca uma string solta
        // que o filtro de sujeito interpretaria errado.
        const who = typeof o.who === "string" && WHO_VALUES.has(o.who) ? (o.who as FootageWho) : undefined;
        return { reject: o.reject, reason: typeof o.reason === "string" ? o.reason : "", who };
      }
    }
  } catch { /* cai no fail-safe abaixo */ }
  return { reject: true, reason: "veredito ilegível → rejeitado (fail-safe)" };
}

// Julga o POSTER (frame) de um clipe Pexels. FAIL-SAFE (chave presente): erro/HTTP ruim
// → reject. FAIL-OPEN (config): sem ANTHROPIC_API_KEY → aceita (QA pulado). Sem poster
// → aceita (nada a verificar). Loga o gasto no balde `automation`.
//
// `paid` (2026-07-18, incidente "El sabio ausente"): diz se esta chamada FOI COBRADA.
// Só a resposta 200 da API custa dinheiro (tokens billados — inclusive quando o JSON
// vem ilegível); "sem chave", "sem poster", HTTP !ok e exceção de rede custam ZERO.
// Antes o chamador (selectFootage) contava TODO veredito não-cacheado contra o teto de
// 12 julgamentos PAGOS — 12 erros gratuitos em série (ex.: poster inválido da Pixabay)
// matavam o harvest em silêncio e o Reel caía na whitelist repetida. Agora o teto pago
// conta SÓ o que `paid` diz que custou (P2: o teto é de DINHEIRO, não de tentativas).
export async function judgeFootagePoster(
  posterUrl: string | undefined,
  apiKey: string | undefined,
  automation: Automation,
  meta?: Record<string, unknown>,
): Promise<FootageVerdict & { paid: boolean }> {
  if (!apiKey) return { reject: false, reason: "sem ANTHROPIC_API_KEY — QA pulado", paid: false };
  if (!posterUrl) return { reject: false, reason: "sem poster — QA pulado", paid: false };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: QA_MODEL,
        max_tokens: 100,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: posterUrl } },
            { type: "text", text: FOOTAGE_QA_PROMPT },
          ],
        }],
      }),
    });
    if (!res.ok) return { reject: true, reason: `QA HTTP ${res.status} → rejeitado (fail-safe)`, paid: false };
    const data = await res.json();
    await logSpend({ automation, platform: "anthropic", operation: "footage-qa", model: QA_MODEL, units: (data?.usage?.input_tokens ?? 0) + (data?.usage?.output_tokens ?? 0), costUsd: anthropicCost(QA_MODEL, data?.usage), meta });
    return { ...parseFootageVerdict(data?.content?.[0]?.text), paid: true }; // 200 = cobrado (mesmo se ilegível)
  } catch (e) {
    return { reject: true, reason: `QA erro (${e instanceof Error ? e.message : String(e)}) → rejeitado (fail-safe)`, paid: false };
  }
}

// ── CACHE de veredito por videoId (corta o ralo do QA) ────────────────────────
// O poster de um clipe Pexels é IMUTÁVEL → o veredito vale p/ sempre. Sem cache,
// um clipe rejeitado hoje reaparece na busca de amanhã (mesmos termos por categoria)
// e é re-julgado — pagando de novo (07/07: ~20 vereditos num preview, ~US$0,03/tema,
// espremendo o teto ig-reels de US$0,30). Padrão do repo (illustration_cache/
// content_cache). FAIL-OPEN: erro de banco → julga como antes (o QA nunca é pulado
// por causa do cache; só o PAGAMENTO repetido é evitado).
export function isCacheableVerdictReason(reason: string): boolean {
  // Não cacheia veredito de config ausente/erro transitório/JSON ilegível — um
  // soluço de rede/modelo condenaria o clipe pra sempre. Só o veredito REAL é permanente.
  return !/QA pulado|QA HTTP|QA erro|ilegível/.test(reason);
}

// ⚠️ TOLERANTE À ORDEM DEPLOY×MIGRAÇÃO (2026-07-17). `who` é coluna NOVA (ALTER ... ADD
// COLUMN IF NOT EXISTS em /api/migrate). Se o deploy subir ANTES da migração rodar, uma
// query citando `who` falha inteira → o `catch` devolveria null/silêncio → o CACHE do QA
// sairia do ar sem ninguém ver e cada clipe seria RE-JULGADO (re-pago) todo dia: era
// exatamente o ralo que o cache existe pra tapar (incidente 07/07, teto ig-reels). Por
// isso as duas funções caem para o esquema ANTIGO (sem `who`) quando a coluna não existe:
// o cache continua valendo, só o sujeito fica desconhecido até a migração rodar — e
// sujeito desconhecido, no material ao vivo, é fail-closed (não vira clipe errado).
export async function readFootageVerdictCache(videoId: number): Promise<FootageVerdict | null> {
  try {
    const { sql } = await import("@vercel/postgres");
    try {
      const r = await sql<{ reject: boolean; reason: string; who: string | null }>`
        SELECT reject, reason, who FROM footage_qa_cache WHERE video_id = ${videoId}
      `;
      const row = r.rows[0];
      if (!row) return null;
      // Linha gravada ANTES da migração tem who=NULL → `undefined` (sujeito desconhecido).
      const who = row.who && WHO_VALUES.has(row.who) ? (row.who as FootageWho) : undefined;
      return { reject: row.reject, reason: row.reason ?? "", who };
    } catch {
      // coluna `who` ainda não existe → lê o esquema antigo (cache preservado)
      const r = await sql<{ reject: boolean; reason: string }>`
        SELECT reject, reason FROM footage_qa_cache WHERE video_id = ${videoId}
      `;
      const row = r.rows[0];
      return row ? { reject: row.reject, reason: row.reason ?? "" } : null;
    }
  } catch { return null; }
}

export async function writeFootageVerdictCache(videoId: number, verdict: FootageVerdict): Promise<void> {
  try {
    const { sql } = await import("@vercel/postgres");
    try {
      await sql`
        INSERT INTO footage_qa_cache (video_id, reject, reason, who, ts)
        VALUES (${videoId}, ${verdict.reject}, ${verdict.reason}, ${verdict.who ?? null}, NOW())
        ON CONFLICT (video_id) DO NOTHING
      `;
    } catch {
      // coluna `who` ainda não existe → grava o veredito no esquema antigo
      await sql`
        INSERT INTO footage_qa_cache (video_id, reject, reason, ts)
        VALUES (${videoId}, ${verdict.reject}, ${verdict.reason}, NOW())
        ON CONFLICT (video_id) DO NOTHING
      `;
    }
  } catch { /* fail-open */ }
}

// Juiz com cache: veredito conhecido → devolve sem pagar; desconhecido → julga
// (fail-safe intacto) e grava.
//
// `cached` (2026-07-17) diz se o veredito veio de graça. Quem chama a busca AO VIVO
// (selectFootage) usa isso para contar só os vereditos PAGOS contra o teto de julgamentos
// por Reel — sem esse contador, um pilar em que tudo é rejeitado julgaria até
// 4 fontes × 20 candidatos × 7 rodadas de candidatos NOVOS e sozinho estouraria o balde
// `ig-reels` (US$0,30/dia). Cache hit não custa nada → não consome cota.
export async function judgeFootagePosterCached(
  videoId: number,
  posterUrl: string | undefined,
  apiKey: string | undefined,
  automation: Automation,
): Promise<FootageVerdict & { cached: boolean; paid: boolean }> {
  const hit = await readFootageVerdictCache(videoId);
  if (hit) return { ...hit, cached: true, paid: false }; // de graça: já estava julgado
  const verdict = await judgeFootagePoster(posterUrl, apiKey, automation, { videoId });
  if (isCacheableVerdictReason(verdict.reason)) await writeFootageVerdictCache(videoId, verdict);
  return { ...verdict, cached: false };
}
