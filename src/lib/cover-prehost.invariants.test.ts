import { describe, it, expect, vi } from "vitest";
import { Buffer } from "node:buffer";
import {
  prehostCover,
  withPrehostParams,
  normalizeSource,
  blobToken,
  type PrehostDeps,
} from "./cover-prehost";

// ─── Helpers de mock ─────────────────────────────────────────────────────────
// Resposta fake do og: header x-cover-source + content-type + corpo PNG.
function ogResponse(source: string | null, opts: { ok?: boolean; status?: number; contentType?: string; bytes?: number } = {}): Response {
  const headers = new Headers();
  if (source !== null) headers.set("x-cover-source", source);
  headers.set("content-type", opts.contentType ?? "image/png");
  const body = new Uint8Array(opts.bytes ?? 8);
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    headers,
    arrayBuffer: async () => body.buffer,
  } as unknown as Response;
}

// put() fake que sempre grava e devolve uma URL de Blob previsível.
function fakePut() {
  return vi.fn(async (path: string) => ({ url: `https://abc.public.blob.vercel-storage.com/${path}?rnd=1` }));
}

const noSleep = async () => {};
const TOKEN = "vercel_blob_rw_TESTTOKEN123";

describe("cover-prehost — blobToken", () => {
  it("extrai o token do formato canônico mesmo colado com sujeira", () => {
    expect(blobToken("vercel_blob_rw_ABC123")).toBe("vercel_blob_rw_ABC123");
    expect(blobToken('BLOB_READ_WRITE_TOKEN="vercel_blob_rw_ABC123"')).toBe("vercel_blob_rw_ABC123");
    expect(blobToken(undefined)).toBe("");
    expect(blobToken("  plain-token  ")).toBe("plain-token");
  });
});

describe("cover-prehost — normalizeSource", () => {
  it("só aceita os dois valores conhecidos; resto vira unknown", () => {
    expect(normalizeSource("illustration")).toBe("illustration");
    expect(normalizeSource("abstract")).toBe("abstract");
    expect(normalizeSource(null)).toBe("unknown");
    expect(normalizeSource("qualquer-coisa")).toBe("unknown");
  });
});

describe("cover-prehost — withPrehostParams", () => {
  it("acrescenta imgto e _cb sem tocar nos params existentes", () => {
    const out = withPrehostParams("https://x.com/api/og?slide=cover&img=https%3A%2F%2Fa.com%2Fx.png&lang=es", 9000, 2);
    const u = new URL(out);
    expect(u.searchParams.get("imgto")).toBe("9000");
    expect(u.searchParams.get("_cb")).toBe("2");
    expect(u.searchParams.get("slide")).toBe("cover");
    expect(u.searchParams.get("lang")).toBe("es");
    expect(u.searchParams.get("img")).toBe("https://a.com/x.png");
  });

  it("cache-bust muda entre tentativas (fura o CDN)", () => {
    const a = withPrehostParams("https://x.com/api/og?slide=cover", 9000, 1);
    const b = withPrehostParams("https://x.com/api/og?slide=cover", 9000, 2);
    expect(a).not.toBe(b);
  });
});

