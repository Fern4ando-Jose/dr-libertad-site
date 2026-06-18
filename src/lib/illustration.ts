// ─── Geração de ilustração por IA (fal.ai / Flux) ────────────────────────────
// Gera UMA ilustração figurativa por post (usada na capa). Estilo editorial de
// marca + subject por tema (ver TOPIC_SUBJECT em /api/publish). Em qualquer
// falha retorna null → o /api/og cai no motivo abstrato (nunca quebra o post).
// Direção de arte: memória `art-direction-ia`.
//
// QA antes de publicar: cada imagem passa por um controle de qualidade por
// VISÃO (Claude) que reprova defeitos anatômicos (mão/dedo/membro extra, rosto
// distorcido). Se reprovar, regera; se esgotar as tentativas, devolve null e o
// /api/og usa o motivo abstrato — assim uma imagem com 3 mãos nunca é publicada.

import { type Automation, falCost, anthropicCost, logSpend } from "@/lib/spend";

// Acento por categoria — espelha CATS de /api/og (cor) + nome p/ o prompt.
const ACCENTS: Record<string, { word: string; hex: string }> = {
  freedom:  { word: "oxblood wine red",  hex: "#A45A5A" },
  dopamine: { word: "burnt amber ochre", hex: "#BE7A2A" },
  anxiety:  { word: "deep teal",         hex: "#3D6360" },
  network:  { word: "slate blue",        hex: "#3F5E78" },
  self:     { word: "dusty mauve",       hex: "#835A6E" },
  mind:     { word: "olive green",       hex: "#5B6B3C" },
};

// Bloco de estilo de marca (fixo) + slot de subject por tema.
// Direção: cinematográfico/escultural editorial (escolha do usuário, 2026-06-13).
function buildPrompt(subject: string, accentWord: string, accentHex: string): string {
  return [
    `Cinematic conceptual editorial illustration: ${subject}.`,
    `Dramatic chiaroscuro lighting, sculptural and atmospheric, fine film grain and subtle texture.`,
    `Restricted, desaturated palette: warm off-white paper tone (#F4F0E8) and deep ink black (#0B0B0C), with a single muted accent of ${accentWord} (${accentHex}).`,
    `One bold central metaphor, generous negative space, sober and refined like a literary-magazine cover.`,
    // Blindagem anatômica — reduz a chance de mão/dedo/membro extra (defeito nº 1 da difusão).
    `Anatomically correct and photoreal in structure: each person has exactly two arms and two hands, each hand with exactly five fingers; natural, correctly formed limbs, hands and faces. No extra, missing or fused fingers, hands, arms or limbs; no duplicated or distorted body parts.`,
    `No text, no letters, no words, no logo, no watermark. No neon, no purple gradient, no corporate clip-art, no busy clutter.`,
  ].join(" ");
}

export interface IllustrationResult {
  url: string | null;
  error?: string;
  model?: string;
  attempts?: number;   // quantas gerações foram necessárias até aprovar (ou desistir)
  qaReason?: string;   // motivo do último veredito do QA (útil no dryrun/preview)
  cached?: boolean;    // true quando a URL veio do cache de 24h (gasto fal = 0)
}

// Opções de geração — controlam o gasto na fal por caminho de chamada.
export interface GenerateOpts {
  maxTries?: number;        // tentativas no loop de QA (publish=3; dryrun/preview=1)
  useCache?: boolean;       // reusar a ilustração aprovada do dia (default: true)
  automation?: Automation;  // a quem atribuir o gasto no spend_log (default: "manual")
}

const MAX_TRIES = 3;        // gera no máx. 3 vezes tentando passar no QA
const QA_MODEL = "claude-sonnet-4-6"; // visão confiável p/ contar mãos/dedos

// ─── Cache de 24h da ilustração do dia ───────────────────────────────────────
// Reusa a MESMA imagem aprovada para um (model, cat, subject) por 24h entre os
// caminhos (publish/preview/dryrun) e entre carrossel e Reel — em vez de pagar
// uma nova geração na fal a cada chamada. Best-effort: qualquer falha de banco é
// fail-open (gera normalmente). Só URLs APROVADAS no QA entram no cache.

export function cacheKey(model: string, cat: string, subject: string): string {
  return `${model}|${cat}|${subject}`;
}

// Seed determinístico por (cat, subject, dia UTC). ES e PT, no mesmo dia, derivam
// o MESMO seed → a fal devolve a MESMA imagem: a arte é compartilhada entre as
// contas (só a copy muda por idioma). O dia entra p/ haver variação diária. O nº
// da tentativa é somado FORA daqui, pra que um retry de QA gere arte nova mas
// ainda idêntica entre os idiomas naquela tentativa.
export function seedForDay(cat: string, subject: string, day?: string): number {
  const d = day ?? new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const s = `${cat}|${subject}|${d}`;
  let h = 2166136261; // FNV-1a 32-bit
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2_000_000_000; // inteiro não-negativo em faixa segura p/ a fal
}

