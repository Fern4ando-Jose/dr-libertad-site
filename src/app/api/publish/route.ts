import { NextRequest, NextResponse } from "next/server";
import { generateIllustration } from "@/lib/illustration";
import { Lang, accountFor, getLang } from "@/lib/accounts";
import { type Automation, checkBudget, logSpend, anthropicCost, tavilyCost, EST_RUN_COST } from "@/lib/spend";
import { parseContentJson } from "@/lib/content-json";
import { dayUTC, reelSharedKey, hashStr, readReelShared, writeReelShared, selectFootage } from "@/lib/reel-shared";

// Aumenta o limite de execução para 60s (Vercel Hobby permite até 300s)
export const maxDuration = 300;

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SearchResult { title: string; content: string; url: string }

interface GeneratedContent {
  postTitle: string;
  postBody: string;
  slides: string[];   // 2-3 insights para slides internos
  cta: string;        // pergunta para slide final
  instagramCaption: string;
  tags: string[];
  videoQueries?: string[]; // termos EN p/ buscar footage do Reel (opcional)
}

type Slot = "manha" | "tarde" | "noite";

// ─── Tópicos predefinidos (rotação semanal) ───────────────────────────────────

const TOPICS = [
  "Libertad mental",
  "Autoconocimiento profundo",
  "Redes sociales y el impacto negativo en las relaciones",
  "Adicción a las redes sociales",
  "Dopamina y recompensa inmediata",
  "Mucha elección, poca libertad",
  "Ansiedad moderna",
  "La trampa de la comparación social",
  "Soledad en la era hiperconectada",
  "La validación externa como droga",
  "El miedo al fracaso como parálisis",
  "Límites sanos y relaciones",
  "Procrastinación y culpa",
  "Neuroplasticidad: puedes cambiar",
  "Perfeccionismo y ansiedad",
  "El poder del aburrimiento",
  "Burnout emocional",
  "La máscara social y el yo real",
  "Desintoxicación digital",
  "Amor propio vs. autoexigencia",
  "El ego y el miedo",
];

// ─── Extrai keyword curta do tópico ──────────────────────────────────────────

function extractKeyword(topic: string): string {
  const STOP = new Set(["y","e","o","de","del","la","el","los","las","a","en","con","por","un","una","sus","su","al","se","lo"]);
  const word = topic.split(/\s+/).find(w => !STOP.has(w.toLowerCase())) ?? topic.split(" ")[0];
  return word.toUpperCase().replace(/[^A-ZÁÉÍÓÚÜÑ]/g, "");
}

// Categoria de direção de arte por tópico (espelha CATS em /api/og).
// Define cor + motivo procedural do slide. Mantenha em sincronia com og/route.tsx.
const TOPIC_CAT: Record<string, string> = {
  "Libertad mental": "freedom",
  "Autoconocimiento profundo": "self",
  "Redes sociales y el impacto negativo en las relaciones": "network",
  "Adicción a las redes sociales": "dopamine",
  "Dopamina y recompensa inmediata": "dopamine",
  "Mucha elección, poca libertad": "freedom",
  "Ansiedad moderna": "anxiety",
  "La trampa de la comparación social": "network",
  "Soledad en la era hiperconectada": "network",
  "La validación externa como droga": "dopamine",
  "El miedo al fracaso como parálisis": "anxiety",
  "Límites sanos y relaciones": "self",
  "Procrastinación y culpa": "anxiety",
  "Neuroplasticidad: puedes cambiar": "mind",
  "Perfeccionismo y ansiedad": "anxiety",
  "El poder del aburrimiento": "mind",
  "Burnout emocional": "anxiety",
  "La máscara social y el yo real": "self",
  "Desintoxicación digital": "dopamine",
  "Amor propio vs. autoexigencia": "self",
  "El ego y el miedo": "self",
};

