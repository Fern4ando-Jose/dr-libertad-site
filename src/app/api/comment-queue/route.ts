import { NextRequest, NextResponse } from "next/server";
import { ACCOUNTS, accountFor, type Lang, type AccountCfg } from "@/lib/accounts";
import { COMMENT_TARGETS, DAILY_COMMENT_CAP } from "@/lib/comment-targets";
import { rankFreshPosts, applyCapAndDedup, type DiscoveredPost } from "@/lib/comment-queue";

// Esteira de comentário assistida (outbound 1-clique) — FASE 1: PROBE.
// Lê, via business_discovery (oficial, read-only, GRÁTIS), os posts recentes das
// contas-alvo 1M+ e devolve: quais são lendíveis, seguidores AO VIVO e o engajamento
// (curtidas/comentários) dos últimos posts — já ranqueando os FRESCOS (comentar cedo).
// NÃO gera comentário (isso é a Fase 2, paga). NÃO comenta sozinho (a API não permite;
// o dono posta). Protegido por CRON_SECRET.
//
//   GET /api/comment-queue            → probe das duas contas (ES+PT)
//   GET /api/comment-queue?lang=es    → só uma
//
// ⚠️ business_discovery exige Instagram API COM Facebook Login + conta-alvo Business/
// Creator pública. Este probe confirma em produção se o nosso token consegue ler.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FRESH_MAX_AGE_MIN = 180;

function authorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

async function resolveToken(acc: AccountCfg): Promise<string> {
  if (acc.dbTokenKey) {
    try {
      const { sql } = await import("@vercel/postgres");
      const rows = await sql<{ value: string }>`SELECT value FROM config WHERE key = ${acc.dbTokenKey}`;
      if (rows.rows[0]?.value) return rows.rows[0].value;
    } catch { /* fallback */ }
  }
  return process.env[acc.tokenEnv] ?? "";
}

interface TargetResult {
  username: string;
  ok: boolean;
  followers?: number;
  error?: string;
  posts: DiscoveredPost[];
}

// Lê os posts recentes de UMA conta-alvo via business_discovery.
async function discover(accountId: string, token: string, username: string): Promise<TargetResult> {
  const fields = `business_discovery.username(${username}){followers_count,media_count,media.limit(6){id,caption,like_count,comments_count,timestamp,permalink,media_type}}`;
  const url = `https://graph.facebook.com/v25.0/${accountId}?fields=${encodeURIComponent(fields)}&access_token=${token}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      // Não logar o token; só o motivo da API.
      return { username, ok: false, error: data?.error?.message ?? `HTTP ${res.status}`, posts: [] };
    }
    const bd = data?.business_discovery;
    const posts: DiscoveredPost[] = (bd?.media?.data ?? []).map((m: Record<string, unknown>) => ({
      id: String(m.id ?? ""),
      permalink: m.permalink as string | undefined,
      caption: m.caption as string | undefined,
      like_count: typeof m.like_count === "number" ? m.like_count : undefined,
      comments_count: typeof m.comments_count === "number" ? m.comments_count : undefined,
      timestamp: m.timestamp as string | undefined,
      media_type: m.media_type as string | undefined,
    }));
    return { username, ok: true, followers: bd?.followers_count, posts };
  } catch (e) {
    return { username, ok: false, error: e instanceof Error ? e.message : "fetch_error", posts: [] };
  }
}

async function probeLang(lang: Lang, nowMs: number) {
  const acc = accountFor(lang);
  const accountId = process.env[acc.accountIdEnv] ?? "";
  const token = await resolveToken(acc);
  if (!accountId || !token) {
    return { lang, ok: false, error: "missing account id/token", targets: [] as TargetResult[], fresh: [] as unknown[] };
  }

  const targets = COMMENT_TARGETS[lang];
  const results: TargetResult[] = [];
  for (const t of targets) {
    results.push(await discover(accountId, token, t.username));
  }

  // Ranqueia os posts FRESCOS de todas as contas lendíveis (o que vale comentar AGORA).
  const ranked = rankFreshPosts(
    results.filter((r) => r.ok).map((r) => ({ target: r.username, posts: r.posts })),
    nowMs,
    FRESH_MAX_AGE_MIN,
  );
  const fresh = applyCapAndDedup(ranked, DAILY_COMMENT_CAP[lang], new Set()).map((it) => ({
    target: it.target,
    permalink: it.post.permalink,
    ageMin: Math.round(it.ageMin),
    likes: it.post.like_count ?? 0,
    comments: it.post.comments_count ?? 0,
    score: Math.round(it.score * 10) / 10,
  }));

  const readable = results.filter((r) => r.ok).length;
  return {
    lang,
    ok: true,
    discoverable: `${readable}/${targets.length}`,
    targets: results.map((r) => ({
      username: r.username,
      ok: r.ok,
      followers: r.followers,
      recentPosts: r.posts.length,
      error: r.error,
    })),
    fresh,
  };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const nowMs = Date.now();
  const langParam = req.nextUrl.searchParams.get("lang");
  const langs: Lang[] = langParam === "es" || langParam === "pt"
    ? [langParam]
    : (Object.keys(ACCOUNTS) as Lang[]);

  const out = [];
  for (const lang of langs) out.push(await probeLang(lang, nowMs));
  return NextResponse.json({ ok: true, phase: "probe", freshWindowMin: FRESH_MAX_AGE_MIN, results: out });
}