// Corpo da requisição à fal. Função pura (testável) — o seed determinístico é
// obrigatório aqui: é o que garante imagem idêntica entre ES e PT.
export function falRequestBody(prompt: string, seed: number) {
  return {
    prompt,
    image_size: { width: 1024, height: 1280 }, // 4:5 — og faz cover-fit p/ 1080×1350
    num_images: 1,
    enable_safety_checker: true,
    seed, // determinístico por (cat+subject+dia): ES e PT geram a MESMA imagem
  };
}

async function readCachedIllustration(model: string, cat: string, subject: string): Promise<string | null> {
  try {
    const { sql } = await import("@vercel/postgres");
    const key = cacheKey(model, cat, subject);
    const rows = await sql<{ url: string }>`
      SELECT url FROM illustration_cache
      WHERE cache_key = ${key} AND created_at > NOW() - INTERVAL '24 hours'
      LIMIT 1
    `;
    const url = rows.rows[0]?.url;
    if (!url) return null;
    // URLs da fal podem expirar — confirma que ainda responde antes de reusar.
    try {
      const check = await fetch(url, { method: "GET" });
      if (!check.ok) return null;
    } catch { return null; }
    return url;
  } catch {
    return null; // sem cache → segue para a geração normal
  }
}

// ─── Re-hospedagem no Vercel Blob ────────────────────────────────────────────
// As URLs da fal (v3b.fal.media) são uma CDN de terceiros, lenta/fria de forma
// intermitente e com validade limitada. Quando passadas em ?img= ao /api/og e
// daí ao Instagram, uma fal lenta estourava o timeout de download da mídia do
// IG (9004). Re-hospedamos a imagem APROVADA no Blob (mesma infra Vercel, rápida
// e permanente) e cacheamos a URL do Blob — não a da fal. Best-effort: se o
// re-host falhar, devolve null e o pipeline segue com a URL original da fal.
async function rehostToBlob(srcUrl: string, cat: string): Promise<string | null> {
  try {
    const raw = process.env.BLOB_READ_WRITE_TOKEN || "";
    const m = raw.match(/vercel_blob_rw_[A-Za-z0-9_-]+/);
    const token = m ? m[0] : raw.trim();
    if (!token) return null;

    const res = await fetch(srcUrl);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "image/jpeg";
    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
    const buf = Buffer.from(await res.arrayBuffer());

    const { put } = await import("@vercel/blob");
    const blob = await put(`illustrations/${cat}.${ext}`, buf, {
      access: "public",
      contentType: ct,
      token,
      addRandomSuffix: true, // nome único por imagem (não sobrescreve as do dia anterior)
    });
    return blob.url;
  } catch {
    return null; // re-host é best-effort — nunca quebra o pipeline
  }
}

async function writeCachedIllustration(model: string, cat: string, subject: string, url: string): Promise<void> {
  try {
    const { sql } = await import("@vercel/postgres");
    const key = cacheKey(model, cat, subject);
    await sql`
      INSERT INTO illustration_cache (cache_key, url, subject, cat, model, created_at)
      VALUES (${key}, ${url}, ${subject}, ${cat}, ${model}, NOW())
      ON CONFLICT (cache_key) DO UPDATE SET url = ${url}, model = ${model}, created_at = NOW()
    `;
  } catch { /* cache é best-effort — nunca quebra o pipeline */ }
}

// Gera UMA imagem no fal e confirma que a URL responde. Sem QA aqui.
// Loga o gasto na fal assim que a imagem é gerada (a fal cobra na geração).
async function generateOnce(
  model: string,
  key: string,
  prompt: string,
  automation: Automation,
  seed: number,
): Promise<{ url: string | null; error?: string }> {
  try {
    const res = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(falRequestBody(prompt, seed)),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { url: null, error: `fal HTTP ${res.status}: ${body.slice(0, 220)}` };
    }
    const data = await res.json();
    const url: string | undefined = data?.images?.[0]?.url;
    // Imagem gerada → fal cobrou. Loga independentemente do QA aprovar depois.
    await logSpend({ automation, platform: "fal", operation: "illustration", model, units: 1, costUsd: falCost(model) });
    if (!url) return { url: null, error: `fal resposta sem images[0].url: ${JSON.stringify(data).slice(0, 220)}` };
    let check: Response | null = null;
    try { check = await fetch(url, { method: "GET" }); } catch (e) {
      return { url: null, error: `url gerada não responde (fetch falhou: ${e instanceof Error ? e.message : String(e)})` };
    }
    if (!check.ok) return { url: null, error: `url gerada não responde (HTTP ${check.status})` };
    return { url };
  } catch (e) {
    return { url: null, error: `exceção fal: ${e instanceof Error ? e.message : String(e)}` };
  }
}

