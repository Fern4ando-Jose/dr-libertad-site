// ─── Rate limit por IP (Upstash) — FAIL-OPEN ────────────────────────────────
// Protege as rotas PÚBLICAS (subscribe/waitlist/og) contra flood/abuso. Usa Upstash
// Redis (REST, funciona no edge). **Fail-open**: se as envs UPSTASH_* não estiverem
// setadas (ou der qualquer erro), NÃO bloqueia nada — a automação nunca quebra por
// causa do rate limit. Ativa só quando o dono cria o Upstash e seta as 2 envs.
// (Auditoria 2026-06-29.)

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const cache = new Map<string, Ratelimit>();

// `perMinute` distinto por rota: signups são raros (10/min), o /api/og é mais movimentado.
function getLimiter(prefix: string, perMinute: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null; // env ausente → fail-open
  const key = `${prefix}:${perMinute}`;
  let rl = cache.get(key);
  if (!rl) {
    rl = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(perMinute, "60 s"),
      prefix: `drlib:${prefix}`,
      analytics: false,
    });
    cache.set(key, rl);
  }
  return rl;
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff ? xff.split(",")[0]?.trim() : "") || req.headers.get("x-real-ip") || "anon";
}

/** true = BLOQUEAR (limite estourado). Fail-open: erro/sem-env → false (deixa passar). */
export async function isRateLimited(req: Request, prefix: string, perMinute: number): Promise<boolean> {
  try {
    const rl = getLimiter(prefix, perMinute);
    if (!rl) return false;
    const { success } = await rl.limit(clientIp(req));
    return !success;
  } catch {
    return false; // qualquer falha (Upstash fora, etc.) → fail-open
  }
}
