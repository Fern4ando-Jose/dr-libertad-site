import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Descadastro público por TOKEN (o token É a autenticação — só quem recebeu o
// e-mail tem o link). Soft-unsubscribe: marca `unsubscribed_at` e o envio passa a
// pular. Exigência legal + a Política de Privacidade promete este caminho.

function page(title: string, body: string): NextResponse {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#0B0B0C;color:#F4F0E8;font-family:Georgia,serif;">
  <div style="max-width:520px;margin:14vh auto;padding:0 24px;text-align:center;">
    <div style="font-size:22px;font-weight:bold;letter-spacing:-0.5px;">Dr. Libertad</div>
    <div style="height:2px;width:34px;background:#A45A5A;margin:12px auto 28px;"></div>
    <h1 style="font-size:24px;line-height:1.25;margin:0 0 14px;">${title}</h1>
    <p style="font-size:16px;line-height:1.7;color:#B9B0A2;font-family:Arial,sans-serif;">${body}</p>
  </div>
</body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token) {
    return page("Link inválido", "Falta o código de cancelamento. / Falta el código de cancelación.");
  }

  try {
    const { sql } = await import("@vercel/postgres");
    const rows = await sql<{ lang: string }>`
      UPDATE subscribers SET unsubscribed_at = COALESCE(unsubscribed_at, NOW())
      WHERE unsub_token = ${token}
      RETURNING lang
    `;
    if (rows.rowCount === 0) {
      return page(
        "Link inválido ou expirado",
        "Não encontramos esta inscrição. / No encontramos esta suscripción."
      );
    }
    const isEs = rows.rows[0]?.lang === "es";
    return isEs
      ? page("Listo, te diste de baja", "No recibirás más correos. Puedes volver cuando quieras desde el sitio.")
      : page("Pronto, inscrição cancelada", "Você não receberá mais e-mails. Pode voltar quando quiser pelo site.");
  } catch (e) {
    console.error("[unsubscribe] erro:", e);
    return page(
      "Algo deu errado",
      "Tente de novo em instantes, ou escreva para contato@drlibertad.com. / Inténtalo de nuevo, o escribe a contacto@drlibertad.com."
    );
  }
}