describe("cover-prehost — prehostCover", () => {
  it("ilustração embutida → hospeda o PNG e devolve a URL estática do Blob", async () => {
    const put = fakePut();
    const fetchImpl = vi.fn(async () => ogResponse("illustration", { bytes: 4242 }));
    const deps: PrehostDeps = { fetchImpl, putImpl: put, blobToken: TOKEN, sleep: noSleep };

    const r = await prehostCover("https://x.com/api/og?slide=cover&img=y", { expectIllustration: true, cat: "freedom" }, deps);

    expect(r.source).toBe("illustration");
    expect(r.url).toMatch(/^https:\/\/abc\.public\.blob\.vercel-storage\.com\/covers\/freedom\.png/);
    expect(r.bytes).toBe(4242);
    expect(r.attempts).toBe(1);
    expect(put).toHaveBeenCalledTimes(1);      // hospedou 1 vez
    expect(fetchImpl).toHaveBeenCalledTimes(1); // acertou de primeira
  });

  it("abstrato com arte aprovada → RETENTA e, ao aquecer o Blob, hospeda a ilustração", async () => {
    const put = fakePut();
    // 1ª tentativa abstrata (Blob frio), 2ª já traz a ilustração.
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(ogResponse("abstract"))
      .mockResolvedValueOnce(ogResponse("illustration", { bytes: 100 }));
    const deps: PrehostDeps = { fetchImpl, putImpl: put, blobToken: TOKEN, sleep: noSleep };

    const r = await prehostCover("https://x.com/api/og?slide=cover", { expectIllustration: true }, deps);

    expect(fetchImpl).toHaveBeenCalledTimes(2); // retentou
    expect(r.source).toBe("illustration");
    expect(r.url).not.toBeNull();
    expect(put).toHaveBeenCalledTimes(1);       // NÃO hospedou o abstrato da 1ª
  });

  it("abstrato TEIMOSO com arte aprovada → NÃO hospeda o abstrato; fail-open (url null)", async () => {
    const put = fakePut();
    const fetchImpl = vi.fn(async () => ogResponse("abstract"));
    const deps: PrehostDeps = { fetchImpl, putImpl: put, blobToken: TOKEN, sleep: noSleep };

    const r = await prehostCover("https://x.com/api/og?slide=cover", { expectIllustration: true, maxTries: 3 }, deps);

    expect(fetchImpl).toHaveBeenCalledTimes(3); // esgotou os retries
    expect(r.url).toBeNull();                   // fail-open → chamador usa og ao vivo
    expect(r.source).toBe("abstract");
    expect(put).not.toHaveBeenCalled();         // jamais fixou o abstrato
    expect(r.error).toMatch(/abstrata/);
  });

  it("arte NÃO existe (expectIllustration=false) → abstrato é o esperado: HOSPEDA na hora", async () => {
    const put = fakePut();
    const fetchImpl = vi.fn(async () => ogResponse("abstract", { bytes: 10 }));
    const deps: PrehostDeps = { fetchImpl, putImpl: put, blobToken: TOKEN, sleep: noSleep };

    const r = await prehostCover("https://x.com/api/og?slide=cover", { expectIllustration: false }, deps);

    expect(fetchImpl).toHaveBeenCalledTimes(1); // sem retry — abstrato é o certo
    expect(r.source).toBe("abstract");
    expect(r.url).not.toBeNull();               // hospedou o abstrato estático
    expect(put).toHaveBeenCalledTimes(1);
  });

  it("falha de host (Blob) → fail-open (url null), nunca lança", async () => {
    const put = vi.fn(async () => { throw new Error("blob down"); });
    const fetchImpl = vi.fn(async () => ogResponse("illustration"));
    const deps: PrehostDeps = { fetchImpl, putImpl: put, blobToken: TOKEN, sleep: noSleep };

    const r = await prehostCover("https://x.com/api/og?slide=cover", { expectIllustration: true }, deps);

    expect(r.url).toBeNull();
    expect(r.source).toBe("illustration");
    expect(r.error).toMatch(/hospedar/);
  });

  it("og fora do ar (fetch lança) em todas as tentativas → fail-open", async () => {
    const put = fakePut();
    const fetchImpl = vi.fn(async () => { throw new Error("ECONNRESET"); });
    const deps: PrehostDeps = { fetchImpl, putImpl: put, blobToken: TOKEN, sleep: noSleep };

    const r = await prehostCover("https://x.com/api/og?slide=cover", { expectIllustration: true, maxTries: 2 }, deps);

    expect(r.url).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(r.error).toMatch(/fetch og falhou/);
  });

  it("og responde HTTP 500 → retenta e, se persistir, fail-open", async () => {
    const put = fakePut();
    const fetchImpl = vi.fn(async () => ogResponse("illustration", { ok: false, status: 500 }));
    const deps: PrehostDeps = { fetchImpl, putImpl: put, blobToken: TOKEN, sleep: noSleep };

    const r = await prehostCover("https://x.com/api/og?slide=cover", { expectIllustration: true, maxTries: 2 }, deps);

    expect(r.url).toBeNull();
    expect(r.error).toMatch(/HTTP 500/);
  });

  it("sem token do Blob → host falha em silêncio → fail-open (nunca lança)", async () => {
    const fetchImpl = vi.fn(async () => ogResponse("illustration"));
    const deps: PrehostDeps = { fetchImpl, blobToken: "", sleep: noSleep };

    const r = await prehostCover("https://x.com/api/og?slide=cover", { expectIllustration: true }, deps);

    expect(r.url).toBeNull();
    expect(r.source).toBe("illustration");
  });

  it("header ausente (og antigo) → source unknown, mas ainda hospeda (ganha URL estática)", async () => {
    const put = fakePut();
    const fetchImpl = vi.fn(async () => ogResponse(null));
    const deps: PrehostDeps = { fetchImpl, putImpl: put, blobToken: TOKEN, sleep: noSleep };

    const r = await prehostCover("https://x.com/api/og?slide=cover", { expectIllustration: true }, deps);

    expect(r.source).toBe("unknown");
    expect(r.url).not.toBeNull();
    expect(put).toHaveBeenCalledTimes(1);
  });
});
