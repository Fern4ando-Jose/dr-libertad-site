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
// Custo: MiniMax HD ~US$0,10/1000 chars (~US$0,03/Reel). Cache por (tópico,dia,
// idioma) → re-disparo reusa, não repaga. Re-hospeda no Blob (URL permanente).

import { type Automation, logSpend } from "@/lib/spend";

const FAL_TTS_MODEL = "fal-ai/minimax/speech-02-hd";
const VOICE_ID = "Deep_Voice_Man";        // aprovado pelo dono (grave/séria)
const SPEED_FLOOR = 0.85;                   // piso: lento o suficiente p/ LER e ouvir (= o ES, que ficou certo)
const SPEED_MAX = 1.30;                     // teto: não acelerar a ponto de atropelar
const RATE_AT_1 = 13.7;                     // chars/seg a speed 1.0 (calibrado: ES 279ch @0.85 ≈ 24s)
const COST_PER_1K = 0.10;                   // US$/1000 chars (MiniMax HD)

// Velocidade dinâmica: ajusta a `speed` p/ a narração CABER na janela de voz do Reel
// (capa+insights+cta, sem o end-card). Sem isso, um idioma mais VERBOSO (PT > ES no mesmo
// tema) estoura o tempo e a voz "atrasa" (o texto acaba e a voz segue). Texto curto → fica
// no piso 0,85 (ES, correto); texto longo → acelera só o necessário. Mesmo sincronismo ES/PT.
function speedForFit(chars: number, targetSeconds: number): number {
  const target = targetSeconds > 6 ? targetSeconds : 23.8; // fallback ~3 insights
  const needed = chars / (target * RATE_AT_1);
  return Math.min(SPEED_MAX, Math.max(SPEED_FLOOR, Number(needed.toFixed(3))));
}

function languageBoost(lang: string): string {
  return lang === "pt" ? "Portuguese" : "Spanish";
}

export interface NarrationResult {
  url: string | null;
  error?: string;
  cached?: boolean;
}

function cacheKey(topic: string, day: string, lang: string): string {
  return `${topic}|${day}|${lang}`;
}

async function readCachedNarration(topic: string, day: string, lang: string): Promise<string | null> {
  try {
    const { sql } = await import("@vercel/postgres");
    const key = cacheKey(topic, day, lang);
    const rows = await sql<{ url: string }>`
      SELECT url FROM narration_cache
      WHERE cache_key = ${key} AND url <> 'PENDING' AND created_at > NOW() - INTERVAL '48 hours'
      LIMIT 1`;
    const url = rows.rows[0]?.url;
    if (!url) return null;
    try { const c = await fetch(url, { method: "GET" }); if (!c.ok) return null; } catch { return null; }
    return url;
  } catch {
    return null;
  }
}

async function writeCachedNarration(topic: string, day: string, lang: string, url: string): Promise<void> {
  try {
    const { sql } = await import("@vercel/postgres");
    const key = cacheKey(topic, day, lang);
    await sql`
      INSERT INTO narration_cache (cache_key, url, topic, lang, created_at)
      VALUES (${key}, ${url}, ${topic}, ${lang}, NOW())
      ON CONFLICT (cache_key) DO UPDATE SET url = ${url}, created_at = NOW()`;
  } catch { /* cache é best-effort */ }
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
export async function generateNarration(
  text: string,
  lang: string,
  topic: string,
  day: string,
  opts: { automation?: Automation; meta?: Record<string, unknown>; targetSeconds?: number } = {},
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
  if (hit) return { url: hit, cached: true };

  const automation: Automation = opts.automation ?? "ig-reels";
  const speed = speedForFit(clean.length, opts.targetSeconds ?? 0); // cabe na janela de voz (ES/PT mesmo sync)
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
    // fal cobra na geração — loga independentemente do resto.
    await logSpend({
      automation, platform: "fal", operation: "narration", model: FAL_TTS_MODEL,
      units: clean.length, costUsd: Math.max(0.005, (clean.length / 1000) * COST_PER_1K),
      meta: { ...opts.meta, lang, topic, chars: clean.length, speed },
    });
    if (!falUrl) return { url: null, error: `fal sem audio.url: ${JSON.stringify(data).slice(0, 200)}` };

    const finalUrl = (await rehostToBlob(falUrl, lang)) ?? falUrl;
    await writeCachedNarration(topic, day, lang, finalUrl);
    return { url: finalUrl, cached: false };
  } catch (e) {
    return { url: null, error: `exceção narração: ${e instanceof Error ? e.message : String(e)}` };
  }
}
