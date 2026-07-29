import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { upsertBrevoContact, isFaixa } from "@/lib/brevo";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Captura do lead do quiz "100 dias para a Liberdade": grava o contato no Brevo com
// a FAIXA (tag de segmentação) que dispara a trilha de e-mail daquela faixa.
// GATED: sem BREVO_API_KEY, o upsert é no-op e a rota responde ok:true (a UX já
// mostrou o veredito na tela — a captura não pode travar o resultado).
export async function POST(req: NextRequest) {
  if (await isRateLimited(req, "quiz-lead", 10)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let email = "";
  let lang: "br" | "es" = "br";
  let faixa = "";
  let score = 0;
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
    lang = body?.lang === "es" ? "es" : "br";
    faixa = String(body?.faixa ?? "");
    score = Number(body?.score);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }
  if (!isFaixa(faixa)) {
    return NextResponse.json({ ok: false, error: "invalid_faixa" }, { status: 400 });
  }
  if (!Number.isFinite(score) || score < 0 || score > 24) {
    return NextResponse.json({ ok: false, error: "invalid_score" }, { status: 400 });
  }

  const r = await upsertBrevoContact({ email, faixa, score: Math.round(score), lang });

  if (r.gated) {
    // Sem chave ainda: registra a intenção (sem expor o e-mail inteiro) para
    // sabermos que o funil está sendo exercitado antes do go-live.
    console.log(`[quiz-lead] gated — faixa=${faixa} score=${score} lang=${lang} (Brevo desligado)`);
  } else if (!r.ok) {
    console.error(`[quiz-lead] Brevo falhou status=${r.status ?? "?"}: ${r.error}`);
  }

  // Sempre ok:true para o cliente — o veredito não depende da captura.
  return NextResponse.json({ ok: true, gated: r.gated === true });
}
