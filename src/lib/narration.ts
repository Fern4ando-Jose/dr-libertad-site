// ─── Narração (voz TTS) do Reel — fal.ai / MiniMax Speech-02 HD ──────────────
// Gera a VOZ que narra o Reel a partir do roteiro `narration` (tirado dos slides
// → voz = tela). Voz aprovada pelo dono: "Deep_Voice_Man" (grave/séria), com
// reforço de idioma (Spanish/Portuguese) e texto limpo. A música vira leito suave
// (ducking no ReelV2) sob a voz.
//
// GATED: só roda com REEL_NARRATION_ENABLED=on. Em qualquer falha (sem chave,
// fal caída, idioma sem suporte) devolve null → o Reel renderiza SEM narração
// (comportamento atual), nunca quebra.
//
// Custo: MiniMax HD ~US$0,10/1000 chars (~US$0,028/Reel) + transcrição Scribe
// US$0,03/min (~US$0,014/Reel) = ~US$0,042/Reel. Cache por (tópico,dia,idioma) →
// re-disparo reusa, não repaga. Re-hospeda no Blob (URL permanente).
//
// ─── O ÁUDIO É O RELÓGIO (2026-07-26) ────────────────────────────────────────
// ANTES: o vídeo estimava a própria duração por fórmula de slides e a voz era
// ESPREMIDA (speed 0,85→0,95, via `speedForFit`) pra caber nessa janela. Quando a
// estimativa errava — e errava: pontuação, palavras longas, PT mais verboso que o
// ES — a voz atrasava, embolava a 1ª palavra ou estourava o fim. Foi essa a
// dessincronia que o dono reprovou.
// AGORA: a voz sai em velocidade natural FIXA (0,85 — exatamente a que ele ouviu e
// aprovou no ES), medimos a duração REAL do mp3 (`duration_ms`, que a própria
// MiniMax devolve) e transcrevemos o áudio pra saber ONDE cada palavra caiu. Vídeo,
// cenas e legenda são dimensionados por essa medida (ver src/lib/narration-sync.ts).

import { type Automation, logSpend, checkBudget } from "@/lib/spend";
import type { NarrationWord } from "@/lib/narration-sync";

const FAL_TTS_MODEL = "fal-ai/minimax/speech-02-hd";
const FAL_STT_MODEL = "fal-ai/elevenlabs/speech-to-text"; // Scribe: devolve words[] com start/end
const VOICE_ID = "Deep_Voice_Man";        // aprovado pelo dono (grave/séria) — NÃO trocar sem ele
// Velocidade NATURAL, fixa e igual nos dois idiomas. 0,85 é o valor que o dono
// ouviu e aprovou no ES ("lento o suficiente p/ LER e ouvir"). O antigo teto de
// 0,95 existia só pra espremer texto longo — e era ele que embolava a abertura
// ("público" → "publi e zeco"). Sem janela pra caber, não há por que acelerar:
// texto mais longo agora gera VÍDEO mais longo, nunca voz atropelada.
const SPEED_NATURAL = 0.85;
const COST_PER_1K = 0.10;                   // US$/1000 chars (MiniMax HD)
const STT_COST_PER_MIN = 0.03;              // US$/minuto (ElevenLabs Scribe via fal)

function languageBoost(lang: string): string {
  return lang === "pt" ? "Portuguese" : "Spanish";
}

// Scribe usa ISO 639-3 ("por"/"spa"), não o código de 2 letras do resto do projeto.
function sttLanguageCode(lang: string): string {
  return lang === "pt" ? "por" : "spa";
}

export interface NarrationResult {
  url: string | null;
  error?: string;
  cached?: boolean;
  // Duração REAL do mp3 (medida, não estimada) — é ela que dimensiona o vídeo.
  durationSec?: number;
  // Tempo de CADA palavra falada — trava a legenda na voz. Vazio quando a
  // transcrição falhou: o Reel ainda sai sincronizado pela duração real, só a
  // legenda cai para distribuição proporcional (degrada, não quebra).
  words?: NarrationWord[];
}

function cacheKey(topic: string, day: string, lang: string): string {
  return `${topic}|${day}|${lang}`;
}

