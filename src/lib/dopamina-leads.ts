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
  lang: "br" | "es";
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

export interface DripCandidate {
  email: string;
  createdAt: Date;
  dripSent: string[];
}

/** Leads ES ainda não completos no gotejamento (E1→E5) — para o cron diário processar. */
export async function getDripCandidatesEs(): Promise<DripCandidate[]> {
  const { sql } = await import("@vercel/postgres");
  const res = await sql<{ email: string; created_at: string; drip_sent: string[] | null }>`
    SELECT email, created_at, drip_sent
    FROM dopamina_leads
    WHERE lang = 'es' AND (drip_sent IS NULL OR cardinality(drip_sent) < 5)
  `;
  return res.rows.map((r) => ({
    email: r.email,
    createdAt: new Date(r.created_at),
    dripSent: r.drip_sent ?? [],
  }));
}

/** Marca um passo do gotejamento como enviado (idempotente — não duplica no array). */
export async function markDripSent(email: string, lang: "br" | "es", step: string): Promise<PersistResult> {
  try {
    const { sql } = await import("@vercel/postgres");
    await sql`
      UPDATE dopamina_leads
      SET drip_sent = array_append(drip_sent, ${step}), updated_at = NOW()
      WHERE email = ${email} AND lang = ${lang} AND NOT (${step} = ANY(drip_sent))
    `;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

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
