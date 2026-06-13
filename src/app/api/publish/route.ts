import { NextRequest, NextResponse } from "next/server";

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

async function searchTopic(topic: string): Promise<SearchResult[]> {
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
  const data = await res.json();
  return (data.results ?? []).map((r: any) => ({
    title: r.title ?? "", content: r.content ?? "", url: r.url ?? "",
  }));
}

// ─── Geração de conteúdo via Claude ──────────────────────────────────────────

async function generateContent(
  topic: string,
  searchResults: SearchResult[],
  slot: Slot
): Promise<GeneratedContent> {
  const context = searchResults.map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`).join("\n\n");

  const prompt = `Eres el editor de Dr. Libertad, estudio editorial sobre psicología, atención y libertad mental.

Tema: "${topic}"
${SLOT_INSTRUCTIONS[slot]}

REGLA DE MARCA (Dr. Libertad): aborda CUALQUIER tema desde el ángulo de la LIBERTAD mental — recuperar el control, la atención y la autonomía frente a lo que nos esclaviza (algoritmos, validación, miedo, hábitos). El título y al menos uno de los insights deben conectar explícitamente con esa idea de libertad/liberación. Nada de psicología genérica: siempre remite a la marca.

Contexto investigado:
${context}

Genera un JSON válido (sin markdown, sin backticks) con esta estructura EXACTA:
{
  "postTitle": "título impactante máx 55 chars, en español",
  "postBody": "artículo en markdown mín 300 palabras, TODO EN ESPAÑOL",
  "slides": [
    "insight 1 — frase contundente de MÁXIMO 80 chars que desarrolla el tema",
    "insight 2 — frase contundente de MÁXIMO 80 chars que profundiza",
    "insight 3 — frase contundente de MÁXIMO 80 chars que remata"
  ],
  "cta": "pregunta provocadora de 60-100 chars que genere comentarios, en español",
  "instagramCaption": "leyenda IG máx 2200 chars, gancho fuerte + texto + 4-5 hashtags en español",
  "tags": ["tag1", "tag2", "tag3", "tag4"]
}`;

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
  const raw  = data.content?.[0]?.text ?? "";
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean) as GeneratedContent;
}

// ─── Token do Instagram ───────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  try {
    const { sql } = await import("@vercel/postgres");
    const rows = await sql`SELECT value FROM config WHERE key = 'meta_access_token'`;
    if (rows.rows[0]?.value) return rows.rows[0].value;
  } catch { /* fallback */ }
  return process.env.META_ACCESS_TOKEN!;
}

// ─── Publicação como carrossel ────────────────────────────────────────────────

async function publishCarousel(
  caption: string,
  imageUrls: string[],
): Promise<string> {
  const accountId = process.env.META_INSTAGRAM_ACCOUNT_ID!;
  const token     = await getAccessToken();
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

  const results = [];

  try {
    for (const runIndex of runs) {
      const slot = SLOT_FOR_RUN[runIndex];
      const slotLog: Record<string, unknown> = { slot, run: runIndex };

      try {
        const now   = new Date();
        const topic = topicOverride ?? getTopicForRun(now, runIndex);
        slotLog.topic = topic;

        // Verificar se tópico já foi publicado hoje
        try {
          const { sql } = await import("@vercel/postgres");
          const existing = await sql`SELECT id FROM posts WHERE topic = ${topic} AND published_at > NOW() - INTERVAL '24 hours' LIMIT 1`;
          if (existing.rows.length > 0) {
            slotLog.skipped = true;
            slotLog.reason = "Tópico já publicado nas últimas 24h";
            continue;
          }
        } catch { /* ignora erro de banco */ }

        // Pesquisa e geração
        const searchResults = await searchTopic(topic);
        const content = await generateContent(topic, searchResults, slot);
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
        // Categoria de direção de arte (cor + motivo) do slide
        const cat = TOPIC_CAT[topic] ?? "freedom";

        const slideUrls: string[] = [
          `${base}/api/og?slide=cover&slot=${slot}&title=${enc(content.postTitle)}&kw=${enc(kw)}&ed=${ed}&mood=${mood}&tag=${tag}&cat=${cat}&total=${totalSlides}`,
          ...content.slides.map((text, i) =>
            `${base}/api/og?slide=insight&slot=${slot}&text=${enc(text)}&num=${i + 2}&total=${totalSlides}&kw=${enc(kw)}&ed=${ed}&mood=${mood}&tag=${tag}&cat=${cat}`
          ),
          `${base}/api/og?slide=cta&slot=${slot}&text=${enc(content.cta)}&kw=${enc(kw)}&ed=${ed}&mood=${mood}&tag=${tag}&cat=${cat}&num=${totalSlides}&total=${totalSlides}`,
        ];

        // Publicar carrossel
        let instagramPostId: string | null = null;
        try {
          instagramPostId = await publishCarousel(content.instagramCaption, slideUrls);
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

    return NextResponse.json({ ok: true, posts: results });
  } catch (err) {
    console.error("[publish] erro geral:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
