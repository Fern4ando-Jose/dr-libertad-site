import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { upsertDopaminaContact, isFaixa } from "@/lib/brevo-dopamina";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Captura do lead do funil PRÓPRIO "I Love Dopamina": grava o contato na lista
// EXCLUSIVA do livro no Brevo, com FONTE="i-love-dopamina" e (quando veio do quiz)
// a FAIXA de segmentação. Isolado do funil 100 dias (/api/quiz-lead).
// GATED: sem BREVO_API_KEY, o upsert é no-op e a rota responde ok:true (a UX já
// mostrou o veredito/sucesso — a captura não pode travar o resultado).
export async function POST(req: NextRequest) {
  if (await isRateLimited(req, "dopamina-lead", 10)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let email = "";
  let lang: "pt" | "es" = "pt";
  let source: "quiz" | "previa" = "previa";
  let faixa: string | undefined;
  let score: number | undefined;
  let utm: Record<string, string> | undefined;
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
    lang = body?.lang === "es" ? "es" : "pt";
    source = body?.source === "quiz" ? "quiz" : "previa";
    if (body?.faixa != null) faixa = String(body.faixa);
    if (body?.score != null) score = Number(body.score);
    if (body?.utm && typeof body.utm === "object") {
      utm = {};
      for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
        const v = body.utm[k];
        if (typeof v === "string" && v) utm[k] = v.slice(0, 120);
      }
    }
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }
  // Do quiz: faixa e score são obrigatórios e válidos. Da prévia: ambos ausentes.
  if (source === "quiz") {
    if (!isFaixa(faixa)) {
      return NextResponse.json({ ok: false, error: "invalid_faixa" }, { status: 400 });
    }
    if (!Number.isFinite(score) || (score as number) < 0 || (score as number) > 24) {
      return NextResponse.json({ ok: false, error: "invalid_score" }, { status: 400 });
    }
  } else {
    faixa = undefined;
    score = undefined;
  }

  const r = await upsertDopaminaContact({
    email,
    lang,
    source,
    faixa: isFaixa(faixa) ? faixa : undefined,
    score: typeof score === "number" ? Math.round(score) : undefined,
    utm,
  });

  if (r.gated) {
    // Sem chave/lista ainda: registra a intenção (sem expor o e-mail inteiro) para
    // sabermos que o funil está sendo exercitado antes do go-live.
    console.log(`[dopamina-lead] gated — source=${source} faixa=${faixa ?? "-"} score=${score ?? "-"} lang=${lang} (Brevo desligado)`);
  } else if (!r.ok) {
    console.error(`[dopamina-lead] Brevo falhou status=${r.status ?? "?"}: ${r.error}`);
  }

  // Sempre ok:true para o cliente — a UX não depende da captura.
  return NextResponse.json({ ok: true, gated: r.gated === true });
}
