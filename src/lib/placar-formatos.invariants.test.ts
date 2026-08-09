import { describe, it, expect } from "vitest";
import { montarPlacar, veredito, medianaEnvios, MINIMO_PARA_JULGAR } from "./placar-formatos";

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