// Desenho (motif) por TEMA — 1:1, espelha os MOTIF_IDS de /api/og.
// A cor vem da categoria (TOPIC_CAT); o DESENHO é único por tema.
// Mantenha em sincronia com og/route.tsx (type MotifId / MOTIF_IDS).
const TOPIC_MOTIF: Record<string, string> = {
  "Libertad mental": "gateway",
  "Autoconocimiento profundo": "iris",
  "Redes sociales y el impacto negativo en las relaciones": "web",
  "Adicción a las redes sociales": "spiral",
  "Dopamina y recompensa inmediata": "burst",
  "Mucha elección, poca libertad": "branches",
  "Ansiedad moderna": "waves",
  "La trampa de la comparación social": "bars",
  "Soledad en la era hiperconectada": "isolation",
  "La validación externa como droga": "ripple",
  "El miedo al fracaso como parálisis": "descent",
  "Límites sanos y relaciones": "boundary",
  "Procrastinación y culpa": "clock",
  "Neuroplasticidad: puedes cambiar": "synapse",
  "Perfeccionismo y ansiedad": "squares",
  "El poder del aburrimiento": "orbit",
  "Burnout emocional": "decay",
  "La máscara social y el yo real": "masks",
  "Desintoxicación digital": "unplug",
  "Amor propio vs. autoexigencia": "embrace",
  "El ego y el miedo": "mirror",
};

// Subject (metáfora visual, em inglês p/ melhor aderência do Flux) por TEMA.
// Vira o slot {SUBJECT} do prompt de marca em src/lib/illustration.ts.
// Colado a TOPIC_CAT/TOPIC_MOTIF — adicionar tema = atualizar os três.
const TOPIC_SUBJECT: Record<string, string> = {
  "Libertad mental": "an open birdcage with its door ajar and a single bird flying out toward open sky",
  "Autoconocimiento profundo": "a human head in profile that opens like a door, a tiny figure exploring the inner landscape",
  "Redes sociales y el impacto negativo en las relaciones": "two figures tethered by tangled threads to glowing phones, drifting apart",
  "Adicción a las redes sociales": "a hand reaching into an endless downward spiral emerging from a phone screen",
  "Dopamina y recompensa inmediata": "a brain with a few glowing reward receptors and a single bright spark",
  "Mucha elección, poca libertad": "a small figure frozen before a wall of many identical doors",
  "Ansiedad moderna": "a human head wrapped and entangled in a chaotic ball of yarn",
  "La trampa de la comparación social": "two figures standing on uneven balance scales, measuring themselves",
  "Soledad en la era hiperconectada": "a tiny solitary figure in vast empty space, surrounded by distant glowing screens",
  "La validación externa como droga": "a figure reaching up for floating heart-shaped fruits just out of reach",
  "El miedo al fracaso como parálisis": "a small figure frozen at the foot of an impossibly tall ladder",
  "Límites sanos y relaciones": "a calm figure inside a clear circular garden wall, others gently kept outside",
  "Procrastinación y culpa": "a figure pushing a heavy boulder made of melting clocks uphill",
  "Neuroplasticidad: puedes cambiar": "a brain growing like a young tree, roots rewiring into new pathways",
  "Perfeccionismo y ansiedad": "a figure endlessly polishing a cracked marble sculpture of itself",
  "El poder del aburrimiento": "a lone figure gazing at a vast empty horizon, a single seed sprouting nearby",
  "Burnout emocional": "a burnt-down candle shaped like a human figure, last wisp of smoke",
  "La máscara social y el yo real": "a figure slowly lifting an expressionless mask away from its real face",
  "Desintoxicación digital": "a smartphone dissolving into a flock of small birds flying free",
  "Amor propio vs. autoexigencia": "a figure tenderly embracing itself, watering its own roots",
  "El ego y el miedo": "a small fearful figure casting an enormous grandiose shadow on the wall",
};