const QA_PROMPT =
  "Eres un inspector de control de calidad ESTRICTO de ilustraciones editoriales generadas por IA. " +
  "Examina la imagen SOLO en busca de defectos anatómicos o estructurales que avergonzarían a una revista: " +
  "manos o dedos de más o de menos (cada mano debe tener exactamente cinco dedos), " +
  "brazos/piernas/miembros de más, de menos o fusionados, partes del cuerpo duplicadas o deformadas, " +
  "rostros malformados (ojos de más, rasgos derretidos), o cualquier anatomía imposible. " +
  "IGNORA el estilo, el ánimo, la iluminación, el encuadre, el recorte y la elección del tema: juzga SOLO la corrección física. " +
  'Responde ÚNICAMENTE con un objeto JSON: {"ok": true|false, "reason": "breve motivo"}. ' +
  "ok debe ser false si hay CUALQUIER defecto de ese tipo visible.";

// Controle de qualidade por visão. Em erro de infra (API caída etc.) é
// fail-open: aceita a imagem para não travar o pipeline (a Claude já é usada
// antes, em generateContent — se estivesse fora, o publish nem chegaria aqui).
async function checkAnatomy(imageUrl: string, automation: Automation): Promise<{ ok: boolean; reason: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: true, reason: "QA pulado (sem ANTHROPIC_API_KEY)" };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: QA_MODEL,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "url", url: imageUrl } },
              { type: "text", text: QA_PROMPT },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return { ok: true, reason: `QA indisponível (HTTP ${res.status}) — aceitando` };
    const data = await res.json();
    // Loga o gasto real do QA (tokens efetivos da resposta).
    await logSpend({ automation, platform: "anthropic", operation: "qa-anatomy", model: QA_MODEL, units: (data?.usage?.input_tokens ?? 0) + (data?.usage?.output_tokens ?? 0), costUsd: anthropicCost(QA_MODEL, data?.usage) });
    const raw: string = data?.content?.[0]?.text ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { ok: true, reason: `QA sem JSON ("${raw.slice(0, 80)}") — aceitando` };
    const verdict = JSON.parse(match[0]) as { ok?: boolean; reason?: string };
    return { ok: verdict.ok !== false, reason: verdict.reason ?? "" };
  } catch (e) {
    return { ok: true, reason: `QA exceção (${e instanceof Error ? e.message : String(e)}) — aceitando` };
  }
}

// Gera a ilustração com QA. Retorna { url } aprovada, ou { url:null, error } se
// nenhuma das tentativas passou no controle de qualidade (→ og usa o abstrato).
export async function generateIllustration(subject: string, cat: string, opts: GenerateOpts = {}): Promise<IllustrationResult> {
  // Lê no momento da chamada (igual CRON_SECRET) — evita leitura em hora errada do build.
  const FAL_KEY = process.env.FAL_KEY;
  const FAL_MODEL = process.env.FAL_MODEL || "fal-ai/flux/dev";
  if (!FAL_KEY) return { url: null, error: "FAL_KEY ausente no runtime" };
  if (!subject)  return { url: null, error: "subject vazio" };

  const maxTries = Math.max(1, opts.maxTries ?? MAX_TRIES);
  const useCache = opts.useCache ?? true;
  const automation: Automation = opts.automation ?? "manual";

  // Reuso da ilustração do dia: gasto fal = 0 quando há hit válido.
  if (useCache) {
    const hit = await readCachedIllustration(FAL_MODEL, cat, subject);
    if (hit) return { url: hit, model: FAL_MODEL, attempts: 0, qaReason: "cache 24h", cached: true };
  }

  const accent = ACCENTS[cat] ?? ACCENTS.freedom;
  const prompt = buildPrompt(subject, accent.word, accent.hex);
  const baseSeed = seedForDay(cat, subject); // mesmo p/ ES e PT no mesmo dia

  let lastErr = "";
  let lastQa = "";
  for (let attempt = 1; attempt <= maxTries; attempt++) {
    // base+(attempt-1): retry de QA muda a arte, mas ES e PT batem na mesma tentativa.
    const gen = await generateOnce(FAL_MODEL, FAL_KEY, prompt, automation, baseSeed + attempt - 1);
    if (!gen.url) { lastErr = gen.error ?? "erro de geração"; continue; }
    const qa = await checkAnatomy(gen.url, automation);
    if (qa.ok) {
      // Re-hospeda a imagem aprovada no Blob (URL rápida/permanente). Se falhar,
      // segue com a URL original da fal — degrada ao comportamento anterior.
      const finalUrl = (await rehostToBlob(gen.url, cat)) ?? gen.url;
      // Só imagens aprovadas entram no cache → reuso sempre devolve imagem boa.
      if (useCache) await writeCachedIllustration(FAL_MODEL, cat, subject, finalUrl);
      return { url: finalUrl, model: FAL_MODEL, attempts: attempt, qaReason: qa.reason, cached: false };
    }
    lastQa = qa.reason;
    lastErr = `QA reprovou na tentativa ${attempt}: ${qa.reason}`;
    // segue o loop → regera uma composição nova
  }
  return {
    url: null,
    error: `${maxTries} tentativa(s) sem imagem aprovada. Último: ${lastErr}`,
    model: FAL_MODEL,
    attempts: maxTries,
    qaReason: lastQa,
  };
}
