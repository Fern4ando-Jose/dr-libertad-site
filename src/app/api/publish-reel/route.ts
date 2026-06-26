import { NextRequest, NextResponse } from "next/server";
import { Lang, accountFor, getLang } from "@/lib/accounts";
import { dayBRT, runAlreadyPublished, recordRun, topicUsedInOtherVaga, publishedId, bumpAttempt, isHardPublishBlock, attemptsToday, shouldStopRetrying, MAX_PUBLISH_ATTEMPTS, publishFailureMode } from "@/lib/run-ledger";

// Publicação de REELS (vídeo) no @drlibertad via Instagram Graph API v25.
// O vídeo já precisa estar hospedado em URL pública (ex.: Vercel Blob).
// Recebe ?video=<url> e ?caption=<texto> (ou JSON no POST) e publica seguindo
// o fluxo: criar container REELS → polling de status → media_publish.

export const maxDuration = 300;

// ─── Token do Instagram (mesma estratégia do /api/publish) ────────────────────
async function getAccessToken(lang: Lang = "es"): Promise<string> {
  const acc = accountFor(lang);
  // ES: token no config do DB (refresh automático) → env. PT: só env.
  if (acc.dbTokenKey) {
    try {
      const { sql } = await import("@vercel/postgres");
      const rows = await sql`SELECT value FROM config WHERE key = ${acc.dbTokenKey}`;
      if (rows.rows[0]?.value) return rows.rows[0].value;
    } catch {
      /* fallback para env var */
    }
  }
  return process.env[acc.tokenEnv] ?? "";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Publicação como REEL ─────────────────────────────────────────────────────
async function publishReel(videoUrl: string, caption: string, lang: Lang = "es"): Promise<string> {
  const acc = accountFor(lang);
  const accountId = process.env[acc.accountIdEnv] ?? "";
  const token = await getAccessToken(lang);
  const graphRoot = "https://graph.instagram.com/v25.0";
  const base = `${graphRoot}/${accountId}`;

  // 1. Criar container do reel
  // Capa = frame 0 (footage, SEM título por cima) — preferência do dono pelo visual
  // limpo. NÃO definir thumb_offset (tentamos 2000ms p/ mostrar o título, revertido:
  // o dono não quis o título na capa). Se um clipe sair escuro demais na capa, tratar
  // no FOOTAGE (clipe/seleção), não forçando um frame com texto.
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

  // 2. Polling do status — o vídeo precisa ser processado antes de publicar.
  //    Reels podem levar alguns minutos; espera até ~250s (a função permite 300s).
  //    Aborta em ERROR.
  let finished = false;
  let lastStatus = "?";
  for (let attempt = 1; attempt <= 50; attempt++) {
    await sleep(5000);
    // O container é consultado pelo seu ID na RAIZ do graph (NÃO sob o accountId).
    const statusRes = await fetch(
      `${graphRoot}/${creationId}?fields=status_code&access_token=${token}`
    );
    if (!statusRes.ok) {
      // erro transitório — segue tentando dentro do limite
      continue;
    }
    const { status_code } = await statusRes.json();
    lastStatus = status_code ?? "(sem status_code)";
    if (status_code === "FINISHED") {
      finished = true;
      break;
    }
    if (status_code === "ERROR") {
      throw new Error(`Reel processamento falhou (status ERROR) na tentativa ${attempt}`);
    }
    // IN_PROGRESS / PUBLISHED / EXPIRED → continua o loop
  }
  if (!finished) throw new Error(`Timeout: reel não finalizou (último status=${lastStatus})`);

  // 3. Publicar
  const pubRes = await fetch(`${base}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: token }),
  });
  if (!pubRes.ok) {
    const errText = await pubRes.text();
    // ANTI-FANTASMA no ERRO DURO (mesmo do carrossel): action-block/limite do IG
    // responde erro no media_publish MAS o Reel pode ir pro feed → se a gente lança,
    // a vaga fica com id NULL → catchup republica → Reel duplicado. Post provavelmente
    // VIVO → devolve o creation_id como SENTINELA (vaga gravada, ninguém republica).
    // Erro não-duro (post NÃO vivo) → lança; o disjuntor conta e o catchup pode tentar.
    if (publishFailureMode(errText) === "sentinel") return publishedId(undefined, creationId);
    throw new Error(`Publish error: ${errText}`);
  }
  // Publicação CONFIRMADA. Se vier sem `id`, o Reel está vivo → devolve o creation_id
  // como sentinela não-nula p/ a vaga ser gravada (anti "post-fantasma" → sem isso o
  // watchdog redispara a mesma vaga). Ver publishedId em run-ledger.
  const pubJson = await pubRes.json().catch(() => ({} as { id?: string }));
  return publishedId(pubJson?.id, creationId);
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
  const lang = getLang(params.get("lang")); // "es" (default) | "pt"
  const runParam = params.get("run");      // 0..3 — p/ o livro-razão/dedup do watchdog
  const run = runParam !== null && runParam !== "" ? parseInt(runParam, 10) : null;
  let topic = params.get("topic") ?? "";   // tópico do Reel → livro-razão (anti-dup cross-formato)
  const day = dayBRT();
  const force = params.get("force") === "1"; // backfill manual burla a trava de tópico

  if ((!video || !caption || !topic) && req.method === "POST") {
    try {
      const body = await req.json();
      video = video || body.video || "";
      caption = caption || body.caption || "";
      topic = topic || body.topic || "";
    } catch {
      /* sem body JSON — segue com o que veio da query */
    }
  }

  const log: Record<string, unknown> = { slot, video: video ? "(presente)" : "(ausente)" };

  if (!video) {
    return NextResponse.json({ ok: false, error: "Parâmetro 'video' (URL pública) é obrigatório" }, { status: 400 });
  }

  // Dedup por (dia,run,lang): se o watchdog redisparar um run que já saiu, NÃO
  // republica. Reel não tinha trava (carrossel tinha por tópico) — esta é a dele.
  if (run !== null && Number.isFinite(run) && await runAlreadyPublished(day, run, lang)) {
    return NextResponse.json({ ok: true, skipped: true, reason: `run ${run} (${lang}) já publicado hoje`, log });
  }

  // DISJUNTOR na FRONTEIRA do publish (mesmo do carrossel): se a vaga já desistiu hoje
  // (≥MAX tentativas — bloqueio duro do IG), NÃO republica. Sem isto, um action-block
  // que publica-mas-erra deixava id NULL e o catchup redisparava → Reel duplicado.
  // force=1 burla (backfill). Fail-open: attemptsToday=0 em erro → comportamento antigo.
  if (!force && run !== null && Number.isFinite(run) && shouldStopRetrying(await attemptsToday(day, run, lang))) {
    return NextResponse.json({ ok: true, skipped: true, reason: `run ${run} (${lang}) desistiu hoje (≥${MAX_PUBLISH_ATTEMPTS} tentativas) — disjuntor de publicação`, log });
  }

  // TRAVA DE PUBLICAÇÃO por TÓPICO (independente da seleção, a menos de force=1): se este
  // tema já saiu em OUTRA vaga (dia,run) em 7d — qualquer formato/idioma — NÃO republica.
  // EXCLUI a própria vaga → o par ES/PT do mesmo run (mesmo vídeo) passa. O reel não tinha
  // trava de tópico nenhuma; esta é a dele.
  if (!force && run !== null && Number.isFinite(run) && topic && await topicUsedInOtherVaga(day, run, topic)) {
    return NextResponse.json({ ok: true, skipped: true, reason: `tópico "${topic}" já saiu em outra vaga em 7d — trava de publicação`, log });
  }

  try {
    const postId = await publishReel(video, caption || "", lang);
    log.postId = postId;
    log.ok = true;
    // Livro-razão p/ o watchdog + anti-dup cross-formato (grava o tópico).
    // run 3 = Reel clássico; 0..2 = Reel footage.
    if (run !== null && Number.isFinite(run)) await recordRun(day, run, lang, run === 3 ? "reel-classic" : "reel", postId, topic || null);
    return NextResponse.json({ ok: true, postId, log });
  } catch (err) {
    console.error("[publish-reel] erro:", err);
    // Conta a tentativa falha (disjuntor): após MAX, o catchup para de redisparar a
    // vaga; bloqueio/limite do IG já estoura o contador na hora (insistir piora).
    if (run !== null && Number.isFinite(run)) await bumpAttempt(day, run, lang, isHardPublishBlock(err));
    return NextResponse.json({ ok: false, error: "erro ao publicar reel", log }, { status: 500 });
  }
}
