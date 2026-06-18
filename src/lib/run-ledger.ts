// ─── Livro-razão de publicações por (dia, run, idioma) ───────────────────────
// Registra CADA publicação (carrossel e reel) numa linha (day, run, lang). Serve
// a dois fins:
//   1) idempotência: o reel passa a ter dedup (antes não tinha) → re-disparo do
//      watchdog não republica o que já saiu.
//   2) o watchdog (catchup.yml) consulta o que faltou publicar hoje e só redispara
//      os runs ausentes — sobrevive ao atraso/derrubada de cron do GitHub.
// Tudo best-effort/fail-open: erro de banco nunca bloqueia/derruba a publicação.

export function dayUTC(date = new Date()): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

// Já existe publicação registrada para (dia, run, lang)? Fail-open: em erro de
// banco devolve false (NÃO bloqueia o publish — preferimos publicar a travar).
export async function runAlreadyPublished(day: string, run: number, lang: string): Promise<boolean> {
  try {
    const { sql } = await import("@vercel/postgres");
    const rows = await sql`
      SELECT 1 FROM published_runs
      WHERE day = ${day} AND run = ${run} AND lang = ${lang} AND instagram_post_id IS NOT NULL
      LIMIT 1
    `;
    return rows.rows.length > 0;
  } catch {
    return false;
  }
}

// Registra (ou atualiza) a publicação. Best-effort.
export async function recordRun(
  day: string, run: number, lang: string, kind: string, instagramPostId: string | null,
): Promise<void> {
  try {
    const { sql } = await import("@vercel/postgres");
    await sql`
      INSERT INTO published_runs (day, run, lang, kind, instagram_post_id, ts)
      VALUES (${day}, ${run}, ${lang}, ${kind}, ${instagramPostId}, NOW())
      ON CONFLICT (day, run, lang) DO UPDATE SET
        kind = ${kind}, instagram_post_id = ${instagramPostId}, ts = NOW()
    `;
  } catch { /* livro-razão é best-effort — nunca quebra o pipeline */ }
}

// Quais runs do dia já têm publicação, por idioma. Usado pelo watchdog (via
// /api/runs-status) para decidir o que falta. Retorna ex.: { es: [4], pt: [] }.
export async function publishedRunsToday(day: string): Promise<Record<string, number[]>> {
  const out: Record<string, number[]> = {};
  try {
    const { sql } = await import("@vercel/postgres");
    const rows = await sql<{ run: number; lang: string }>`
      SELECT run, lang FROM published_runs
      WHERE day = ${day} AND instagram_post_id IS NOT NULL
    `;
    for (const r of rows.rows) {
      (out[r.lang] ??= []).push(r.run);
    }
  } catch { /* fail-open: devolve o que tiver */ }
  return out;
}