// runIndex 0..5 → um dos 6 horários do dia. Garante 6 tópicos DISTINTOS por dia
// (o esquema antigo, por dia-da-semana+slot, repetia o tópico nos 2 crons do mesmo
//  slot e o 2º era barrado pela checagem de duplicata → só 3 posts/dia de fato).
function getTopicForRun(date: Date, runIndex: number): string {
  const start     = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const weekNum   = Math.floor(dayOfYear / 7);

  // Embaralha deterministicamente por semana
  const arr = [...TOPICS];
  let seed = weekNum * 6364136223846793005 + 1442695040888963407;
  for (let i = arr.length - 1; i > 0; i--) {
    seed = Math.imul(seed, 1664525) + 1013904223;
    const j = Math.abs(seed) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  // 6 índices consecutivos por dia (distintos mod TOPICS.length); avança a cada dia.
  const idx = (dayOfYear * 6 + runIndex) % arr.length;
  return arr[idx];
}

// Tom editorial derivado do horário (3 slots), independente do tópico.
const SLOT_FOR_RUN: Slot[] = ["manha", "tarde", "noite", "manha", "tarde", "noite"];

// ─── Instruções por slot ──────────────────────────────────────────────────────

const SLOT_INSTRUCTIONS: Record<Slot, string> = {
  manha: "Ángulo MAÑANA: reflexivo e inspirador. Invita al lector a empezar el día con mayor consciencia. Tono suave y profundo.",
  tarde: "Ángulo TARDE: práctico e informativo. Explica mecanismos, datos o consejos concretos. Tono directo y útil.",
  noite: "Ángulo NOCHE: provocador y de alto engagement. Termina con una pregunta o insight que genere debate. Tono audaz.",
};

// ─── Pesquisa de contexto ─────────────────────────────────────────────────────

async function searchTopic(topic: string, automation: Automation): Promise<SearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: topic + " psicología neurociencia",
      search_depth: "advanced",
      max_results: 5,
      include_answer: true,
    }),
  });
  if (!res.ok) throw new Error(`Tavily error: ${res.status}`);
  await logSpend({ automation, platform: "tavily", operation: "search", model: "advanced", units: 1, costUsd: tavilyCost() });
  const data = await res.json();
  return (data.results ?? []).map((r: any) => ({
    title: r.title ?? "", content: r.content ?? "", url: r.url ?? "",
  }));
}

// ─── Geração de conteúdo via Claude ──────────────────────────────────────────

async function generateContent(
  topic: string,
  searchResults: SearchResult[],
  slot: Slot,
  lang: Lang = "es",
  automation: Automation
): Promise<GeneratedContent> {
  const acc = accountFor(lang);
  const L = acc.langName; // "español" | "português do Brasil"
  const context = searchResults.map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`).join("\n\n");

  const marketSection = acc.marketBrief
    ? `\nMERCADO / VOZ NATIVA — LEIA ANTES DE TUDO (vale mais que qualquer exemplo abaixo):\n${acc.marketBrief}\n`
    : "";

  const prompt = `Eres el editor de ${acc.brand}, estudio editorial sobre psicología, atención y ${acc.freedom} mental.

IMPORTANTE — IDIOMA: genera ABSOLUTAMENTE TODA la salida (postTitle, postBody, slides, cta, instagramCaption, tags) en ${L}. NO mezcles idiomas. (videoQueries es la ÚNICA excepción: va en inglés.)
${marketSection}
Tema: "${topic}"
${SLOT_INSTRUCTIONS[slot]}

REGLA DE MARCA (${acc.brand}): aborda CUALQUIER tema desde el ángulo de la ${acc.freedom.toUpperCase()} mental — recuperar el control, la atención y la autonomía frente a lo que nos esclaviza (algoritmos, validación, miedo, hábitos). El título y al menos uno de los insights deben conectar explícitamente con esa idea de ${acc.freedom}/liberación. Nada de psicología genérica: siempre remite a la marca.

MOTOR DE ALCANCE (reglas basadas en datos reales del perfil — lo que más empuja el algoritmo es RETENCIÓN + GUARDADOS + COMPARTIDOS, hoy casi en cero):
- GANCHO: el título y el PRIMER insight deben detener el scroll en 1-2 segundos. Háblale a "tú", abre una brecha de curiosidad o da un giro inesperado. Concreto y específico, nunca abstracto ni genérico (ej. "Revisas el móvil 144 veces al día" > "El uso del móvil es alto").
- GUARDABLE: al menos UN insight debe ser un reencuadre o micro-método accionable que la persona quiera GUARDAR para releer (algo aplicable, no solo bonito).
- COMPARTIBLE: el cta debe invitar a comentar Y a etiquetar/compartir con alguien ("¿Conoces a alguien que…?", "Etiqueta a quien…"), porque etiquetar = compartir.
- La leyenda debe cerrar SIEMPRE con un llamado explícito a guardar (🔖) y a compartir (📩) antes de los hashtags.

Contexto investigado:
${context}

Genera un JSON válido (sin markdown, sin backticks) con esta estructura EXACTA:
{
  "postTitle": "GANCHO que detiene el scroll, máx 55 chars, concreto y dirigido a 'tú', en ${L}",
  "postBody": "artículo en markdown mín 300 palabras, TODO EN ${L}",
  "slides": [
    "insight 1 — GANCHO contundente de MÁXIMO 80 chars que abre una brecha de curiosidad",
    "insight 2 — frase contundente de MÁXIMO 80 chars que profundiza",
    "insight 3 — reencuadre o micro-método GUARDABLE de MÁXIMO 80 chars que remata"
  ],
  "cta": "pregunta de 60-100 chars que invite a comentar y a etiquetar/compartir con alguien, en ${L}",
  "instagramCaption": "leyenda IG máx 2200 chars: gancho fuerte en la 1ª línea + desarrollo + cierre con CTA de guardar (🔖) y compartir (📩) + 4-5 hashtags, en ${L}",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "videoQueries": [
    "término de búsqueda EN INGLÉS para video de stock que represente VISUALMENTE la escena/emoción de ESTE post — concreto y filmable (personas, gestos, objetos, lugares), NO metáfora abstracta. Ej: 'person scrolling phone in bed at night'",
    "segundo término distinto EN INGLÉS, mismo criterio. Ej: 'tired woman staring at glowing screen'",
    "tercer término distinto EN INGLÉS, mismo criterio. Ej: 'hands holding smartphone dark room'"
  ]
}

Para "videoQueries": 3 frases EN INGLÉS, 3-6 palabras, escenas REALES y filmables (no ilustraciones ni metáforas). Deben poder encontrarse en un banco de video como Pexels y conectar con el tema del post.`;

  // O haiku ocasionalmente devolve JSON malformado → o post falhava silencioso.
  // Tentamos 2×: extrai o objeto (parseContentJson) e, se o parse falhar, regenera.
  const MAX_CONTENT_TRIES = 2;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_CONTENT_TRIES; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
    const data = await res.json();
    await logSpend({ automation, platform: "anthropic", operation: "content", model: "claude-haiku-4-5-20251001", units: (data?.usage?.input_tokens ?? 0) + (data?.usage?.output_tokens ?? 0), costUsd: anthropicCost("claude-haiku-4-5-20251001", data?.usage) });
    const raw = data.content?.[0]?.text ?? "";
    try {
      return parseContentJson<GeneratedContent>(raw);
    } catch (e) {
      lastErr = e; // JSON malformado → regenera na próxima volta
    }
  }
  throw new Error(`generateContent: JSON inválido após ${MAX_CONTENT_TRIES} tentativas: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
}

