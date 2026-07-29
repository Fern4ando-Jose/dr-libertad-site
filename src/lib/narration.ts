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
import { isoDe, iso3De, langLegado } from "@/lib/accounts";
import { wordsFromElevenLabsTimestamps, type NarrationWord } from "@/lib/narration-sync";

const FAL_TTS_MODEL = "fal-ai/minimax/speech-02-hd";
const FAL_STT_MODEL = "fal-ai/elevenlabs/speech-to-text"; // Scribe: devolve words[] com start/end
const FAL_TTS_11LABS = "fal-ai/elevenlabs/tts/multilingual-v2"; // dá timestamps NATIVOS
const COST_PER_1K = 0.10;                   // US$/1000 chars (idêntico nos dois provedores)
const STT_COST_PER_MIN = 0.03;              // US$/minuto (ElevenLabs Scribe via fal)

// ─── VOZ É CONFIGURAÇÃO POR IDIOMA (2026-07-27) ──────────────────────────────
// Lição que custou um Reel reprovado: "voz aprovada" NÃO é um fato global. A
// `Deep_Voice_Man` foi aprovada pelo dono no ESPANHOL e estava sendo usada também no
// português — ele ouviu e reprovou na hora: "liberdeide? isso existe?" e "temos que
// trocar essa vos do BR, fica muito puxado o (R), estaaar". Era sotaque estrangeiro
// lendo português, não defeito de sincronia.
//
// ⚠️ Os parâmetros abaixo são EXATAMENTE os da amostra que ele ouviu e escolheu.
// Mudar qualquer um muda a voz que ele aprovou — não mexa sem novo OK dele.
type VozCfg =
  | { provedor: "minimax"; voz: string; speed: number }
  | { provedor: "elevenlabs"; voz: string; speed: number; stability: number; similarity: number; style: number };

export const VOZ_POR_IDIOMA: Record<string, VozCfg> = {
  // ES — inalterado. Velocidade 0,85 é a que ele aprovou ("lento o suficiente p/ LER
  // e ouvir"); o antigo teto de 0,95 embolava a abertura ("público" → "publi e zeco").
  es: { provedor: "minimax", voz: "Deep_Voice_Man", speed: 0.85 },
  // BR — escolhido pelo dono ouvindo 6 amostras (2026-07-27): "Candidata 3 — Bill".
  // ElevenLabs multilingual-v2 é vendido por precisão de sotaque e aceita forçar o
  // idioma; de quebra devolve o tempo de cada palavra NATIVO, o que tira a transcrição
  // paga do caminho (o Reel BR fica ~1/3 mais barato que o ES).
  // ⚠️ Chave "br" (29/07 à noite): o refactor pt→br trocou o `lang` que chega aqui,
  // mas esta tabela ficou com a chave velha "pt" → vozDe("br") caía no FALLBACK ES
  // (Deep_Voice_Man — a voz que o dono REPROVOU lendo português). Não estourou hoje
  // só porque a narração BR veio do cache antigo. Bug latente achado e fechado.
  br: { provedor: "elevenlabs", voz: "Bill", speed: 0.95, stability: 0.45, similarity: 0.8, style: 0.1 },
};

function vozDe(lang: string): VozCfg {
  return VOZ_POR_IDIOMA[lang] ?? VOZ_POR_IDIOMA.es;
}

function languageBoost(lang: string): string {
  return lang === "br" ? "Portuguese" : "Spanish";
}

