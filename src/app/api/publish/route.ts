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
    "Post da MANHÃ: ângulo reflexivo/inspirador. Começa o dia gerando consciência sobre o tema. Tom mais suave, convida à reflexão.",
  tarde:
    "Post da TARDE: ângulo prático/informativo. Aprofunda o tema com dados, dicas concretas ou mecanismos explicados. Tom direto e útil.",
  noite:
    "Post da NOITE: ângulo provocativo/engajador. Termina o dia com uma pergunta, insight polêmico ou chamada à ação. Tom mais ousado.",
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

  const prompt = `Você é o editor do Dr. Libertad, um estúdio editorial sobre psicologia, atenção e liberdade mental.

Tema do dia: "${topic}"
${SLOT_INSTRUCTIONS[slot]}

Contexto pesquisado:
${context}

Gere um JSON válido (sem markdown, sem backticks) com exatamente esta estrutura:
{
  "postTitle": "título do post para o site (máx 80 chars, impactante)",
  "postBody": "corpo do post para o site em markdown. Mínimo 300 palavras. Tom editorial, direto, sem jargão. Use ## para subtítulos se necessário.",
  "instagramCaption": "legenda para o Instagram. Máx 2200 chars. Começa com gancho forte, depois o texto, termina com 3 a 5 hashtags relevantes em português.",
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
      max_tokens: 2048,
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
  const raw = process.env.META_IMAGE_URLS ?? process.env.META_DEFAULT_IMAGE_URL ?? "";
  const urls = raw.split(",").map((u) => u.trim()).filter(Boolean);
  if (urls.length === 0) return "";
  return urls[Math.floor(Math.random() * urls.length)];
}

// ─── Publicação no Instagram ──────────────────────────────────────────────────

async function publishInstagram(caption: string, imageUrl?: string): Promise<string> {
  const accountId = process.env.META_INSTAGRAM_ACCOUNT_ID!;
  const token = process.env.META_ACCESS_TOKEN!;
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
      topic, slot, title, body, instagram_caption,
      tags, instagram_post_id, published_at
    ) VALUES (
      ${params.topic},
      ${params.slot},
      ${params.title},
      ${params.body},
      ${params.instagramCaption},
      ${JSON.stringify(params.tags)},
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
    "ansiedade moderna e como a atenção se tornou o novo recurso escasso";

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
          instagramPostId = await publishInstagram(content.instagramCaption);
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
ts.push(slotLog);
    }

    return NextResponse.json({ ok: true, topic, posts: results });
  } catch (err) {
    console.error("[publish] erro geral:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
