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

// Enquadramentos ROTATIVOS — quebram a monotonia "figura solitária centralizada na
// porta" (47/62 subjects eram figura humana → o feed repetia o mesmo quadro). Escolhido
// de forma DETERMINÍSTICA por `subject`: cada tema tem o SEU, mas temas diferentes
// (posts vizinhos no feed) saem com quadros diferentes. ES e PT batem (mesmo subject →
// mesmo enquadramento). São vantagens de escala/ângulo que funcionam p/ figura E objeto
// (não brigam com o subject). Ver erro "Repetição VISUAL" no HISTORICO-ERROS.
const FRAMINGS = [
  "framed as an intimate mid-shot with generous negative space, like a literary-magazine cover",
  "framed as an extreme close-up, one telling detail filling most of the frame, shallow depth of field",
  "framed as a wide establishing shot, the subject small within a vast atmospheric space",
  "framed from a high angle looking down on the scene",
  "framed from a low, dramatic angle looking upward",
  "framed strongly off-center, asymmetric, with rule-of-thirds tension",
];

export function framingFor(subject: string): string {
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) | 0;
  return FRAMINGS[Math.abs(h) % FRAMINGS.length];
}

// Bloco de estilo de marca (fixo) + slot de subject por tema + enquadramento rotativo.
// Direção: cinematográfico/escultural editorial (escolha do usuário, 2026-06-13).
export function buildPrompt(subject: string, accentWord: string, accentHex: string): string {
  return [
    `Cinematic conceptual editorial illustration: ${subject}.`,
    `Dramatic chiaroscuro lighting, sculptural and atmospheric, fine film grain and subtle texture.`,
    `Restricted, desaturated palette: warm off-white paper tone (#F4F0E8) and deep ink black (#0B0B0C), with a single muted accent of ${accentWord} (${accentHex}).`,
    `One single central metaphor — a lone figure OR one symbolic object, never a crowd, a couple or multiple overlapping figures, ${framingFor(subject)}, sober and refined.`,
    // Modéstia — o gerador vinha produzindo NUDEZ explícita nesses temas (score 0 em 100% das
    // capas 06–07/07; ver tabela rejected_covers). "sculptural/chiaroscuro" puxava p/ nu clássico.
    `Any human figure is fully clothed in simple, timeless clothing. Strictly modest and non-explicit: no nudity, no bare chest or torso, no exposed breasts, buttocks or genitals, no underwear, no sexual, intimate or suggestive content — appropriate for a general-audience literary-magazine cover.`,
    // Blindagem anatômica — reduz a chance de mão/dedo/membro extra (defeito nº 1 da difusão).
    `Anatomically correct and photoreal in structure: each person has exactly two arms and two hands, each hand with exactly five fingers; natural, correctly formed limbs, hands and faces. No extra, missing or fused fingers, hands, arms or limbs; no duplicated or distorted body parts.`,
    `No text, no letters, no words, no logo, no watermark. No neon, no purple gradient, no corporate clip-art, no busy clutter.`,
    // FULL-BLEED (2026-07-10, aprovado pelo dono): a Nano Banana vinha compondo alguns temas
    // (sobretudo objeto/"no people") como FOTO EMOLDURADA — conteúdo pequeno dentro de uma margem
    // creme → a capa "não preenchia o post". Esta linha exige sangria total, sem moldura interna.
    `The artwork must be full-bleed and fill the entire frame edge to edge — strictly no border, no inner frame, no matte, no paper margin, no framed-print or gallery-mounted look; never inset the composition inside empty space.`,
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
  meta?: Record<string, unknown>; // contexto p/ o spend_log (ex.: { topic, lang }) — observabilidade
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

// Corpo da requisição à fal — CIENTE DO MODELO (o schema da Nano Banana difere do Flux).
// Função pura (testável). O seed segue presente nos dois (ES/PT determinístico + best-of-N).
export function falRequestBody(prompt: string, seed: number, model = "fal-ai/gemini-3.1-flash-image-preview") {
  if (model.includes("gemini") || model.includes("nano-banana")) {
    // Nano Banana 2 (Gemini 3.1 Flash Image): aspect_ratio no lugar de image_size;
    // safety_tolerance="4" = moderação padrão do Google (não gera nudez). Preço flat →
    // 2K sem custo extra. Saída jpeg (menor). Retorna images[0].url, igual ao Flux.
    return {
      prompt,
      aspect_ratio: "4:5",        // capa 1080×1350 (og faz cover-fit)
      num_images: 1,
      seed,
      resolution: "2K",
      output_format: "jpeg",
      safety_tolerance: "4",
    };
  }
  // Flux (legado) — mantido p/ rollback via env FAL_MODEL.
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
      WHERE cache_key = ${key} AND url <> 'PENDING' AND created_at > NOW() - INTERVAL '24 hours'
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

// ─── Persistência das capas REPROVADAS (revisão manual do dono) ───────────────
// Toda capa que o juiz REJEITA é re-hospedada no Blob (a URL da fal expira) e
// registrada em `rejected_covers` com o motivo + score + tema/idioma. Assim o dono
// abre /admin/reprovadas e confere SE o juiz está reprovando com razão (pedido do
// dono 2026-07-06 — hoje 10 capas foram ao lixo sem ninguém ver o porquê). NÃO gera
// imagem nova (reusa a que já foi paga). Best-effort: qualquer falha é ignorada.
async function saveRejectedCovers(
  rejected: { url: string; v: { score: number; reason: string } }[],
  ctx: { subject: string; cat: string; day: string; model: string; meta?: Record<string, unknown> },
): Promise<void> {
  try {
    const { sql } = await import("@vercel/postgres");
    const topic = String(ctx.meta?.topic ?? "");
    const lang = String(ctx.meta?.lang ?? "");
    for (const r of rejected) {
      // Guarda a imagem no Blob (permanente) sob illustrations/reprovadas/<cat>;
      // se o re-host falhar, registra a URL da fal mesmo (pode expirar, mas o
      // motivo do juiz — o que mais importa — fica salvo de qualquer forma).
      const blobUrl = (await rehostToBlob(r.url, `reprovadas/${ctx.cat}`)) ?? r.url;
      await sql`
        INSERT INTO rejected_covers (day, topic, subject, cat, lang, model, score, reason, url, created_at)
        VALUES (${ctx.day}, ${topic}, ${ctx.subject}, ${ctx.cat}, ${lang}, ${ctx.model}, ${r.v.score}, ${r.v.reason}, ${blobUrl}, NOW())
      `;
    }
  } catch { /* revisão é best-effort — nunca quebra o pipeline */ }
}

// ─── Serialização ES/PT (eleição de líder) ───────────────────────────────────
// ES e PT do MESMO (cat,subject,dia) rodam em jobs CONCORRENTES. Sem trava, os
// dois liam o cache vazio ao mesmo tempo e geravam → pagavam a fal 2× (e com o
// best-of-3, 6 imagens em vez de 3). Aqui um "líder" REIVINDICA a chave (linha
// sentinela `url='PENDING'`); o "seguidor" ESPERA o líder gravar a URL real e a
// REUSA (gasto fal = 0). Atômico via INSERT … ON CONFLICT — só 1 líder por chave.
// TUDO fail-open: erro de banco → cada um gera (como antes), nunca bloqueia o post.
const PENDING = "PENDING";

// Tenta virar líder da geração desta chave. true = você gera; false = outro já
// está gerando (você é seguidor → espere e reuse). Rouba a vaga se o PENDING
// estiver velho (>4min, líder caiu) ou se a entrada expirou (>24h, virada do dia).
async function claimIllustrationLeadership(key: string, subject: string, cat: string, model: string): Promise<boolean> {
  try {
    const { sql } = await import("@vercel/postgres");
    const r = await sql`
      INSERT INTO illustration_cache (cache_key, url, subject, cat, model, created_at)
      VALUES (${key}, ${PENDING}, ${subject}, ${cat}, ${model}, NOW())
      ON CONFLICT (cache_key) DO UPDATE
        SET url = ${PENDING}, subject = ${subject}, cat = ${cat}, model = ${model}, created_at = NOW()
        WHERE (illustration_cache.url = ${PENDING} AND illustration_cache.created_at < NOW() - INTERVAL '4 minutes')
           OR illustration_cache.created_at < NOW() - INTERVAL '24 hours'
      RETURNING cache_key
    `;
    return r.rows.length > 0; // linha devolvida = inserimos OU roubamos a vaga → somos líder
  } catch {
    return true; // sem banco → cada um gera (fail-open, comportamento antigo)
  }
}

// Limpa a reivindicação PENDING (líder NÃO conseguiu gerar) — pra não travar 24h.
async function clearIllustrationClaim(key: string): Promise<void> {
  try {
    const { sql } = await import("@vercel/postgres");
    await sql`DELETE FROM illustration_cache WHERE cache_key = ${key} AND url = ${PENDING}`;
  } catch { /* best-effort */ }
}

// Seguidor: espera o líder gravar a URL real (até ~maxMs) e a reusa. null se o
// líder não entregou a tempo (aí o seguidor gera por conta — raro, fail-open).
async function waitForCachedIllustration(model: string, cat: string, subject: string, maxMs: number): Promise<string | null> {
  const stepMs = 5000;
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, stepMs));
    const url = await readCachedIllustration(model, cat, subject);
    if (url) return url;
  }
  return null;
}

