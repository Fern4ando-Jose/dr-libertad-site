// Invariante da rotina de medição de ATENÇÃO (passo 5). summarizeAttention agrega os
// SINAIS que o playbook otimiza (alcance · saveRate · shareRate=sends · watch time) por
// formato — lógica PURA (sem rede). Garante: agrupa por formato, ignora nulos nas
// médias (Reel tem watch, carrossel não), e não inventa formato vazio.
import { describe, it, expect } from "vitest";
import { summarizeAttention, type PostInsight } from "./insights";

function mk(p: Partial<PostInsight>): PostInsight {
  return {
    id: "x", title: "t", format: "REEL", permalink: null, timestamp: null,
    ageDays: 1, thumbnail: null, reach: 0, views: 0, likes: 0, comments: 0,
    saved: 0, shares: 0, interactions: 0, avgWatchSec: null,
    viewsPerDay: 0, engagementRate: null, saveRate: null, shareRate: null,
    ...p,
  };
}

describe("summarizeAttention — sinais de atenção por formato", () => {
  it("lista vazia → resumo vazio", () => {
    expect(summarizeAttention([])).toEqual([]);
  });

  it("agrupa por formato e só devolve os formatos presentes", () => {
    const out = summarizeAttention([
      mk({ format: "REEL", reach: 100 }),
      mk({ format: "CARROSSEL", reach: 200 }),
    ]);
    expect(out.map((s) => s.format).sort()).toEqual(["CARROSSEL", "REEL"]);
    expect(out.find((s) => s.format === "IMAGEM")).toBeUndefined();
  });

  it("médias de reach e das taxas (sends/saves)", () => {
    const out = summarizeAttention([
      mk({ format: "REEL", reach: 100, saveRate: 0.1, shareRate: 0.2, avgWatchSec: 8 }),
      mk({ format: "REEL", reach: 300, saveRate: 0.3, shareRate: 0.4, avgWatchSec: 12 }),
    ]);
    const reel = out.find((s) => s.format === "REEL")!;
    expect(reel.count).toBe(2);
    expect(reel.avgReach).toBe(200);
    expect(reel.avgShareRate).toBeCloseTo(0.3, 6); // (0.2+0.4)/2 — sends é a alavanca de alcance novo
    expect(reel.avgSaveRate).toBeCloseTo(0.2, 6);
    expect(reel.avgWatchSec).toBe(10);
  });

  it("watch time nulo (carrossel) não vira 0 nem NaN — fica null", () => {
    const out = summarizeAttention([
      mk({ format: "CARROSSEL", reach: 50, saveRate: 0.05, shareRate: null, avgWatchSec: null }),
    ]);
    const carr = out[0];
    expect(carr.avgWatchSec).toBeNull();
    expect(carr.avgShareRate).toBeNull(); // todos nulos → null, não 0
    expect(carr.avgSaveRate).toBeCloseTo(0.05, 6);
  });
});
