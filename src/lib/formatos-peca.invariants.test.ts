import { describe, it, expect } from "vitest";
import { FORMATOS, formatosPara, formatoDaVaga, diretrizDoRedator } from "./formatos-peca";

// Invariantes do REDATOR DA MARCA. O que estes testes seguram é a regra que o estudo da
// referência produziu: formato = esqueleto fixo repetido, e conflito ANTES da tese.

describe("formatos da peça", () => {
  it("nenhum formato exige o rosto do dono — é trava dele", () => {
    const proibidos = /rosto|câmera na cara|apare[cç]a|grave você|selfie|talking head/i;
    for (const f of FORMATOS) {
      expect(proibidos.test(f.roteiro), `${f.id} pede presença do dono`).toBe(false);
    }
  });

  it("carrossel e reel têm formato disponível", () => {
    expect(formatosPara("carrossel").length).toBeGreaterThan(0);
    expect(formatosPara("reel").length).toBeGreaterThan(0);
  });

  it("a MESMA vaga devolve o MESMO formato — ES e BR não divergem", () => {
    const a = formatoDaVaga("carrossel", "El silencio incomoda|2026-08-09");
    const b = formatoDaVaga("carrossel", "El silencio incomoda|2026-08-09");
    expect(a.id).toBe(b.id);
  });

  it("vagas diferentes giram entre os formatos em vez de fixar num só", () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 40; i++) vistos.add(formatoDaVaga("carrossel", `tema-${i}|2026-08-09`).id);
    expect(vistos.size).toBeGreaterThan(2);
  });

  it("o formato escolhido serve à mídia pedida", () => {
    for (let i = 0; i < 25; i++) {
      expect(formatoDaVaga("reel", `t${i}|d`).midia).toContain("reel");
      expect(formatoDaVaga("carrossel", `t${i}|d`).midia).toContain("carrossel");
    }
  });

  it("toda diretriz cobra o CONFLITO na primeira tela", () => {
    for (const f of FORMATOS) {
      const d = diretrizDoRedator(f);
      expect(d, `${f.id} sem conflito`).toMatch(/CONFLITO ANTES DA TESE/);
      expect(d).toMatch(/PRIMEIRA tela nomeia a DOR/);
      expect(d).toContain(f.nome.toUpperCase());
    }
  });
});
