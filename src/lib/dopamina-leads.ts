// Persistência durável do lead do funil PRÓPRIO "I Love Dopamina" no Neon — a REDE
// DE SEGURANÇA para o lead NUNCA se perder, mesmo com o Brevo desligado (gated) ou
// falhando. Antes, sem BREVO_API_KEY, o e-mail capturado era descartado em silêncio:
// quem se cadastrava não recebia nada E o lead sumia. Aqui todo lead vira uma linha
// (email + segmentação + status de entrega), recuperável depois que as chaves Brevo
// entrarem. Tabela criada em /api/migrate (dopamina_leads).
//
// FAIL-OPEN: erro de banco NUNCA quebra a captura — a UX já mostrou o resultado; o
// chamador só loga { ok:false } para o lead não sumir sem rastro.

import type { Faixa } from "./brevo-dopamina";

export interface DopaminaLeadRecord {
  email: string;
  lang: "pt" | "es";
  source: "quiz" | "previa";
  faixa?: Faixa;
  score?: number;
  utm?: Record<string, string>;
  /** Resultado do upsert de contato no Brevo: "ok" | "gated" | "fail". */
  brevoUpsert: string;
  /** Resultado do envio do E0 (prévia): "sent" | "gated:<motivo>" | "fail" | "no_previa_url". */
  emailStatus: string;
}

export type PersistResult = { ok: true } | { ok: false; error: string };

/**
 * Grava/atualiza o lead no Neon. Idempotente por (email, lang): recadastro do mesmo
 * e-mail atualiza a segmentação e o status de entrega, não duplica. Fail-open.
 */
export async function recordDopaminaLead(rec: DopaminaLeadRecord): Promise<PersistResult> {
  try {
    const { sql } = await import("@vercel/postgres");
    await sql`
      INSERT INTO dopamina_leads
        (email, lang, source, faixa, score, utm, brevo_upsert, email_status, created_at, updated_at)
      VALUES (
        ${rec.email}, ${rec.lang}, ${rec.source},
        ${rec.faixa ?? null}, ${rec.score ?? null},
        ${JSON.stringify(rec.utm ?? {})}::jsonb,
        ${rec.brevoUpsert}, ${rec.emailStatus}, NOW(), NOW()
      )
      ON CONFLICT (email, lang) DO UPDATE SET
        source       = EXCLUDED.source,
        faixa        = COALESCE(EXCLUDED.faixa, dopamina_leads.faixa),
        score        = COALESCE(EXCLUDED.score, dopamina_leads.score),
        utm          = EXCLUDED.utm,
        brevo_upsert = EXCLUDED.brevo_upsert,
        email_status = EXCLUDED.email_status,
        updated_at   = NOW()
    `;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
