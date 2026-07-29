import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import {
  upsertDopaminaContact,
  sendPreviaEmail,
  isFaixa,
  type PreviaSendResult,
} from "@/lib/brevo-dopamina";
import { recordDopaminaLead } from "@/lib/dopamina-leads";
import { getBook } from "@/lib/books";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Base pública do site (para montar a URL ABSOLUTA da prévia). Override por env em
// ambientes de preview; default = produção.
const SITE_URL = process.env.SITE_URL || "https://www.drlibertad.com";

/** URL absoluta do PDF da prévia do idioma (fonte única = books.ts), ou null. */
function previaUrlFor(lang: "br" | "es"): string | null {
  const path = getBook("i-love-dopamina")?.leadPdf?.[lang];
  return path ? `${SITE_URL}${path}` : null;
}

// Captura do lead do funil PRÓPRIO "I Love Dopamina". Faz TRÊS coisas, nesta ordem,
// para cumprir a promessa da tela de sucesso ("a prévia está a caminho da sua caixa
// de entrada") e NUNCA perder um lead:
//   (1) grava o contato na lista EXCLUSIVA do livro no Brevo (FONTE="i-love-dopamina",
//       + FAIXA quando veio do quiz) — isolado do funil 100 dias;
//   (2) ENVIA o E0 (entrega da prévia) por e-mail transacional com o link do PDF;
//   (3) PERSISTE o lead no Neon (rede de segurança), mesmo com o Brevo desligado.
// GATED e HONESTO: sem as envs do Brevo, (1) e (2) viram no-op — mas o lead é salvo em
// (3) e cada gate/falha é LOGADO (nunca descartado em silêncio). A UX sempre recebe
// ok:true (o veredito/sucesso já está na tela e não pode travar na rede).
export async function POST(req: NextRequest) {
  if (await isRateLimited(req, "dopamina-lead", 10)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let email = "";
  let lang: "br" | "es" = "br";
  let source: "quiz" | "previa" = "previa";
  let faixa: string | undefined;
  let score: number | undefined;
  let utm: Record<string, string> | undefined;
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
    lang = body?.lang === "es" ? "es" : "br";
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

  const cleanFaixa = isFaixa(faixa) ? faixa : undefined;
  const cleanScore = typeof score === "number" ? Math.round(score) : undefined;

  // (1) Contato no Brevo (lista/segmentação da trilha).
  const upsert = await upsertDopaminaContact({
    email,
    lang,
    source,
    faixa: cleanFaixa,
    score: cleanScore,
    utm,
  });

  // (2) E0 — entrega imediata da prévia por e-mail transacional. Depende do template
  // do Brevo (o dono aprova o conteúdo lá). Sem previaUrl (leadPdf ausente) não há o
  // que enviar — sinaliza claramente o que falta em vez de fingir que enviou.
  const previaUrl = previaUrlFor(lang);
  let emailSend: PreviaSendResult;
  if (previaUrl) {
    emailSend = await sendPreviaEmail({ email, lang, previaUrl });
  } else {
    emailSend = { ok: false, gated: false, error: "no_previa_url" };
    console.error(
      `[dopamina-lead] E0 NÃO enviado: leadPdf ausente para lang=${lang} (defina books.ts leadPdf ou o PDF em public/lead).`,
    );
  }

  // (3) Rede de segurança — persiste o lead no Neon (nunca perder). Fail-open.
  const emailStatus = !previaUrl
    ? "no_previa_url"
    : emailSend.gated
      ? `gated:${emailSend.reason}`
      : emailSend.ok
        ? "sent"
        : "fail";
  const persisted = await recordDopaminaLead({
    email,
    lang,
    source,
    faixa: cleanFaixa,
    score: cleanScore,
    utm,
    brevoUpsert: upsert.gated ? "gated" : upsert.ok ? "ok" : "fail",
    emailStatus,
  });

  // Log CLARO em vez de engolir (sem expor o e-mail — é PII).
  if (upsert.gated) {
    console.warn(
      `[dopamina-lead] Brevo upsert GATED (falta BREVO_API_KEY) — source=${source} lang=${lang} | lead salvo no banco=${persisted.ok}`,
    );
  } else if (!upsert.ok) {
    console.error(`[dopamina-lead] Brevo upsert FALHOU status=${upsert.status ?? "?"}: ${upsert.error}`);
  }
  if (emailSend.gated) {
    console.warn(
      `[dopamina-lead] E0 (prévia) NÃO enviado — ${emailSend.reason} ` +
        `(falta BREVO_API_KEY ou BREVO_TEMPLATE_DOPAMINA_PREVIA_${lang.toUpperCase()}). Lead salvo=${persisted.ok}.`,
    );
  } else if (!emailSend.ok && previaUrl) {
    console.error(`[dopamina-lead] E0 (prévia) FALHOU status=${emailSend.status ?? "?"}: ${emailSend.error}`);
  }
  if (!persisted.ok) {
    console.error(`[dopamina-lead] PERSISTÊNCIA FALHOU (lead em risco de se perder): ${persisted.error}`);
  }

  // Sempre ok:true para o cliente — a UX não depende da captura. Flags honestas p/ debug.
  return NextResponse.json({
    ok: true,
    gated: upsert.gated === true,
    emailSent: emailSend.ok === true && emailSend.gated === false,
    saved: persisted.ok === true,
  });
}