// ─── Token do Instagram ───────────────────────────────────────────────────────

async function getAccessToken(lang: Lang = "es"): Promise<string> {
  const acc = accountFor(lang);
  // ES: token no config do DB (refresh automático) → env. PT: só env.
  if (acc.dbTokenKey) {
    try {
      const { sql } = await import("@vercel/postgres");
      const rows = await sql`SELECT value FROM config WHERE key = ${acc.dbTokenKey}`;
      if (rows.rows[0]?.value) return rows.rows[0].value;
    } catch { /* fallback */ }
  }
  return process.env[acc.tokenEnv] ?? "";
}

// ─── Publicação como carrossel ────────────────────────────────────────────────

async function publishCarousel(
  caption: string,
  imageUrls: string[],
  lang: Lang = "es",
): Promise<string> {
  const acc = accountFor(lang);
  const accountId = process.env[acc.accountIdEnv] ?? "";
  const token     = await getAccessToken(lang);
  const base      = `https://graph.instagram.com/v25.0/${accountId}`;

  // 1. Criar container para cada slide
  const childIds: string[] = [];
  for (const url of imageUrls) {
    const r = await fetch(`${base}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: token }),
    });
    if (!r.ok) throw new Error(`Carousel child error: ${await r.text()}`);
    const { id } = await r.json();
    childIds.push(id);
    await new Promise(res => setTimeout(res, 800)); // pausa entre criações
  }

  // 2. Criar container do carrossel
  const carRes = await fetch(`${base}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption,
      access_token: token,
    }),
  });
  if (!carRes.ok) throw new Error(`Carousel container error: ${await carRes.text()}`);
  const { id: carId } = await carRes.json();

  // 3. Aguardar processamento
  await new Promise(res => setTimeout(res, 3000));

  // 4. Publicar
  const pubRes = await fetch(`${base}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: carId, access_token: token }),
  });
  if (!pubRes.ok) throw new Error(`Carousel publish error: ${await pubRes.text()}`);
  const { id: postId } = await pubRes.json();
  return postId;
}

// ─── Salvar no banco ──────────────────────────────────────────────────────────

async function savePost(params: {
  topic: string; slot: Slot; title: string; body: string;
  instagramCaption: string; tags: string[];
  instagramPostId: string | null; publishedAt: Date;
}): Promise<void> {
  const { sql } = await import("@vercel/postgres");
  await sql`
    INSERT INTO posts (
      topic, slot, title, content, body, instagram_caption,
      tags, instagram_post_id, published_at
    ) VALUES (
      ${params.topic}, ${params.slot}, ${params.title},
      ${params.body}, ${params.body}, ${params.instagramCaption},
      ${"{" + params.tags.join(",") + "}"},
      ${params.instagramPostId}, ${params.publishedAt.toISOString()}
    )
  `;
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const slotParam = sp.get("slot") as Slot | null;
  const runParam = sp.get("run");
  const topicOverride = sp.get("topic");
  const force = sp.get("force") === "1"; // ignora a trava anti-duplicata de 24h (re-publicação/backfill manual)
  const lang = getLang(sp.get("lang")); // "es" (default, conta atual) | "pt"

  // Quais "runs" (0..5) processar nesta chamada:
  // • ?run=N  → exatamente esse horário (caminho do cron, 1 post distinto por horário)
  // • ?slot=  → um horário representativo daquele slot (1 post)
  // • vazio   → os 3 slots base (compatível com o disparo manual antigo)
  let runs: number[];
  if (runParam !== null && /^[0-5]$/.test(runParam)) {
    runs = [parseInt(runParam, 10)];
  } else if (slotParam && ["manha", "tarde", "noite"].includes(slotParam)) {
    runs = [{ manha: 0, tarde: 1, noite: 2 }[slotParam]];
  } else {
    runs = [0, 1, 2];
  }

  // Diagnóstico: roda só a geração da fal e devolve o resultado SEM publicar.
  if (sp.get("dryrun") === "1") {
    const r = runs[0];
    const topic = topicOverride ?? getTopicForRun(new Date(), r);
    const cat = TOPIC_CAT[topic] ?? "freedom";
    const subject = TOPIC_SUBJECT[topic] ?? "";
    // Teto: testes manuais entram no orçamento "manual" (evita o pico de dev).
    const gate = await checkBudget("manual", EST_RUN_COST.dryrun);
    if (!gate.ok) {
      return NextResponse.json({ blocked: true, automation: "manual", reason: `Orçamento diário estourado (gasto US$${gate.spent.toFixed(3)} + est US$${gate.est.toFixed(3)} > teto US$${gate.budget.toFixed(2)})`, gate }, { status: 402 });
    }
    // Testa a geração da ilustração SEM publicar (útil p/ validar a fal/FAL_KEY).
    // Diagnóstico: 1 tentativa só, e reusa o cache do dia (não paga em reruns).
    // ?fresh=1 força uma geração real na fal (quando o objetivo é mesmo testar a fal).
    const fresh = sp.get("fresh") === "1";
    const ill = await generateIllustration(subject, cat, { maxTries: 1, useCache: !fresh, automation: "manual" });
    return NextResponse.json({ dryrun: true, run: r, topic, cat, subject, illustration: ill, falKeyPresent: !!process.env.FAL_KEY });
  }

  // Prévia: gera o conteúdo do dia (e a ilustração da capa) e devolve SEM publicar.
  // Usado pelo pipeline de Reels — o vídeo é renderizado a partir deste mesmo
  // conteúdo, com a ilustração da fal como fundo da capa.
  if (sp.get("preview") === "1") {
    const r = runs[0];
    const slot = SLOT_FOR_RUN[r];
    const now = new Date();
    const topic = topicOverride ?? getTopicForRun(now, r);
    const cat = TOPIC_CAT[topic] ?? "freedom";

    // Teto: o preview é o pipeline do Reel diário.
    const gate = await checkBudget("ig-reels", EST_RUN_COST.preview);
    if (!gate.ok) {
      return NextResponse.json({ blocked: true, automation: "ig-reels", reason: `Orçamento diário estourado (gasto US$${gate.spent.toFixed(3)} + est US$${gate.est.toFixed(3)} > teto US$${gate.budget.toFixed(2)})`, gate }, { status: 402 });
    }

    // Base LÍNGUA-INDEPENDENTE compartilhada entre ES e PT (= MESMO vídeo): a
    // pesquisa (Tavily) e o footage (Pexels) são resolvidos UMA vez por (tópico,
    // dia) e cacheados; o 2º idioma reusa tudo. Só a COPY muda por idioma.
    const day = dayUTC();
    const shared = await readReelShared(topic, day);

    // Pesquisa: reusa a do cache (sem pagar Tavily de novo) ou busca agora.
    const searchResults = shared?.research?.length ? shared.research : await searchTopic(topic, "ig-reels");
    const content = await generateContent(topic, searchResults, slot, lang, "ig-reels");

    // videoQueries CANÔNICOS (inglês, língua-independente): do cache (1º idioma)
    // ou os recém-gerados. Garantem o mesmo footage entre os idiomas.
    const videoQueries = shared?.videoQueries?.length
      ? shared.videoQueries
      : (Array.isArray(content.videoQueries) ? content.videoQueries : []);

    // Footage: reusa os clipes do cache (vídeo IDÊNTICO ES/PT) ou seleciona agora
    // com seed de (tópico,dia) — independente de conta. Só cacheia quando há clipes.
    let clips: string[] = shared?.clips ?? [];
    if (!clips.length) {
      clips = await selectFootage(videoQueries, cat, hashStr(reelSharedKey(topic, day)));
      if (clips.length) await writeReelShared(topic, day, { research: searchResults, videoQueries, clips });
    }

    // Número de edição (mesma conta do fluxo de publicação)
    let editionNum = 1;
    try {
      const { sql } = await import("@vercel/postgres");
      const countResult = await sql`SELECT COUNT(*) as n FROM posts`;
      editionNum = (parseInt(countResult.rows[0]?.n ?? "0") || 0) + 1;
    } catch { /* fallback silencioso */ }
    const ed = String(editionNum).padStart(2, "0");
    const kw = extractKeyword(topic);

    // O Reel de VÍDEO usa FOOTAGE de banco (Pexels) — NÃO gera ilustração na fal
    // aqui (economia; o preview roda várias vezes/dia). EXCEÇÃO: ?illus=1 — o Reel
    // CLÁSSICO (slide animado) usa a ilustração de fundo, então gera sob demanda.
    // Quando gera, reusa o cache do dia e usa 1 tentativa (evita pagar o loop 3×
    // só pra prévia) e contabiliza o gasto na automação ig-reels.
    let illustrationUrl: string | null = null;
    let illustrationError: string | null = null;
    if (sp.get("illus") === "1") {
      const ill = await generateIllustration(TOPIC_SUBJECT[topic] ?? "", cat, { maxTries: 1, automation: "ig-reels" });
      illustrationUrl = ill.url ?? null;
      illustrationError = ill.error ?? null;
    }

    return NextResponse.json({
      preview: true,
      slot, run: r, topic, cat,
      lang,
      handle: accountFor(lang).handle, // @ correto por idioma (criativo do Reel)
      brand: accountFor(lang).brand, // nome de exibição por idioma
      title: content.postTitle,
      slides: content.slides,
      accentWords: [],
      cta: content.cta,
      caption: content.instagramCaption,
      kw, ed,
      videoQueries, // canônicos (compartilhados entre idiomas)
      clips,        // footage COMPARTILHADO (mesmo vídeo ES/PT); [] → fetch-footage.mjs busca no CI
      sharedFootage: clips.length > 0, // diagnóstico: veio da base compartilhada?
      illustration: illustrationUrl,
      illustrationError,
    });
  }

  const results = [];
  let anyBlocked = false;

  try {
    for (const runIndex of runs) {
      const slot = SLOT_FOR_RUN[runIndex];
      const slotLog: Record<string, unknown> = { slot, run: runIndex };

      try {
        const now   = new Date();
        const topic = topicOverride ?? getTopicForRun(now, runIndex);
        slotLog.topic = topic;

        // Verificar se tópico já foi publicado hoje (a menos que force=1)
        if (!force) {
          try {
            const { sql } = await import("@vercel/postgres");
            const existing = await sql`SELECT id FROM posts WHERE topic = ${topic} AND published_at > NOW() - INTERVAL '24 hours' LIMIT 1`;
            if (existing.rows.length > 0) {
              slotLog.skipped = true;
              slotLog.reason = "Tópico já publicado nas últimas 24h";
              continue;
            }
          } catch { /* ignora erro de banco */ }
        }

        // Teto diário da automação ig-posts: se a próxima publicação estoura o
        // orçamento, BLOQUEIA (não gasta) e sinaliza p/ o GitHub Actions falhar.
        const gate = await checkBudget("ig-posts", EST_RUN_COST.publish);
        if (!gate.ok) {
          anyBlocked = true;
          slotLog.blocked = true;
          slotLog.reason = `Orçamento diário ig-posts estourado (gasto US$${gate.spent.toFixed(3)} + est US$${gate.est.toFixed(3)} > teto US$${gate.budget.toFixed(2)}). Suba budget:ig-posts em config p/ liberar.`;
          results.push(slotLog);
          continue;
        }

        // Pesquisa e geração
        const searchResults = await searchTopic(topic, "ig-posts");
        const content = await generateContent(topic, searchResults, slot, lang, "ig-posts");
        slotLog.title = content.postTitle;

        // Número de edição: total de posts já publicados + 1
        let editionNum = 1;
        try {
          const { sql } = await import("@vercel/postgres");
          const countResult = await sql`SELECT COUNT(*) as n FROM posts`;
          editionNum = (parseInt(countResult.rows[0]?.n ?? "0") || 0) + 1;
        } catch { /* fallback silencioso */ }
        const ed   = String(editionNum).padStart(2, "0");
        const kw   = extractKeyword(topic);
        // mood alterna: red para ímpares, ink para pares (igual ao EditorialGrid do site)
        const mood = editionNum % 2 === 0 ? "ink" : "red";

        // Construir URLs dos slides
        const base = process.env.PRODUCTION_URL ?? "https://www.drlibertad.com";
        const enc  = (s: string) => encodeURIComponent(s.slice(0, 120));
        const totalSlides = 2 + content.slides.length; // capa + insights + cta

        // Primeira tag como categoria do rodapé
        const tag = enc(content.tags[0] ?? kw);
        // Direção de arte do slide: cor (categoria) + desenho (motivo por tema)
        const cat   = TOPIC_CAT[topic] ?? "freedom";
        const motif = TOPIC_MOTIF[topic] ?? "gateway";

        // Ilustração por IA (fal/Flux) na CAPA. Falha → og usa o motivo abstrato.
        const ill = await generateIllustration(TOPIC_SUBJECT[topic] ?? "", cat, { automation: "ig-posts" });
        slotLog.illustration = ill.url ? "ia" : `fallback: ${ill.error ?? "?"}`;
        const imgParam = ill.url ? `&img=${encodeURIComponent(ill.url)}` : "";

        const slideUrls: string[] = [
          `${base}/api/og?slide=cover&slot=${slot}&title=${enc(content.postTitle)}&kw=${enc(kw)}&ed=${ed}&mood=${mood}&tag=${tag}&cat=${cat}&motif=${motif}${imgParam}&total=${totalSlides}&lang=${lang}`,
          ...content.slides.map((text, i) =>
            `${base}/api/og?slide=insight&slot=${slot}&text=${enc(text)}&num=${i + 2}&total=${totalSlides}&kw=${enc(kw)}&ed=${ed}&mood=${mood}&tag=${tag}&cat=${cat}&motif=${motif}&lang=${lang}`
          ),
          `${base}/api/og?slide=cta&slot=${slot}&text=${enc(content.cta)}&kw=${enc(kw)}&ed=${ed}&mood=${mood}&tag=${tag}&cat=${cat}&motif=${motif}&num=${totalSlides}&total=${totalSlides}&lang=${lang}`,
        ];

        // Publicar carrossel
        let instagramPostId: string | null = null;
        try {
          instagramPostId = await publishCarousel(content.instagramCaption, slideUrls, lang);
          slotLog.instagramPostId = instagramPostId;
          slotLog.slides = slideUrls.length;
        } catch (igErr) {
          slotLog.instagramError = String(igErr);
        }

        // Salvar no banco
        await savePost({
          topic, slot,
          title: content.postTitle,
          body: content.postBody,
          instagramCaption: content.instagramCaption,
          tags: content.tags,
          instagramPostId,
          publishedAt: now,
        });

        slotLog.ok = true;
      } catch (slotErr) {
        slotLog.ok    = false;
        slotLog.error = String(slotErr);
      }

      results.push(slotLog);
    }

    // Se alguma run foi bloqueada pelo teto, devolve 402 para o workflow falhar
    // (::error:: no GitHub Actions) e avisar o dono — mesmo que outras tenham ok.
    if (anyBlocked) {
      return NextResponse.json({ ok: false, blocked: true, posts: results }, { status: 402 });
    }
    return NextResponse.json({ ok: true, posts: results });
  } catch (err) {
    console.error("[publish] erro geral:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