// Scribe usa ISO 639-3 ("por"/"spa"), não o código de 2 letras do resto do projeto.
function sttLanguageCode(lang: string): string {
  return iso3De(lang); // ISO 639-3 — código de padrão externo (Scribe)
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

// VERSÃO DO ROTEIRO no fim da chave (2026-07-29): quando a FORMA do roteiro muda
// (ex.: o fecho falado foi retirado — PR #198), o áudio guardado da forma antiga
// NÃO pode ser reaproveitado: ele ainda fala o fecho enquanto a tela nova não o
// mostra — a voz sobra no fim e dessincroniza (defeito real, prévia de 29/07).
// Mudou a forma do roteiro? Suba o número — o cache velho simplesmente nunca casa.
const ROTEIRO_VERSAO = "v3"; // v3 = ES sem fecho falado · BR com fecho ("Me segue…", 29/07 à noite)

// HASH do TEXTO falado na chave (espelhado do UPM, 29/07 — lá o bug foi real): a
// voz só pode ser reusada para o MESMO roteiro. Sem isto, um cache de copy que
// falhe faz a voz de um texto tocar sobre a tela de outro (2ª metade toda
// dessincronizada). Texto diferente NUNCA casa; no pior caso regenera (~US$0,03).
export function hashRoteiro(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function cacheKey(topic: string, day: string, lang: string, roteiro: string): string {
  return `${topic}|${day}|${lang}|${ROTEIRO_VERSAO}|${hashRoteiro(roteiro)}`;
}

// O cache guarda a MEDIDA junto com o áudio (duração real + tempo de cada palavra).
// Sem isso o re-disparo reusaria o mp3 mas perderia a sincronia — e voltaria a
// pagar o Scribe só pra remedir o mesmo áudio.
async function readCachedNarration(
  topic: string, day: string, lang: string, roteiro: string,
): Promise<{ url: string; durationSec: number; words: NarrationWord[] } | null> {
  try {
    const { sql } = await import("@vercel/postgres");
    const key = cacheKey(topic, day, lang, roteiro);
    // Chave LEGADA: áudio de hoje pode ter sido gravado (≤48h) antes de o idioma
    // passar a se chamar "br" — sem esta leitura o mesmo áudio seria REGERADO (pago).
    const keyLegada = cacheKey(topic, day, langLegado(lang), roteiro);
    const rows = await sql<{ url: string; duration_sec: number | null; words: unknown }>`
      SELECT url, duration_sec, words FROM narration_cache
      WHERE cache_key IN (${key}, ${keyLegada}) AND url <> 'PENDING' AND created_at > NOW() - INTERVAL '48 hours'
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
  topic: string, day: string, lang: string, roteiro: string, url: string, durationSec: number, words: NarrationWord[],
): Promise<void> {
  try {
    const { sql } = await import("@vercel/postgres");
    const key = cacheKey(topic, day, lang, roteiro);
    const wordsJson = JSON.stringify(words ?? []);
    await sql`
      INSERT INTO narration_cache (cache_key, url, topic, lang, duration_sec, words, created_at)
      VALUES (${key}, ${url}, ${topic}, ${lang}, ${durationSec}, ${wordsJson}::jsonb, NOW())
      ON CONFLICT (cache_key) DO UPDATE SET
        url = ${url}, duration_sec = ${durationSec}, words = ${wordsJson}::jsonb, created_at = NOW()`;
  } catch { /* cache é best-effort */ }
}

// ─── GUARDA DE IDIOMA DA VOZ (2026-07-28) ─────────────────────────────────────
// Defeito real: um Reel ES saiu com a voz falando INGLÊS — a MiniMax devolveu áudio
// no idioma errado (falha do provedor, não dos parâmetros: language_boost=Spanish e
// english_normalization=false estavam corretos). Ninguém percebeu ANTES de publicar
// porque a transcrição de verificação forçava `language_code=spa` — ou seja, pedíamos
// pro Scribe ler como espanhol o que já era inglês, e ele obedecia sem reclamar. O
// defeito ficava invisível até o dono OUVIR o post no ar.
// Correção pela raiz: a transcrição de checagem para de FORÇAR o idioma e passa a
// DETECTAR (Scribe devolve `language_code` + `language_probability`). Se o idioma
// detectado não bate com o esperado (e a confiança é alta o bastante pra confiar no
// detector), a narração inteira é DESCARTADA — o Reel cai pro fallback já existente
// (sem voz, só música), nunca publica áudio no idioma errado.
export function idiomaDaVozBate(esperado: string, detectado: string | null | undefined, prob: number): boolean {
  if (!detectado) return true;         // Scribe não detectou nada → não bloqueia (fail-open)
  if (!(prob >= 0.5)) return true;     // baixa confiança → não confia no detector, não bloqueia
  return detectado === esperado;
}

// ─── Transcrição da PRÓPRIA voz gerada (o relógio fino + a guarda de idioma) ──
// O MiniMax devolve `duration_ms` (quanto o áudio dura) mas NÃO devolve o tempo de
// cada palavra — verificado no schema do endpoint. Então medimos com o Scribe, que
// devolve `words: [{text,start,end}]` + `language_code`/`language_probability`. É o
// mesmo caminho que o AnamnesisMed já usa desde 2026-06-18 pra travar legenda na voz.
// Fail-open na SINCRONIA: qualquer falha de transcrição → [] e o Reel sai sincronizado
// pela duração real, só sem a legenda palavra a palavra. Fail-CLOSED no IDIOMA: voz no
// idioma errado nunca sai com `words` nem com `url` — ver languageMismatch abaixo.
async function transcribeWords(
  audioUrl: string, lang: string, durationSec: number,
  automation: Automation, meta: Record<string, unknown>,
): Promise<{ words: NarrationWord[]; error?: string; languageMismatch?: boolean }> {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY || !audioUrl) return { words: [], error: "sem chave/áudio p/ transcrever" };
  try {
    const res = await fetch(`https://fal.run/${FAL_STT_MODEL}`, {
      method: "POST",
      headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_url: audioUrl,
        // SEM language_code: forçar escondia o defeito (Scribe "lia" inglês como
        // espanhol sem reclamar). Omitido, o Scribe DETECTA — é o que destrava a guarda.
        tag_audio_events: false, // sem "(laughter)" poluindo os tempos
        diarize: false,          // é uma voz só
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { words: [], error: `STT HTTP ${res.status}: ${body.slice(0, 160)}` };
    }
    const data = await res.json();
    const esperado = sttLanguageCode(lang);
    const detectado = typeof data?.language_code === "string" ? data.language_code : null;
    const prob = Number(data?.language_probability ?? 0);
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
      meta: { ...meta, lang, durationSec, words: words.length, detectado, prob },
    });
    if (!idiomaDaVozBate(esperado, detectado, prob)) {
      return {
        words: [], languageMismatch: true,
        error: `VOZ NO IDIOMA ERRADO: esperava "${esperado}", Scribe detectou "${detectado}" (confiança ${prob.toFixed(2)}) — narração descartada`,
      };
    }
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
  const hit = await readCachedNarration(topic, day, lang, clean);
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
  const cfg = vozDe(lang);
  const modelo = cfg.provedor === "elevenlabs" ? FAL_TTS_11LABS : FAL_TTS_MODEL;
  try {
    const corpo = cfg.provedor === "elevenlabs"
      ? {
          text: clean,
          voice: cfg.voz,
          language_code: isoDe(lang), // código ISO exigido pelo provedor — força o idioma (mata o sotaque estrangeiro)
          timestamps: true,      // tempo de cada palavra NATIVO → dispensa a transcrição paga
          stability: cfg.stability,
          similarity_boost: cfg.similarity,
          style: cfg.style,
          speed: cfg.speed,
        }
      : {
          text: clean,
          voice_setting: { voice_id: cfg.voz, speed: cfg.speed, vol: 1, pitch: 0 },
          language_boost: languageBoost(lang),
          // DESLIGA a normalização "à inglesa" — com ela ligada (default) a voz lia "público"
          // como "publisher" (anglicizado). Desligada, fala ES/PT corretamente. (S1, OK do dono.)
          english_normalization: false,
          audio_setting: { sample_rate: 44100, bitrate: 256000, format: "mp3" },
        };
    const res = await fetch(`https://fal.run/${modelo}`, {
      method: "POST",
      headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { url: null, error: `fal HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = await res.json();
    const falUrl: string | undefined = data?.audio?.url;

    // TEMPOS: o ElevenLabs já devolve na própria resposta (grátis); a MiniMax não —
    // ali é preciso transcrever depois. Este é o ganho de trocar a voz do PT.
    const wordsNativas = cfg.provedor === "elevenlabs"
      ? wordsFromElevenLabsTimestamps(data?.timestamps)
      : [];
    // DURAÇÃO: a MiniMax devolve `duration_ms`; no ElevenLabs ela sai do fim da última
    // palavra. Sem nenhuma das duas, o vídeo cairia na fórmula — por isso o fallback.
    const durationSec = cfg.provedor === "elevenlabs"
      ? (wordsNativas.length ? wordsNativas[wordsNativas.length - 1].end : 0)
      : Number(data?.duration_ms ?? 0) / 1000;

    // fal cobra na geração — loga independentemente do resto.
    await logSpend({
      automation, platform: "fal", operation: "narration", model: modelo,
      units: clean.length, costUsd: Math.max(0.005, (clean.length / 1000) * COST_PER_1K),
      meta: { ...opts.meta, lang, topic, chars: clean.length, voz: cfg.voz, speed: cfg.speed, durationSec },
    });
    if (!falUrl) return { url: null, error: `fal sem audio.url: ${JSON.stringify(data).slice(0, 200)}` };

    const finalUrl = (await rehostToBlob(falUrl, lang)) ?? falUrl;

    // Só transcreve quando a voz NÃO trouxe os tempos (ES sempre; PT só se os nativos
    // vierem vazios). Transcreve a URL da fal (já pronta), não espera o re-hosting.
    // Este é TAMBÉM o único ponto que checa o IDIOMA da voz gerada (guarda acima) — por
    // isso ES (que sempre passa por aqui) fica protegido; PT com tempos nativos não passa
    // por esta checagem (limite conhecido: ver comentário da guarda de idioma).
    let words = wordsNativas;
    let erroTempos: string | undefined;
    if (!words.length) {
      const stt = await transcribeWords(falUrl, lang, durationSec, automation, { ...opts.meta, topic });
      if (stt.languageMismatch) {
        // NÃO cacheia, NÃO devolve url: a voz saiu no idioma errado — o Reel cai no
        // fallback já existente (sem narração, só música), nunca publica áudio errado.
        return { url: null, error: stt.error };
      }
      words = stt.words;
      erroTempos = stt.error;
    }
    // Última linha de defesa: sem duração medida, usa o fim da última palavra.
    const duracaoFinal = durationSec > 0
      ? durationSec
      : (words.length ? words[words.length - 1].end : 0);

    await writeCachedNarration(topic, day, lang, clean, finalUrl, duracaoFinal, words);
    return {
      url: finalUrl, cached: false, durationSec: duracaoFinal, words,
      error: erroTempos ? `voz ok; legenda sem tempos (${erroTempos})` : undefined,
    };
  } catch (e) {
    return { url: null, error: `exceção narração: ${e instanceof Error ? e.message : String(e)}` };
  }
}
