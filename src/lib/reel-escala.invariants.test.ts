import { describe, it, expect } from "vitest";
import {
  FATOR_LARGURA,
  REEL_ALTURA_MANCHETE,
  REEL_LARGURA_UTIL,
  REEL_MARGEM_LATERAL,
  REEL_W,
  fitTitleFill,
  ocupacaoDoQuadro as ocupacaoCom,
  quebrarPorPalavra,
  tamanhoInsight,
  tamanhoManchete,
} from "./capa-escala";

// Invariantes da escala da letra NO REEL. O defeito medido em 09–11/08: a manchete
// ocupava 74–76% da largura do quadro, contra 85–95% nas 10 contas de referência do
// nicho. Estes testes existem para que ninguém devolva o tamanho fixo sem perceber.
//
// ⚠️ A conta destes testes é a MESMA que o vídeo usa, e ela foi CALIBRADA contra um
// quadro renderizado de verdade (`node scripts/medir-manchete.mjs`): a primeira versão
// previa 88% e o quadro entregou 69%, porque estimava a quebra por letra em vez de por
// palavra. Teste que só confere consigo mesmo sempre fecha — a prova final é o quadro.

/** Quanto da LARGURA DO QUADRO (1080) a manchete ocupa — é essa a régua das 10 contas. */
function ocupacaoDoQuadro(t: string): number {
  return ocupacaoCom(t, tamanhoManchete(t));
}

describe("a margem lateral do Reel", () => {
  it("deixa a régua de 85% ALCANÇÁVEL — com 90px de cada lado ela não era", () => {
    // Com a margem antiga (90), o teto absoluto era 900/1080 = 83,3%: nem a frase
    // perfeita chegaria a 85%. Este é o teste que explica por que a margem mudou.
    expect((REEL_W - 2 * 90) / REEL_W).toBeLessThan(0.85);
    expect(REEL_LARGURA_UTIL / REEL_W).toBeGreaterThanOrEqual(0.9);
    expect(REEL_MARGEM_LATERAL).toBeLessThan(90);
  });
});

describe("a manchete do Reel enche a largura", () => {
  const frases = [
    "Você está competindo contra a pessoa errada",
    "Ninguém te deve nada",
    "Se você não põe limites, vira uma opção",
    "A gaiola não tem grade",
    "Nadie te contó que el descanso también se entrena",
  ];

  it("fica na faixa das contas de referência (85–96% do quadro)", () => {
    for (const t of frases) {
      const o = ocupacaoDoQuadro(t);
      expect(o, `${t} → ${(o * 100).toFixed(1)}%`).toBeGreaterThanOrEqual(0.85);
      expect(o, `${t} → ${(o * 100).toFixed(1)}%`).toBeLessThanOrEqual(0.96);
    }
  });

  it("ocupa mais quadro que o tamanho fixo de 108px que estava em produção", () => {
    // A régua da referência é OCUPAÇÃO, não corpo de letra. Antes: corpo fixo de 108 numa
    // caixa de 900px (margem de 90 de cada lado) — o que a peça publicada mediu em 74–76%.
    for (const t of frases) {
      const antes = ocupacaoCom(t, 108, 900);
      expect(ocupacaoDoQuadro(t), `${t}: antes ${(antes * 100).toFixed(1)}%`).toBeGreaterThan(antes);
    }
  });

  it("corpo MAIOR nem sempre é ocupação maior — a armadilha que o quadro revelou", () => {
    // Com quebra por palavra a ocupação SOBE E DESCE conforme o corpo: subir dois pixels
    // pode empurrar uma palavra inteira para a linha seguinte e encurtar a linha mais
    // longa. É por isso que "o maior corpo que cabe" (a conta da capa de imagem) não serve
    // aqui, e por isso a busca precisa varrer. Se este teste falhar, alguém trocou a busca
    // por uma fórmula fechada — e a peça volta a sair com um terço do quadro vazio.
    const t = "Ninguém te prendeu: a porta está aberta";
    const serie: number[] = [];
    for (let s = 60; s <= 190; s += 2) serie.push(ocupacaoCom(t, s));
    const desceEmAlgumPonto = serie.some((v, i) => i > 0 && v < serie[i - 1]);
    expect(desceEmAlgumPonto).toBe(true);
    // E o corpo escolhido não é o teto: é o maior que ainda cumpre a régua.
    expect(tamanhoManchete(t)).toBeLessThan(190);
    expect(ocupacaoDoQuadro(t)).toBeGreaterThanOrEqual(0.85);
  });

  it("frase curta enche a linha em vez de sobrar margem", () => {
    const curta = "Ninguém te deve nada";
    expect(quebrarPorPalavra(curta, tamanhoManchete(curta), REEL_LARGURA_UTIL, FATOR_LARGURA.anton).larguraMaxima)
      .toBeGreaterThanOrEqual(REEL_LARGURA_UTIL * 0.9);
  });

  it("nunca estoura a faixa de altura livre da interface do Instagram", () => {
    for (const t of [...frases, "palavra ".repeat(20)]) {
      const q = quebrarPorPalavra(t, tamanhoManchete(t), REEL_LARGURA_UTIL, FATOR_LARGURA.anton);
      expect(q.altura, t.slice(0, 24)).toBeLessThanOrEqual(REEL_ALTURA_MANCHETE);
    }
  });

  it("palavra longa sozinha não vaza da largura útil", () => {
    const t = "Autodesenvolvimento incondicional";
    const q = quebrarPorPalavra(t, tamanhoManchete(t), REEL_LARGURA_UTIL, FATOR_LARGURA.anton);
    expect(q.larguraMaxima).toBeLessThanOrEqual(REEL_LARGURA_UTIL);
  });
});

describe("o insight segue a mesma régua", () => {
  it("ocupa mais quadro que o 88px fixo e cabe na faixa livre", () => {
    for (const t of ["O feed te paga em moeda barata", "La recompensa fácil cobra caro después"]) {
      const s = tamanhoInsight(t);
      expect(ocupacaoCom(t, s), t).toBeGreaterThan(ocupacaoCom(t, 88, 900));
      expect(quebrarPorPalavra(t, s, REEL_LARGURA_UTIL, FATOR_LARGURA.anton).altura).toBeLessThanOrEqual(
        REEL_ALTURA_MANCHETE,
      );
    }
  });
});

describe("a conta da capa de IMAGEM não regrediu", () => {
  it("o fator do OG continua o de 09/08 — trocar sem medir é o erro que se evita", () => {
    expect(FATOR_LARGURA.og).toBe(0.66);
    // Os mesmos números que o teste de 09/08 trava, agora pela fonte única.
    const MW = 1080 - 2 * 72;
    const MH = Math.round(1350 * 0.46);
    expect(fitTitleFill("Ninguém te deve nada", MW, 5, 210, MH)).toBeGreaterThan(150);
  });
});
