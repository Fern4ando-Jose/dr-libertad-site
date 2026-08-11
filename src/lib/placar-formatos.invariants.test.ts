import { describe, it, expect } from "vitest";
import { montarPlacar, veredito, medianaEnvios, cruzarComMetricas, MINIMO_PARA_JULGAR } from "./placar-formatos";

// O analista de métricas tem UMA regra acima de todas (P4): nunca reportar estimativa como
// medição. Estes testes existem para que ausência de dado nunca vire zero no placar.

describe("placar por formato", () => {
  it("peça sem carimbo de formato não inventa categoria", () => {
    expect(montarPlacar([{ formato: null, reach: 100 }, { formato: "", reach: 50 }])).toEqual([]);
  });

  it("ausência de métrica vira semDados, NUNCA zero", () => {
    const p = montarPlacar([{ formato: "palestrinha" }, { formato: "palestrinha" }]);
    expect(p[0].pecas).toBe(2);
    expect(p[0].semDados).toBe(2);
    expect(p[0].alcance).toBeNull();
    expect(p[0].envios).toBeNull();
  });

  it("soma só o que foi medido", () => {
    const p = montarPlacar([
      { formato: "analogia", reach: 100, shares: 5 },
      { formato: "analogia", reach: 300, shares: 15 },
      { formato: "analogia" },
    ]);
    expect(p[0].pecas).toBe(3);
    expect(p[0].semDados).toBe(1);
    expect(p[0].alcance).toBe(400);
    expect(p[0].envios).toBe(20);
  });

  it("ordena por ENVIOS por peça — não por curtida", () => {
    const p = montarPlacar([
      { formato: "curtido", reach: 9000, shares: 1, likes: 900 },
      { formato: "enviado", reach: 800, shares: 40, likes: 12 },
    ]);
    expect(p[0].formato).toBe("enviado");
  });

  it("formato sem medição nenhuma vai para o fim, não para o topo", () => {
    const p = montarPlacar([{ formato: "mudo" }, { formato: "medido", shares: 3 }]);
    expect(p[0].formato).toBe("medido");
  });
});

describe("veredito", () => {
  const base = { formato: "x", alcance: null, curtidas: null, semDados: 0 };

  it("NÃO descarta formato com amostra pequena — ruído não é sinal", () => {
    expect(veredito({ ...base, pecas: MINIMO_PARA_JULGAR - 1, envios: 0 }, 10)).toBe("observar");
  });

  it("descarta só quando fica MUITO abaixo da mediana, com amostra", () => {
    expect(veredito({ ...base, pecas: 10, envios: 10 }, 10)).toBe("descartar");
    expect(veredito({ ...base, pecas: 10, envios: 70 }, 10)).toBe("observar");
    expect(veredito({ ...base, pecas: 10, envios: 120 }, 10)).toBe("manter");
  });

  it("sem métrica, o veredito é observar — nunca descartar no escuro", () => {
    expect(veredito({ ...base, pecas: 30, envios: null }, 10)).toBe("observar");
  });
});

describe("mediana", () => {
  it("ignora formatos sem medição", () => {
    expect(medianaEnvios([
      { formato: "a", pecas: 2, envios: 10, alcance: null, curtidas: null, semDados: 0 },
      { formato: "b", pecas: 2, envios: 30, alcance: null, curtidas: null, semDados: 0 },
      { formato: "c", pecas: 2, envios: null, alcance: null, curtidas: null, semDados: 2 },
    ])).toBe(10);
  });

  it("sem nenhum dado devolve 0 em vez de estourar", () => {
    expect(medianaEnvios([])).toBe(0);
  });
});

// ─── O CRUZAMENTO (2026-08-11) — a metade que faltava para o placar existir ────
describe("cruzar o formato do banco com a métrica do Instagram", () => {
  it("junta pelo id da publicação", () => {
    const p = cruzarComMetricas(
      [{ instagramPostId: "1", formato: "analogia" }],
      [{ id: "1", reach: 300, shares: 4, likes: 20 }],
    );
    expect(p).toEqual([{ formato: "analogia", reach: 300, shares: 4, likes: 20 }]);
  });

  it("peça carimbada SEM métrica entra como ausência, não como zero", () => {
    const p = cruzarComMetricas([{ instagramPostId: "9", formato: "polemica" }], []);
    expect(p[0].reach).toBeNull();
    const placar = montarPlacar(p);
    expect(placar[0].semDados).toBe(1);
    expect(placar[0].envios).toBeNull(); // um zero aqui reprovaria formato bom
  });

  it("peça sem carimbo de formato fica de fora — não vira categoria «nenhum»", () => {
    expect(cruzarComMetricas([{ instagramPostId: "1", formato: null }], [{ id: "1", reach: 9 }])).toEqual([]);
  });

  it("id que não voltou do Instagram não contamina outro formato", () => {
    const p = cruzarComMetricas(
      [{ instagramPostId: "a", formato: "narrado" }, { instagramPostId: "b", formato: "comparacao" }],
      [{ id: "b", reach: 500, shares: 10 }],
    );
    expect(p.find((x) => x.formato === "narrado")!.reach).toBeNull();
    expect(p.find((x) => x.formato === "comparacao")!.reach).toBe(500);
  });

  it("formato com poucas peças NUNCA é descartado, mesmo com envio baixo", () => {
    const p = cruzarComMetricas(
      Array.from({ length: MINIMO_PARA_JULGAR - 1 }, (_, i) => ({ instagramPostId: String(i), formato: "tela-verde" })),
      Array.from({ length: MINIMO_PARA_JULGAR - 1 }, (_, i) => ({ id: String(i), reach: 10, shares: 0 })),
    );
    expect(veredito(montarPlacar(p)[0], 5)).toBe("observar");
  });
});
