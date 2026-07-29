// Persistência durável do lead do funil "Guia de 7 dias" no Neon — a REDE DE SEGURANÇA
// para o lead NUNCA se perder, mesmo com o Brevo desligado (gated) ou falhando. Todo
// lead vira uma linha (email + idioma + utm + status do upsert Brevo), recuperável
// depois que as chaves/lista Brevo entrarem.
//
// A tabela é criada de forma AUTOSSUFICIENTE (CREATE TABLE IF NOT EXISTS na 1ª escrita):
// evita tocar em /api/migrate (que está em WIP de outra sessão — isolamento P0) e é
// idempotente. FAIL-OPEN: erro de banco NUNCA quebra a captura — o chamador só loga
// { ok:false } para o lead não sumir sem rastro.

export interface Guia7LeadRecord {
  email: string;
  lang: "br" | "es";
  utm?: Record<string, string>;
  /** Resultado do upsert de contato no Brevo: "ok" | "gated" | "fail". */
  brevoUpsert: string;
}

export type PersistResult = { ok: true } | { ok: false; error: string };

let ensured = false;

async function ensureTable(sql: (typeof import("@vercel/postgres"))["sql"]): Promise<void> {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS guia7_leads (
      email        TEXT NOT NULL,
      lang         TEXT NOT NULL,
      utm          JSONB NOT NULL DEFAULT '{}'::jsonb,
      brevo_upsert TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (email, lang)
    )
  `;
  ensured = true;
}

/**
 * Grava/atualiza o lead no Neon. Idempotente por (email, lang): recadastro do mesmo
 * e-mail atualiza utm/status, não duplica. Fail-open.
 */
export async function recordGuia7Lead(rec: Guia7LeadRecord): Promise<PersistResult> {
  try {
    const { sql } = await import("@vercel/postgres");
    await ensureTable(sql);
    await sql`
      INSERT INTO guia7_leads (email, lang, utm, brevo_upsert, created_at, updated_at)
      VALUES (
        ${rec.email}, ${rec.lang},
        ${JSON.stringify(rec.utm ?? {})}::jsonb,
        ${rec.brevoUpsert}, NOW(), NOW()
      )
      ON CONFLICT (email, lang) DO UPDATE SET
        utm          = EXCLUDED.utm,
        brevo_upsert = EXCLUDED.brevo_upsert,
        updated_at   = NOW()
    `;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
