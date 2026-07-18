// Invariantes das 4 fontes de footage (Pexels vídeo/foto + Pixabay vídeo/foto).
// Pixabay é FAIL-OPEN por design (chave ainda não existe, 2026-07-16): toda
// função Pixabay devolve [] sem PIXABAY_API_KEY, sem tocar a rede — os testes
// abaixo NÃO mockam fetch pra provar exatamente isso (se tocasse a rede, o teste
// erraria por timeout/offline, não silenciosamente passaria).
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  searchPexelsVideo,
  searchPexelsPhoto,
  searchPixabayVideo,
  searchPixabayPhoto,
  availableSources,
  qaCacheId,
  candidateSourceKey,
  FOOTAGE_SOURCES,
} from "./footage-providers";

describe("fail-open sem chave — NENHUMA fonte quebra o pipeline por chave ausente", () => {
  afterEach(() => vi.restoreAllMocks());

  it("Pexels vídeo/foto sem chave → [] sem chamar fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await searchPexelsVideo("termo", undefined)).toEqual([]);
    expect(await searchPexelsPhoto("termo", undefined)).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("Pixabay vídeo/foto sem PIXABAY_API_KEY → [] sem chamar fetch (dono ainda não criou a conta)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await searchPixabayVideo("termo", undefined)).toEqual([]);
    expect(await searchPixabayPhoto("termo", undefined)).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("availableSources — Pixabay só entra com a chave; Pexels sempre que tiver a sua", () => {
  it("nenhuma chave → nenhuma fonte disponível", () => {
    expect(availableSources({})).toEqual([]);
  });

  it("só Pexels → 2 fontes (vídeo+foto), Pixabay de fora", () => {
    const sources = availableSources({ pexels: "k" });
    expect(sources).toEqual(["pexels-video", "pexels-photo"]);
  });

  it("as 2 chaves presentes → as 4 fontes disponíveis (mix completo)", () => {
    const sources = availableSources({ pexels: "k", pixabay: "k2" });
    expect(sources).toEqual([...FOOTAGE_SOURCES]);
  });

  it("só Pixabay (sem Pexels) → só as 2 fontes Pixabay", () => {
    expect(availableSources({ pixabay: "k2" })).toEqual(["pixabay-video", "pixabay-photo"]);
  });
});

// ─── Poster do Pixabay VÍDEO (incidente "El sabio ausente", 2026-07-18) ────────
// A API da Pixabay REMOVEU `picture_id` (sondado ao vivo: undefined em todos os hits;
// o campo atual é `videos.<size>.thumbnail`). O fallback antigo usava o PRÓPRIO MP4
// como poster → o juiz de visão recebia vídeo como imagem → erro HTTP → rejeição
// fail-safe que queimava o teto de julgamentos do harvest em silêncio.
describe("searchPixabayVideo — poster é o THUMBNAIL real, nunca o .mp4", () => {
  afterEach(() => vi.restoreAllMocks());

  const hitVertical = (id: number, thumbnail?: string) => ({
    id,
    duration: 10,
    tags: "man, thinking",
    videos: {
      medium: {
        url: `https://cdn.pixabay.com/video/${id}.mp4`,
        width: 1080,
        height: 1920,
        ...(thumbnail ? { thumbnail } : {}),
      },
    },
  });

  function mockPixabay(hits: unknown[]) {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => ({ hits }) } as unknown as Response);
  }

  it("com thumbnail → poster = thumbnail (jpg), e a URL do clipe segue sendo o mp4", async () => {
    mockPixabay([hitVertical(203252, "https://cdn.pixabay.com/video/203252_medium.jpg")]);
    const out = await searchPixabayVideo("t", "k");
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe("https://cdn.pixabay.com/video/203252.mp4");
    expect(out[0].poster).toBe("https://cdn.pixabay.com/video/203252_medium.jpg");
    expect(out[0].poster).not.toMatch(/\.mp4$/); // era o defeito: mp4 como "imagem" pro juiz
  });

  it("hit SEM thumbnail em nenhum tamanho → candidato DESCARTADO (sem poster não há QA da marca)", async () => {
    mockPixabay([hitVertical(99, undefined)]);
    expect(await searchPixabayVideo("t", "k")).toEqual([]);
  });
});

describe("qaCacheId — chave composta do cache de QA (BIGINT) não colide entre provedores/tipos", () => {
  it("o MESMO (source,id) sempre gera a MESMA chave (cache vale pra sempre)", () => {
    expect(qaCacheId("pexels-video", 12345)).toBe(qaCacheId("pexels-video", 12345));
  });

  it("o MESMO id numérico em fontes DIFERENTES gera chaves DIFERENTES (sem colisão)", () => {
    const ids = new Set([
      qaCacheId("pexels-video", 12345),
      qaCacheId("pexels-photo", 12345),
      qaCacheId("pixabay-video", 12345),
      qaCacheId("pixabay-photo", 12345),
    ]);
    expect(ids.size).toBe(4); // 4 chaves distintas pro mesmo id "12345" em 4 fontes
  });

  it("candidateSourceKey reconstrói a chave a partir de source+mediaType do candidato", () => {
    expect(candidateSourceKey({ source: "pexels", mediaType: "video" })).toBe("pexels-video");
    expect(candidateSourceKey({ source: "pixabay", mediaType: "photo" })).toBe("pixabay-photo");
  });
});