// O cache guarda a MEDIDA junto com o áudio (duração real + tempo de cada palavra).
// Sem isso o re-disparo reusaria o mp3 mas perderia a sincronia — e voltaria a
// pagar o Scribe só pra remedir o mesmo áudio.
async function readCachedNarration(
  topic: string, day: string, lang: string,
): Promise<{ url: string; durationSec: number; words: NarrationWord[] } | null> {
  try {
    const { sql } = await import("@vercel/postgres");
    const key = cacheKey(topic, day, lang);
    const rows = await sql<{ url: string; duration_sec: number | null; words: unknown }>`
      SELECT url, duration_sec, words FROM narration_cache
      WHERE cache_key = ${key} AND url <> 'PENDING' AND created_at > NOW() - INTERVAL '48 hours'
      LIMIT 1`;
    const row = rows.rows[0];
    if (!row?.url) return null;
    try { const c = await fetch(row.url, { method: "GET" }); if (!c.ok) return null; } catch { return null; }
    const words = Array.isArray(row.words) ? (row.words as NarrationWord[]) : [];
    return { url: row.url, durationSec: Number(row.duration_sec ?? 0), words };
  } catch {
    return null;
  }
}

async function writeCachedNarration(
  topic: string, day: string, lang: string, url: string, durationSec: number, words: NarrationWord[],
): Promise<void> {
  try {
    const { sql } = await import("@vercel/postgres");
    const key = cacheKey(topic, day, lang);
    const wordsJson = JSON.stringify(words ?? []);
    await sql`
      INSERT INTO narration_cache (cache_key, url, topic, lang, duration_sec, words, created_at)
      VALUES (${key}, ${url}, ${topic}, ${lang}, ${durationSec}, ${wordsJson}::jsonb, NOW())
      ON CONFLICT (cache_key) DO UPDATE SET
        url = ${url}, duration_sec = ${durationSec}, words = ${wordsJson}::jsonb, created_at = NOW()`;
  } catch { /* cache é best-effort */ }
}

