import { NextRequest, NextResponse } from "next/server";
import { getLang, accountFor } from "@/lib/accounts";
import { buildVoiceDirective } from "@/lib/voice";
import { buildCommentPrompt } from "@/lib/comment-queue";
import { generateText } from "@/lib/engagement";
import { checkBudget } from "@/lib/spend";

// Painel admin de comentário assistido (outbound 1-clique). Gera o comentário na VOZ
// da marca pra um post de OUTRA conta — o dono lê, copia e posta no Instagram (a Graph
// API não posta em terceiros; aqui é só PREPARO). NÃO publica nada.
//
//   POST /api/comment-draft  { caption, lang }  → { comment }
//
// Auth: Bearer ADMIN_TOKEN (env). Sem ADMIN_TOKEN setado, devolve 401 (seguro por
// padrão — nada gera/gasta até o dono ligar). Custo: haiku curto, balde ig-engagement.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EST_DRAFT_COST = 0.01;

function authorized(req: NextRequest): boolean {
  const t = process.env.ADMIN_TOKEN;
  return !!t && req.headers.get("authorization") === `Bearer ${t}`;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: { caption?: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const caption = String(body?.caption ?? "").trim();
  if (caption.length < 3) {
    return NextResponse.json({ error: "caption_required" }, { status: 400 });
  }
  const lang = getLang(body?.lang);
  const acc = accountFor(lang);

  // Gate de orçamento (balde ig-engagement, compartilhado com o inbound).
  const budget = await checkBudget("ig-engagement", EST_DRAFT_COST);
  if (!budget.ok) {
    return NextResponse.json({ error: "budget", spent: budget.spent, budget: budget.budget }, { status: 402 });
  }

  try {
    const voice = buildVoiceDirective(acc);
    const prompt = buildCommentPrompt(voice, { id: "draft", caption }, acc.langName);
    const comment = await generateText(prompt);
    return NextResponse.json({ ok: true, comment, lang });
  } catch (e) {
    console.error("[comment-draft] erro:", e);
    return NextResponse.json({ error: "gen_failed" }, { status: 500 });
  }
}