// Gera UMA imagem no fal e confirma que a URL responde. Sem QA aqui.
// Loga o gasto na fal assim que a imagem é gerada (a fal cobra na geração).
async function generateOnce(
  model: string,
  key: string,
  prompt: string,
  automation: Automation,
  seed: number,
  meta?: Record<string, unknown>,
): Promise<{ url: string | null; error?: string }> {
  try {
    const res = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(falRequestBody(prompt, seed, model)),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { url: null, error: `fal HTTP ${res.status}: ${body.slice(0, 220)}` };
    }
    const data = await res.json();
    const url: string | undefined = data?.images?.[0]?.url;
    // Imagem gerada → fal cobrou. Loga independentemente do QA aprovar depois.
    await logSpend({ automation, platform: "fal", operation: "illustration", model, units: 1, costUsd: falCost(model), meta: { ...meta, seed } });
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

const JUDGE_PROMPT =
  "Eres un DIRECTOR DE ARTE ESTRICTO evaluando una ilustración editorial (estilo portada de revista literaria) generada por IA. " +
  "RECHAZA (reject=true) si hay CUALQUIERA de estos defectos graves: " +
  "(1) anatomía incorrecta — manos/dedos de más o de menos (cada mano exactamente cinco dedos), miembros fusionados/duplicados/deformados, rostros malformados (ojos de más, rasgos derretidos); " +
  "(2) CUALQUIER texto, letra, palabra, número, firma, logo o marca de agua visible; " +
  "(3) composición confusa o saturada — varias figuras amontonadas cuando debería haber UNA metáfora central clara; " +
  "(4) tono equivocado — escena íntima/sexual/ambigua, o cualquier cosa que no parezca una portada editorial sobria. " +
  "Si NO hay defectos graves, PUNTÚA de 0 a 10 su calidad como portada editorial: metáfora central clara, composición fuerte, luz chiaroscuro dramática, paleta sobria y refinada, espacio negativo generoso. " +
  'Responde ÚNICAMENTE con JSON: {"score": 0-10, "reject": true|false, "reason": "breve motivo"}. ' +
  "Si reject es true, score debe ser 0.";

// Juiz de marca por visão: pontua a imagem (0-10) e REJEITA defeitos graves
// (anatomia, texto/marca-d'água, composição confusa, tom errado). Em erro de infra
// é fail-open SUAVE: não rejeita e dá score médio (5) — assim uma API caída não
// blanqueia a capa, mas também não força uma escolha. Score do juiz decide o
// best-of-N. Retorna { score, reject, reason }.
async function judgeImage(imageUrl: string, automation: Automation, meta?: Record<string, unknown>): Promise<{ score: number; reject: boolean; reason: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { score: 5, reject: false, reason: "juiz pulado (sem ANTHROPIC_API_KEY)" };
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
              { type: "text", text: JUDGE_PROMPT },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return { score: 5, reject: false, reason: `juiz indisponível (HTTP ${res.status}) — aceitando` };
    const data = await res.json();
    await logSpend({ automation, platform: "anthropic", operation: "qa-judge", model: QA_MODEL, units: (data?.usage?.input_tokens ?? 0) + (data?.usage?.output_tokens ?? 0), costUsd: anthropicCost(QA_MODEL, data?.usage), meta });
    const raw: string = data?.content?.[0]?.text ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { score: 5, reject: false, reason: `juiz sem JSON ("${raw.slice(0, 80)}") — aceitando` };
    const v = JSON.parse(match[0]) as { score?: number; reject?: boolean; reason?: string };
    const reject = v.reject === true;
    return { score: reject ? 0 : Math.max(0, Math.min(10, Number(v.score) || 0)), reject, reason: v.reason ?? "" };
  } catch (e) {
    return { score: 5, reject: false, reason: `juiz exceção (${e instanceof Error ? e.message : String(e)}) — aceitando` };
  }
}

