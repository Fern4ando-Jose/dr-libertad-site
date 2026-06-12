import { NextResponse } from "next/server";

// Revalida a cada hora — assim o EDITORIAL se atualiza sozinho conforme novos posts são publicados.
export const revalidate = 3600;

export type EditorialPost = {
  id: string;
  issue: string;        // "ED. 12"
  kicker: string;       // categoria curta em maiúsculas
  title: string;        // título do artigo
  subtitle: string;     // gancho curto
  tags: string[];
  mood: "red" | "ink";
  image: string | null; // imagem real do post no Instagram
  permalink: string | null;
  body: string | null;  // artigo completo (do banco) para o modal
  publishedAt: string | null;
};

type IgMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  timestamp?: string;
};

type DbPost = {
  title: string;
  body: string;
  instagram_caption: string;
  tags: unknown;
  instagram_post_id: string | null;
  published_at: string;
};

const STOP = new Set([
  "y", "e", "o", "de", "del", "la", "el", "los", "las", "a", "en", "con",
  "por", "un", "una", "sus", "su", "al", "se", "lo", "que", "es", "tu",
]);

// Deriva uma palavra-chave curta (kicker) a partir de um texto.
function deriveKicker(text: string): string {
  const word =
    text
      .split(/\s+/)
      .map((w) => w.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, ""))
      .find((w) => w.length > 3 && !STOP.has(w.toLowerCase())) ?? "EDITORIAL";
  return word.toUpperCase().slice(0, 14);
}

// Extrai hashtags da legenda como tags.
function tagsFromCaption(caption: string): string[] {
  const matches = caption.match(/#[\wÁÉÍÓÚÜÑáéíóúüñ]+/g) ?? [];
  return matches.slice(0, 4).map((t) => t.replace(/^#/, "").toLowerCase());
}

// Primeira frase forte da legenda, limpa de markdown/emojis no início.
function firstSentence(caption: string): string {
  const clean = caption
    .replace(/\*\*/g, "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim();
  const sentence = clean.split(/(?<=[.!?])\s|\n/)[0] ?? clean;
  return sentence.slice(0, 90);
}

function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return raw.replace(/[{}]/g, "").split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

async function fetchInstagram(): Promise<IgMedia[]> {
  const accountId = process.env.META_INSTAGRAM_ACCOUNT_ID;
  const token = process.env.META_ACCESS_TOKEN;
  if (!accountId || !token) return [];

  const fields = "id,caption,media_type,media_url,permalink,timestamp";
  const url = `https://graph.instagram.com/v25.0/${accountId}/media?fields=${fields}&limit=24&access_token=${token}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? []) as IgMedia[];
  } catch {
    return [];
  }
}

async function fetchDbPosts(): Promise<DbPost[]> {
  try {
    const { sql } = await import("@vercel/postgres");
    const rows = await sql<DbPost>`
      SELECT title, body, instagram_caption, tags, instagram_post_id, published_at
      FROM posts
      ORDER BY published_at DESC
      LIMIT 60
    `;
    return rows.rows;
  } catch {
    return [];
  }
}

export async function GET() {
  const [igMedia, dbPosts] = await Promise.all([fetchInstagram(), fetchDbPosts()]);

  // Mapa instagram_post_id -> registro do banco (título + corpo completos).
  const dbById = new Map<string, DbPost>();
  for (const p of dbPosts) {
    if (p.instagram_post_id) dbById.set(p.instagram_post_id, p);
  }

  let posts: EditorialPost[] = [];

  if (igMedia.length > 0) {
    // Fonte primária: posts reais do Instagram, enriquecidos com o artigo do banco.
    posts = igMedia.map((m, idx) => {
      const db = dbById.get(m.id);
      const caption = m.caption ?? db?.instagram_caption ?? "";
      const title = db?.title ?? firstSentence(caption) ?? "DR. LIBERTAD";
      const tags = db ? normalizeTags(db.tags) : tagsFromCaption(caption);
      const kicker = (tags[0] ?? deriveKicker(title)).toUpperCase().slice(0, 14);
      return {
        id: m.id,
        issue: `ED. ${String(igMedia.length - idx).padStart(2, "0")}`,
        kicker,
        title: title.toUpperCase(),
        subtitle: firstSentence(caption.replace(title, "")) || firstSentence(caption),
        tags,
        mood: idx % 2 === 0 ? "red" : "ink",
        image: m.media_url ?? null,
        permalink: m.permalink ?? null,
        body: db?.body ?? caption ?? null,
        publishedAt: m.timestamp ?? db?.published_at ?? null,
      } satisfies EditorialPost;
    });
  } else if (dbPosts.length > 0) {
    // Fallback: só o banco (sem imagem real → o cliente usa a arte gerada /api/og).
    posts = dbPosts.map((p, idx) => {
      const tags = normalizeTags(p.tags);
      return {
        id: p.instagram_post_id ?? `db-${idx}`,
        issue: `ED. ${String(dbPosts.length - idx).padStart(2, "0")}`,
        kicker: (tags[0] ?? deriveKicker(p.title)).toUpperCase().slice(0, 14),
        title: p.title.toUpperCase(),
        subtitle: firstSentence(p.instagram_caption),
        tags,
        mood: idx % 2 === 0 ? "red" : "ink",
        image: null,
        permalink: p.instagram_post_id
          ? `https://www.instagram.com/p/${p.instagram_post_id}/`
          : null,
        body: p.body,
        publishedAt: p.published_at,
      } satisfies EditorialPost;
    });
  }

  return NextResponse.json(
    { posts },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
