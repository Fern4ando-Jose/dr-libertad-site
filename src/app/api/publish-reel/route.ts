import { NextRequest, NextResponse } from "next/server";

// Publicação de REELS (vídeo) no @drlibertad via Instagram Graph API v25.
// O vídeo já precisa estar hospedado em URL pública (ex.: Vercel Blob).
// Recebe ?video=<url> e ?caption=<texto> (ou JSON no POST) e publica seguindo
// o fluxo: criar container REELS → polling de status → media_publish.

export const maxDuration = 300;

// ─── Token do Instagram (mesma estratégia do /api/publish) ────────────────────
async function getAccessToken(): Promise<string> {
  try {
    const { sql } = await import("@vercel/postgres");
    const rows = await sql`SELECT value FROM config WHERE key = 'meta_access_token'`;
    if (rows.rows[0]?.value) return rows.rows[0].value;
  } catch {
    /* fallback para env var */
  }
  return process.env.META_ACCESS_TOKEN!;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Publicação como REEL ─────────────────────────────────────────────────────
async function publishReel(videoUrl: string, caption: string): Promise<string> {
  const accountId = process.env.META_INSTAGRAM_ACCOUNT_ID!;
  const token = await getAccessToken();
  const base = `https://graph.instagram.com/v25.0/${accountId}`;

  // 1. Criar container do reel
  const createRes = await fetch(`${base}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      access_token: token,
    }),
  });
  if (!createRes.ok) throw new Error(`Reel container error: ${await createRes.text()}`);
  const { id: creationId } = await createRes.json();
  if (!creationId) throw new Error("Reel container sem creation_id");

  // 2. Polling do status — o vídeo precisa ser processado antes de publicar
  //    (pode levar 30–60s). Aborta em ERROR ou após ~12 tentativas (~60s).
  let finished = false;
  for (let attempt = 1; attempt <= 12; attempt++) {
    await sleep(5000);
    const statusRes = await fetch(
      `${base}/${creationId}?fields=status_code&access_token=${token}`
    );
    if (!statusRes.ok) {
      // erro transitório — segue tentando dentro do limite
      continue;
    }
    const { status_code } = await statusRes.json();
    if (status_code === "FINISHED") {
      finished = true;
      break;
    }
    if (status_code === "ERROR") {
      throw new Error(`Reel processamento falhou (status ERROR) na tentativa ${attempt}`);
    }
    // IN_PROGRESS / PUBLISHED / EXPIRED → continua o loop
  }
  if (!finished) throw new Error("Timeout: reel não finalizou o processamento a tempo");

  // 3. Publicar
  const pubRes = await fetch(`${base}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: token }),
  });
  if (!pubRes.ok) throw new Error(`Publish error: ${await pubRes.text()}`);
  const { id: postId } = await pubRes.json();
  return postId;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  // Autenticação do cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Lê parâmetros da querystring; se ausentes, tenta o body JSON (POST)
  const params = req.nextUrl.searchParams;
  let video = params.get("video") ?? "";
  let caption = params.get("caption") ?? "";
  const slot = params.get("slot") ?? ""; // opcional — só para log

  if ((!video || !caption) && req.method === "POST") {
    try {
      const body = await req.json();
      video = video || body.video || "";
      caption = caption || body.caption || "";
    } catch {
      /* sem body JSON — segue com o que veio da query */
    }
  }

  const log: Record<string, unknown> = { slot, video: video ? "(presente)" : "(ausente)" };

  if (!video) {
    return NextResponse.json({ ok: false, error: "Parâmetro 'video' (URL pública) é obrigatório" }, { status: 400 });
  }

  try {
    const postId = await publishReel(video, caption || "");
    log.postId = postId;
    log.ok = true;
    return NextResponse.json({ ok: true, postId, log });
  } catch (err) {
    console.error("[publish-reel] erro:", err);
    return NextResponse.json({ ok: false, error: String(err), log }, { status: 500 });
  }
}
