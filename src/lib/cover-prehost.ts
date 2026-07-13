// ─── Pré-hospedagem da CAPA do carrossel ─────────────────────────────────────
// Problema (bug intermitente): a capa era publicada como URL `/api/og` AO VIVO — o
// Instagram buscava o og NA HORA, e o fetch interno da ilustração (timeout curto de
// 3s, criado p/ evitar o 9004) às vezes estourava → a capa saía com o FUNDO ABSTRATO
// tendo arte APROVADA (ex.: ES saiu bege). Além do risco de 9004 quando o og estava
// lento.
//
// Solução: NÓS baixamos a capa no servidor com FOLGA (passando `?imgto=` maior ao og,
// que só nós usamos — o IG nunca vê esse caminho) + RETRIES aquecendo o Blob, LEMOS o
// header `x-cover-source` p/ CONFIRMAR que a ilustração realmente entrou, e HOSPEDAMOS
// o PNG final no Vercel Blob (infra rápida e permanente). O IG passa a receber uma URL
// ESTÁTICA já com a arte embutida → nunca abstrato, nunca 9004.
//
// FAIL-OPEN: se render/host falhar após os retries (ou a capa insistir em abstrata),
// devolve `url: null` e o chamador MANTÉM a URL og ao vivo — nunca bloqueia o post.
//
// Função desenhada com dependências injetáveis (fetchImpl/putImpl/sleep/token) p/ ser
// testável sem rede nem gasto.

import { Buffer } from "node:buffer";

export type CoverSource = "illustration" | "abstract" | "unknown";

export interface PrehostResult {
  url: string | null;   // URL estática do Blob; null → o chamador usa a og ao vivo
  source: CoverSource;   // o que a capa REALMENTE mostra (lido de x-cover-source)
  attempts: number;      // quantas tentativas foram feitas
  bytes?: number;        // tamanho do PNG baixado (observabilidade)
  error?: string;        // motivo do fail-open, quando url === null
}

export interface PrehostDeps {
  fetchImpl?: typeof fetch;
  putImpl?: (path: string, body: Buffer, opts: Record<string, unknown>) => Promise<{ url: string }>;
  blobToken?: string;
  sleep?: (ms: number) => Promise<void>;
}

export interface PrehostOpts {
  expectIllustration: boolean; // true = existe ilustração aprovada p/ este post
  cat?: string;                // categoria — só p/ nomear o arquivo no Blob
  maxTries?: number;           // tentativas (default 3)
  fetchTimeoutMs?: number;     // timeout do NOSSO fetch do og (default 16000)
  imgTimeoutMs?: number;       // ?imgto= passado ao og p/ o fetch da ilustração (default 10000)
  backoffMs?: number;          // espera entre retries aquecendo o Blob (default 1500)
}

// Extrai o token do Blob no formato canônico (`vercel_blob_rw_…`). Aceita tanto o
// valor puro quanto uma linha de .env colada com prefixo/sufixo. Espelha illustration.ts.
export function blobToken(raw: string | undefined): string {
  const s = raw || "";
  const m = s.match(/vercel_blob_rw_[A-Za-z0-9_-]+/);
  return m ? m[0] : s.trim();
}

// Normaliza o header x-cover-source num enum fechado. Header ausente/estranho →
// "unknown" (deploy antigo do og). No "unknown" o pré-hospedador ainda hospeda (pega
// pelo menos o ganho de URL estática/anti-9004) — og e publish sobem juntos, então o
// header estará presente em produção.
export function normalizeSource(h: string | null | undefined): CoverSource {
  if (h === "illustration") return "illustration";
  if (h === "abstract") return "abstract";
  return "unknown";
}

// Junta ?imgto= (timeout maior do fetch da ilustração no lado og) e ?_cb= (cache-bust
// por tentativa — fura o CDN p/ o retry re-renderizar com o Blob já quente) à URL og.
// NÃO altera o visual: o og ignora params desconhecidos e o `imgto` só amplia o timeout.
export function withPrehostParams(ogUrl: string, imgTimeoutMs: number, attempt: number): string {
  const u = new URL(ogUrl);
  u.searchParams.set("imgto", String(imgTimeoutMs));
  u.searchParams.set("_cb", String(attempt));
  return u.toString();
}

