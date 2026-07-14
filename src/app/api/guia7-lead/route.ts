import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { upsertGuia7Contact } from "@/lib/brevo-guia7";
import { recordGuia7Lead } from "@/lib/guia7-leads";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Captura do lead do funil "Guia de 7 dias" (opt-in do reforço diário). Faz DUAS coisas:
//   (1) adiciona o contato à lista EXCLUSIVA do guia no Brevo (FONTE="guia-7-dias") —
//       isolado dos outros funis; a trilha dos 7 e-mails é uma AUTOMAÇÃO do Brevo,
//       ativada só com OK do dono (enviar e-mail é publicação — P4/P7);
//   (2) PERSISTE o lead no Neon (rede de segurança), mesmo com o Brevo desligado.
// GATED e HONESTO: sem as envs do Brevo, (1) vira no-op — mas o lead é salvo em (2) e
// cada gate/falha é LOGADO (nunca descartado em silêncio, sem expor o e-mail = PII). A
// UX sempre recebe ok:true (o guia inteiro já está na página; a captura não pode travar).
export async function POST(req: NextRequest) {
  if (await isRateLimited(req, "guia7-lead", 10)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let email = "";
  let lang: "pt" | "es" = "pt";
  let utm: Record<string, string> | undefined;
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
    lang = body?.lang === "es" ? "es" : "pt";
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

  // (1) Contato no Brevo (lista do guia — a trilha é automação aprovada à parte).
  const upsert = await upsertGuia7Contact({ email, lang, utm });

  // (2) Rede de segurança — persiste o lead no Neon (nunca perder). Fail-open.
  const persisted = await recordGuia7Lead({
    email,
    lang,
    utm,
    brevoUpsert: upsert.gated ? "gated" : upsert.ok ? "ok" : "fail",
  });

  // Log CLARO em vez de engolir (sem expor o e-mail — é PII).
  if (upsert.gated) {
    console.warn(
      `[guia7-lead] Brevo upsert GATED (falta BREVO_API_KEY ou BREVO_LIST_GUIA7_${lang.toUpperCase()}) — lang=${lang} | lead salvo no banco=${persisted.ok}`,
    );
  } else if (!upsert.ok) {
    console.error(`[guia7-lead] Brevo upsert FALHOU status=${upsert.status ?? "?"}: ${upsert.error}`);
  }
  if (!persisted.ok) {
    console.error(`[guia7-lead] PERSISTÊNCIA FALHOU (lead em risco de se perder): ${persisted.error}`);
  }

  // Sempre ok:true para o cliente — a UX não depende da captura. Flags honestas p/ debug.
  return NextResponse.json({
    ok: true,
    gated: upsert.gated === true,
    saved: persisted.ok === true,
  });
}
