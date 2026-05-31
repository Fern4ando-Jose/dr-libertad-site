import { NextRequest, NextResponse } from "next/server";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface SearchResult {
  title: string;
  content: string;
  url: string;
}

interface GeneratedContent {
  postTitle: string;
  postBody: string;
  instagramCaption: string;
  tags: string[];
}

type Slot = "manha" | "tarde" | "noite";

const SLOT_INSTRUCTIONS: Record<Slot, string> = {
  manha:
    "Post de MAÑANA: ángulo reflexivo/inspirador. Empieza el día generando consciencia sobre el tema. Tono más suave, invita a la reflexión.",
  tarde:
    "Post de TARDE: ángulo práctico/informativo. Profundiza el tema con datos, consejos concretos o mecanismos explicados. Tono directo y útil.",
  noite:
    "Post de NOCHE: ángulo provocador/engagement. Termina el día con una pregunta, insight polémico o llamada a la acción. Tono más audaz.",
};

// ─── Helpers de pesquisa ─────────────────────────────────────────────────────

async function searchTopic(topic: string): Promise<SearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: topic,
      search_depth: "advanced",
      max_results: 5,
      include_answer: true,
    }),
  });

  if (!res.ok) throw new Error(`Tavily error: ${res.status}`);
  const data = await res.json();

  return (data.results ?? []).map((r: any) => ({
    title: r.title ?? "",
    content: r.content ?? "",
    url: r.url ?? "",
  }));
}

// ─── Geração de conteúdo via Claude ──────────────────────────────────────────

async function generateContent(
  topic: string,
  searchResults: SearchResult[],
  slot: Slot
): Promise<GeneratedContent> {
  const context = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`)
    .join("\n\n");

  const prompt = `Eres el editor de Dr. Libertad, un estudio editorial sobre psicología, atención y libertad mental.

Tema del día: "${topic}"
${SLOT_INSTRUCTIONS[slot]}

Contexto investigado:
${context}

Genera un JSON válido (sin markdown, sin backticks) con exactamente esta estructura:
{
  "postTitle": "título del post para el sitio (máx 80 chars, impactante, en español)",
  "postBody": "cuerpo del post para el sitio en markdown. Mínimo 300 palabras. Tono editorial, directo, sin jerga. Usa ## para subtítulos si es necesario. TODO EN ESPAÑOL.",
  "instagramCaption": "leyenda para Instagram. Máx 2200 chars. Empieza con un gancho fuerte, luego el texto, termina con 3 a 5 hashtags relevantes en español. TODO EN ESPAÑOL.",
  "tags": ["tag1", "tag2", "tag3"]
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
  const raw = data.content?.[0]?.text ?? "";

  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean) as GeneratedContent;
}

// ─── Seleciona imagem aleatória do pool ──────────────────────────────────────

function getRandomImageUrl(): string {
  const raw = process.env.META_IMAGE_URLS ?? process.env.META_DEFAULT_IMAGE_URL ?? "https://raw.githubusercontent.com/Fern4ando-Jose/dr-libertad-site/main/Public/images/post-1.jpg";
  const FALLBACK_IMG = "https://raw.githubusercontent.com/Fern4ando-Jose/dr-libertad-site/main/Public/images/post-1.jpg";
  const urls = raw.split(",").map((u) => u.trim()).filter(u => u && !u.includes("drlibertad.com/images/post-1.jpg"));
  if (urls.length === 0) return FALLBACK_IMG;
  if (urls.length === 0) return "";
  return urls[Math.floor(Math.random() * urls.length)];
}

// ─── Token do Instagram (banco > env var) ────────────────────────────────────

async function getAccessToken(): Promise<string> {
  try {
    const { sql } = await import("@vercel/postgres");
    const rows = await sql`SELECT value FROM config WHERE key = 'meta_access_token'`;
    if (rows.rows[0]?.value) return rows.rows[0].value;
  } catch {
    // fallback silencioso para env var
  }
  return process.env.META_ACCESS_TOKEN!;
}

// ─── Publicação no Instagram ──────────────────────────────────────────────────

