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
  searchResults: SearchResult[]
): Promise<GeneratedContent> {
  const context = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`)
    .join("\n\n");

  const prompt = `Você é o editor do Dr. Libertad, um estúdio editorial sobre psicologia, atenção e liberdade mental.

Tema do dia: "${topic}"

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
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  const raw = data.content?.[0]?.text ?? "";

  // Remove possíveis backticks de markdown antes de parsear
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean) as GeneratedContent;
}

// ─── Publicação no Instagram ──────────────────────────────────────────────────

async function publishInstagram(caption: string, imageUrl?: string): Promise<string> {
  const accountId = process.env.META_INSTAGRAM_ACCOUNT_ID!;
  const token = process.env.META_ACCESS_TOKEN!;
  const baseUrl = `https://graph.facebook.com/v19.0/${accountId}`;

  // Etapa 1: criar container de mídia
  const containerBody: Record<string, string> = {
    caption,
    access_token: token,
  };

  if (imageUrl) {
    containerBody.image_url = imageUrl;
    containerBody.media_type = "IMAGE";
  } else {
    // Post de apenas texto não é suportado — usa imagem padrão da marca
    containerBody.image_url = process.env.META_DEFAULT_IMAGE_URL ?? "";
    containerBody.media_type = "IMAGE";
  }

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

  // Etapa 2: publicar o container
  const publishRes = await fetch(`${baseUrl}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: token,
    }),
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
  title: string;
  body: string;
  instagramCaption: string;
  tags: string[];
  instagramPostId: string | null;
  publishedAt: Date;
}): Promise<void> {
  // Importação dinâmica para não quebrar em ambientes sem @vercel/postgres
  const { sql } = await import("@vercel/postgres");

  await sql`
    INSERT INTO posts (
      topic, title, body, instagram_caption,
      tags, instagram_post_id, published_at
    ) VALUES (
      ${params.topic},
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

  // Tema do dia: pode vir de variável de ambiente, banco ou fila
  const topic =
    req.nextUrl.searchParams.get("topic") ??
    process.env.DAILY_TOPIC ??
    "ansiedade moderna e como a atenção se tornou o novo recurso escasso";

  const log: Record<string, unknown> = { topic, startedAt: new Date().toISOString() };

  try {
    // 1. Pesquisar
    log.step = "pesquisa";
    const searchResults = await searchTopic(topic);
    log.resultsFound = searchResults.length;

    // 2. Gerar conteúdo
    log.step = "geracao";
    const content = await generateContent(topic, searchResults);
    log.postTitle = content.postTitle;

    // 3. Publicar no Instagram
    log.step = "instagram";
    let instagramPostId: string | null = null;
    try {
      instagramPostId = await publishInstagram(content.instagramCaption);
      log.instagramPostId = instagramPostId;
    } catch (igErr) {
      // Falha no Instagram não impede salvar no site
      log.instagramError = String(igErr);
    }

    // 4. Salvar no banco
    log.step = "banco";
    await savePost({
      topic,
      title: content.postTitle,
      body: content.postBody,
      instagramCaption: content.instagramCaption,
      tags: content.tags,
      instagramPostId,
      publishedAt: new Date(),
    });

    log.step = "concluido";
    log.finishedAt = new Date().toISOString();

    return NextResponse.json({ ok: true, log });
  } catch (err) {
    console.error("[publish] erro na etapa:", log.step, err);
    return NextResponse.json(
      { ok: false, step: log.step, error: String(err), log },
      { status: 500 }
    );
  }
}