// ─── Transcrição da PRÓPRIA voz gerada (o relógio fino) ───────────────────────
// O MiniMax devolve `duration_ms` (quanto o áudio dura) mas NÃO devolve o tempo de
// cada palavra — verificado no schema do endpoint. Então medimos com o Scribe, que
// devolve `words: [{text,start,end}]`. É o mesmo caminho que o AnamnesisMed já usa
// desde 2026-06-18 pra travar legenda na voz.
// Fail-open: qualquer falha → [] e o Reel sai sincronizado pela duração real, só sem
// a legenda palavra a palavra.
async function transcribeWords(
  audioUrl: string, lang: string, durationSec: number,
  automation: Automation, meta: Record<string, unknown>,
): Promise<{ words: NarrationWord[]; error?: string }> {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY || !audioUrl) return { words: [], error: "sem chave/áudio p/ transcrever" };
  try {
    const res = await fetch(`https://fal.run/${FAL_STT_MODEL}`, {
      method: "POST",
      headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_url: audioUrl,
        language_code: sttLanguageCode(lang),
        tag_audio_events: false, // sem "(laughter)" poluindo os tempos
        diarize: false,          // é uma voz só
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { words: [], error: `STT HTTP ${res.status}: ${body.slice(0, 160)}` };
    }
    const data = await res.json();
    const raw = Array.isArray(data?.words) ? (data.words as Array<Record<string, unknown>>) : [];
    const words: NarrationWord[] = raw
      .filter((w) => String(w?.type ?? "word") === "word")
      .map((w) => ({
        text: String(w?.text ?? "").trim(),
        start: Number(w?.start ?? 0),
        end: Number(w?.end ?? w?.start ?? 0),
      }))
      .filter((w) => w.text && Number.isFinite(w.start) && Number.isFinite(w.end));
    await logSpend({
      automation, platform: "fal", operation: "narration-stt", model: FAL_STT_MODEL,
      units: Math.max(1, Math.round(durationSec)),
      costUsd: Math.max(0.005, (durationSec / 60) * STT_COST_PER_MIN),
      meta: { ...meta, lang, durationSec, words: words.length },
    });
    if (!words.length) return { words: [], error: "STT sem palavras" };
    return { words };
  } catch (e) {
    return { words: [], error: `exceção STT: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// Re-hospeda o mp3 da fal no Vercel Blob (URL permanente; as da fal expiram).
async function rehostToBlob(srcUrl: string, lang: string): Promise<string | null> {
  try {
    const raw = process.env.BLOB_READ_WRITE_TOKEN || "";
    const m = raw.match(/vercel_blob_rw_[A-Za-z0-9_-]+/);
    const token = m ? m[0] : raw.trim();
    if (!token) return null;
    const res = await fetch(srcUrl);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const { put } = await import("@vercel/blob");
    const blob = await put(`narration/${lang}.mp3`, buf, {
      access: "public", contentType: "audio/mpeg", token, addRandomSuffix: true,
    });
    return blob.url;
  } catch {
    return null; // best-effort → segue com a URL da fal
  }
}

// Gera a narração (ou reusa do cache). text = roteiro `narration` do generateContent.
// Devolve a voz JUNTO COM A MEDIDA (duração real + tempo de cada palavra) — é isso
// que permite ao vídeo se dimensionar pela voz, em vez de espremer a voz no vídeo.
export async function generateNarration(
  text: string,
  lang: string,
  topic: string,
  day: string,
  opts: { automation?: Automation; meta?: Record<string, unknown> } = {},
): Promise<NarrationResult> {
  if ((process.env.REEL_NARRATION_ENABLED ?? "").toLowerCase() !== "on") {
    return { url: null, error: "narração desligada (REEL_NARRATION_ENABLED≠on)" };
  }
  const FAL_KEY = process.env.FAL_KEY;
  const clean = (text ?? "").trim();
  if (!FAL_KEY) return { url: null, error: "FAL_KEY ausente" };
  if (clean.length < 20) return { url: null, error: "roteiro de narração vazio/curto" };

  // Cache por (tópico, dia, idioma) — re-disparo reusa (gasto fal = 0).
  const hit = await readCachedNarration(topic, day, lang);
  if (hit) return { url: hit.url, cached: true, durationSec: hit.durationSec, words: hit.words };

  const automation: Automation = opts.automation ?? "ig-reels";
  // GATE DE ORÇAMENTO — a narração é PAGA (fal) e o balde `ig-reels` é compartilhado.
  // Se a estimativa estoura o teto, PULA a narração (fail-open → Reel sai só com música,
  // sem 402/tempestade). Cost-safe: se nem dá pra checar o orçamento, também pula.
  // Estimativa p/ o GATE (só orçamento — não é mais usada p/ cronometrar nada):
  // TTS por caractere + transcrição por minuto. ~11,6 chars/s é o ritmo medido da
  // voz a 0,85; serve pra prever o tamanho da conta, nunca pra dimensionar o vídeo.
  const estSec = clean.length / 11.6;
  const estCost = Math.max(0.005, (clean.length / 1000) * COST_PER_1K) + (estSec / 60) * STT_COST_PER_MIN;
  try {
    const gate = await checkBudget(automation, estCost);
    if (!gate.ok) return { url: null, error: `orçamento ${automation} estourado (US$${gate.spent.toFixed(3)}+${estCost.toFixed(3)} > US$${gate.budget.toFixed(2)}) — narração pulada` };
  } catch {
    return { url: null, error: "orçamento indisponível — narração pulada (cost-safe)" };
  }
  const speed = SPEED_NATURAL; // velocidade natural, igual nos 2 idiomas — o vídeo é que se ajusta
  try {
    const res = await fetch(`https://fal.run/${FAL_TTS_MODEL}`, {
      method: "POST",
      headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: clean,
        voice_setting: { voice_id: VOICE_ID, speed, vol: 1, pitch: 0 },
        language_boost: languageBoost(lang),
        // DESLIGA a normalização "à inglesa" — com ela ligada (default) a voz lia "público"
        // como "publisher" (anglicizado). Desligada, fala ES/PT corretamente. (S1, OK do dono.)
        english_normalization: false,
        audio_setting: { sample_rate: 44100, bitrate: 256000, format: "mp3" },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { url: null, error: `fal HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = await res.json();
    const falUrl: string | undefined = data?.audio?.url;
    // Duração REAL do áudio, medida pela própria MiniMax — substitui a estimativa
    // por fórmula de slides que causava a dessincronia.
    const durationSec = Number(data?.duration_ms ?? 0) / 1000;
    // fal cobra na geração — loga independentemente do resto.
    await logSpend({
      automation, platform: "fal", operation: "narration", model: FAL_TTS_MODEL,
      units: clean.length, costUsd: Math.max(0.005, (clean.length / 1000) * COST_PER_1K),
      meta: { ...opts.meta, lang, topic, chars: clean.length, speed, durationSec },
    });
    if (!falUrl) return { url: null, error: `fal sem audio.url: ${JSON.stringify(data).slice(0, 200)}` };

    const finalUrl = (await rehostToBlob(falUrl, lang)) ?? falUrl;
    // Mede ONDE cada palavra caiu (legenda travada na voz). Transcreve a URL da fal
    // (já pronta) — não espera o re-hosting. Falhou → segue sem words.
    const stt = await transcribeWords(falUrl, lang, durationSec, automation, { ...opts.meta, topic });
    await writeCachedNarration(topic, day, lang, finalUrl, durationSec, stt.words);
    return {
      url: finalUrl, cached: false, durationSec, words: stt.words,
      error: stt.error ? `voz ok; legenda sem tempos (${stt.error})` : undefined,
    };
  } catch (e) {
    return { url: null, error: `exceção narração: ${e instanceof Error ? e.message : String(e)}` };
  }
}