async function publishInstagram(caption: string, imageUrl?: string): Promise<string> {
  const accountId = process.env.META_INSTAGRAM_ACCOUNT_ID!;
  const token = await getAccessToken();
  const baseUrl = `https://graph.instagram.com/v25.0/${accountId}`;

  const containerBody: Record<string, string> = {
    caption,
    access_token: token,
    image_url: imageUrl ?? getRandomImageUrl(),
    media_type: "IMAGE",
  };

  const containerRes = await fetch(`${baseUrl}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(containerBody),
  });

  if (!containerRes.ok) {
    const err = await containerRes.text();
    throw new Error(`Instagram container error: ${err}`);
  }
  const { id: containerId } = await containerRes.json();

  // Aguardar 3s para container ser processado
  await new Promise((r) => setTimeout(r, 3000));

  const publishRes = await fetch(`${baseUrl}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: token }),
  });

  if (!publishRes.ok) {
    const err = await publishRes.text();
    throw new Error(`Instagram publish error: ${err}`);
  }
  const { id: postId } = await publishRes.json();
  return postId;
}

// ─── Salvar no banco (Vercel Postgres) ────────────────────────────────────────

async function savePost(params: {
  topic: string;
  slot: Slot;
  title: string;
  body: string;
  instagramCaption: string;
  tags: string[];
  instagramPostId: string | null;
  publishedAt: Date;
}): Promise<void> {
  const { sql } = await import("@vercel/postgres");

  await sql`
    INSERT INTO posts (
      topic, slot, title, content, body, instagram_caption,
      tags, instagram_post_id, published_at
    ) VALUES (
      ${params.topic},
      ${params.slot},
      ${params.title},
      ${params.body},
      ${params.body},
      ${params.instagramCaption},
      ${"{" + params.tags.join(",") + "}"},
      ${params.instagramPostId},
      ${params.publishedAt.toISOString()}
    )
  `;
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Proteção: só aceita chamadas com o secret correto
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Tema do dia
  const topic =
    req.nextUrl.searchParams.get("topic") ??
    process.env.DAILY_TOPIC ??
    "ansiedad moderna y cómo la atención se convirtió en el nuevo recurso escaso";

  // Se ?slot= for informado, publica apenas aquele slot; caso contrário, publica os 3
  const slotParam = req.nextUrl.searchParams.get("slot") as Slot | null;
  const slots: Slot[] = slotParam && ["manha", "tarde", "noite"].includes(slotParam)
    ? [slotParam]
    : ["manha", "tarde", "noite"];
  const results = [];

  try {
    // Pesquisa feita uma única vez — compartilhada pelos 3 posts
    const searchResults = await searchTopic(topic);

    for (const slot of slots) {
      const slotLog: Record<string, unknown> = { slot, topic };

      try {
        // Gerar conteúdo com ângulo específico do slot
        const content = await generateContent(topic, searchResults, slot);
        slotLog.title = content.postTitle;

        // Publicar no Instagram
        let instagramPostId: string | null = null;
        try {
          // Gerar URL da imagem com o template editorial
          // Sempre usa produção — Instagram rejeita URLs de preview
          const baseUrl = process.env.PRODUCTION_URL ?? "https://www.drlibertad.com";
          const shortTitle = content.postTitle.slice(0, 60);
          const ogUrl = `${baseUrl}/api/og?slot=${slot}&title=${encodeURIComponent(shortTitle)}`;
          instagramPostId = await publishInstagram(content.instagramCaption, ogUrl);
          slotLog.instagramPostId = instagramPostId;
        } catch (igErr) {
          slotLog.instagramError = String(igErr);
        }

        // Salvar no banco
        await savePost({
          topic,
          slot,
          title: content.postTitle,
          body: content.postBody,
          instagramCaption: content.instagramCaption,
          tags: content.tags,
          instagramPostId,
          publishedAt: new Date(),
        });

        slotLog.ok = true;
      } catch (slotErr) {
        slotLog.ok = false;
        slotLog.error = String(slotErr);
      }

      results.push(slotLog);
    }

    return NextResponse.json({ ok: true, topic, posts: results });
  } catch (err) {
    console.error("[publish] erro geral:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