async function hostBufferToBlob(
  buf: Buffer,
  contentType: string,
  cat: string,
  token: string,
  putImpl?: PrehostDeps["putImpl"],
): Promise<string | null> {
  try {
    if (!token) return null;
    const ext = contentType.includes("png") ? "png"
      : contentType.includes("webp") ? "webp"
      : (contentType.includes("jpeg") || contentType.includes("jpg")) ? "jpg"
      : "png";
    const put = putImpl ?? (await import("@vercel/blob")).put;
    const blob = await put(`covers/${cat}.${ext}`, buf, {
      access: "public",
      contentType,
      token,
      addRandomSuffix: true, // nome único por capa (não sobrescreve as anteriores)
    });
    return blob.url;
  } catch {
    return null; // host é best-effort — o chamador cai na og ao vivo
  }
}

export async function prehostCover(
  ogUrl: string,
  opts: PrehostOpts,
  deps: PrehostDeps = {},
): Promise<PrehostResult> {
  const f = deps.fetchImpl ?? fetch;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const token = blobToken(deps.blobToken ?? process.env.BLOB_READ_WRITE_TOKEN);
  const maxTries = Math.max(1, opts.maxTries ?? 3);
  const imgTimeoutMs = opts.imgTimeoutMs ?? 10000;
  const fetchTimeoutMs = opts.fetchTimeoutMs ?? 16000;
  const backoffMs = opts.backoffMs ?? 1500;
  const cat = opts.cat ?? "cover";

  let lastErr: string | undefined;
  let lastSource: CoverSource = "unknown";

  for (let attempt = 1; attempt <= maxTries; attempt++) {
    const url = withPrehostParams(ogUrl, imgTimeoutMs, attempt);

    let res: Response;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), fetchTimeoutMs);
      try {
        res = await f(url, { signal: ctrl.signal });
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      lastErr = `fetch og falhou: ${e instanceof Error ? e.message : String(e)}`;
      if (attempt < maxTries) await sleep(backoffMs);
      continue;
    }

    if (!res.ok) {
      lastErr = `og HTTP ${res.status}`;
      if (attempt < maxTries) await sleep(backoffMs);
      continue;
    }

    const source = normalizeSource(res.headers.get("x-cover-source"));
    lastSource = source;
    const contentType = res.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) {
      lastErr = `og devolveu não-imagem (${contentType})`;
      if (attempt < maxTries) await sleep(backoffMs);
      continue;
    }

    const buf = Buffer.from(await res.arrayBuffer());

    // Capa ABSTRATA tendo ilustração aprovada → NÃO hospeda o abstrato: aquece o Blob
    // e tenta de novo. Se esgotar, fail-open (og ao vivo) em vez de gravar o abstrato
    // estático — o fetch ao vivo do IG ainda pode pegar o Blob já quente.
    if (source === "abstract" && opts.expectIllustration) {
      lastErr = "capa saiu abstrata tendo ilustração aprovada";
      if (attempt < maxTries) {
        await sleep(backoffMs);
        continue;
      }
      return { url: null, source, attempts: attempt, bytes: buf.length, error: lastErr };
    }

    // Ilustração embutida, OU a arte realmente não existe (expectIllustration=false),
    // OU header desconhecido (deploy antigo) → hospeda o PNG final e devolve a URL fixa.
    const hosted = await hostBufferToBlob(buf, contentType, cat, token, deps.putImpl);
    if (hosted) return { url: hosted, source, attempts: attempt, bytes: buf.length };
    return { url: null, source, attempts: attempt, bytes: buf.length, error: "falha ao hospedar no Blob" };
  }

  return { url: null, source: lastSource, attempts: maxTries, error: lastErr ?? "esgotou tentativas" };
}