// Gera a ilustração com QA. Retorna { url } aprovada, ou { url:null, error } se
// nenhuma das tentativas passou no controle de qualidade (→ og usa o abstrato).
export async function generateIllustration(subject: string, cat: string, opts: GenerateOpts = {}): Promise<IllustrationResult> {
  // Lê no momento da chamada (igual CRON_SECRET) — evita leitura em hora errada do build.
  const FAL_KEY = process.env.FAL_KEY;
  const FAL_MODEL = process.env.FAL_MODEL || "fal-ai/gemini-3.1-flash-image-preview";
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
  const day = new Date().toISOString().slice(0, 10); // UTC
  const baseSeed = seedForDay(cat, subject, day); // mesmo p/ ES e PT no mesmo dia
  const key = cacheKey(FAL_MODEL, cat, subject);
  // meta p/ o spend_log (antes era {} → gasto cego). cat/subject/dia identificam a capa;
  // a rota injeta lang/topic via opts.meta. Útil pra auditar custo por tema/idioma.
  const meta = { cat, subject, day, ...(opts.meta ?? {}) };

  // Serialização ES/PT: um gera, o outro reusa. Só no caminho com cache (publish).
  // Sem isso, ES e PT do mesmo dia geram em paralelo e pagam 2× (bug de custo).
  if (useCache) {
    const isLeader = await claimIllustrationLeadership(key, subject, cat, FAL_MODEL);
    if (!isLeader) {
      const waited = await waitForCachedIllustration(FAL_MODEL, cat, subject, 120_000);
      if (waited) return { url: waited, model: FAL_MODEL, attempts: 0, qaReason: "reuso (o outro idioma gerou)", cached: true };
      // líder não entregou a tempo (raro) → segue e gera por conta (fail-open)
    }
  }

  // BEST-OF-N: gera `maxTries` candidatos EM PARALELO (seeds base+0..N-1) e um JUIZ de
  // marca escolhe o de MAIOR score que NÃO foi rejeitado (anatomia / texto-marca-d'água /
  // composição confusa / tom errado). Melhor que pegar "o 1º que passa": evita publicar
  // render fraco ou furado. ES e PT usam o mesmo baseSeed → mesmos candidatos; o cache
  // garante a mesma escolha entre os idiomas. (Decisão travada A1b — DECISOES-TRAVADAS.md.)
  const gens = await Promise.all(
    Array.from({ length: maxTries }, (_, i) => generateOnce(FAL_MODEL, FAL_KEY, prompt, automation, baseSeed + i, meta)),
  );
  const valid = gens.filter((g): g is { url: string } => !!g.url);
  if (!valid.length) {
    if (useCache) await clearIllustrationClaim(key); // libera a vaga p/ não travar 24h
    return { url: null, error: `nenhuma imagem gerada. Último: ${gens[gens.length - 1]?.error ?? "?"}`, model: FAL_MODEL, attempts: maxTries };
  }
  const judged = await Promise.all(valid.map(async (g) => ({ url: g.url, v: await judgeImage(g.url, automation, meta) })));
  // Salva TODA capa reprovada (mesmo quando outra passou) → o dono revê em
  // /admin/reprovadas se o juiz está sendo justo. Best-effort, não gera nada novo.
  const rejected = judged.filter((j) => j.v.reject);
  if (rejected.length) await saveRejectedCovers(rejected, { subject, cat, day, model: FAL_MODEL, meta });
  const approved = judged.filter((j) => !j.v.reject).sort((a, b) => b.v.score - a.v.score);
  if (!approved.length) {
    if (useCache) await clearIllustrationClaim(key); // libera a vaga p/ não travar 24h
    return {
      url: null,
      error: `${valid.length} imagem(ns) gerada(s), todas reprovadas pelo juiz`,
      model: FAL_MODEL,
      attempts: maxTries,
      qaReason: judged.map((j) => j.v.reason).join(" | "),
    };
  }
  const best = approved[0];
  // Re-hospeda a melhor no Blob (URL rápida/permanente). Se falhar, segue com a da fal.
  const finalUrl = (await rehostToBlob(best.url, cat)) ?? best.url;
  // Só a imagem escolhida entra no cache → reuso (ES/PT, 24h) sempre devolve a melhor.
  // Isto também SUBSTITUI a linha-sentinela PENDING pela URL real (libera os seguidores).
  if (useCache) await writeCachedIllustration(FAL_MODEL, cat, subject, finalUrl);
  return { url: finalUrl, model: FAL_MODEL, attempts: maxTries, qaReason: `melhor de ${valid.length} (score ${best.v.score}): ${best.v.reason}`, cached: false };
}
