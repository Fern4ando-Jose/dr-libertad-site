import { describe, it, expect } from "vitest";
import { FORMATOS, formatosPara, formatoDaVaga, diretrizDoRedator, ganchosDeCarona, diretrizDeCarona } from "./formatos-peca";

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

  // ─── DELTA 2026-08-09 — o que veio dos 8 perfis medidos ───────────────────
  it("todo formato tem TÍTULO-MOLDE com espaço a preencher", () => {
    for (const f of FORMATOS) {
      // POR IDIOMA (2026-08-11): molde só em português reprovava 100% das peças em espanhol.
      for (const lang of ["br", "es"] as const) {
        expect(f.tituloMolde[lang], `${f.id}/${lang} sem molde`).toBeTruthy();
        // sem o espaço a preencher não é molde, é frase pronta — sairia igual em todo tema
        expect(f.tituloMolde[lang], `${f.id}/${lang} sem lacuna`).toContain("___");
      }
    }
  });

  it("a diretriz cobra o molde, as TRÊS camadas do gancho e a venda dentro do molde", () => {
    for (const f of FORMATOS) {
      for (const lang of ["br", "es"] as const) {
        const dl = diretrizDoRedator(f, lang);
        expect(dl, `${f.id}/${lang} sem molde na diretriz`).toContain(f.tituloMolde[lang]);
      }
      const d = diretrizDoRedator(f);
      expect(d).toMatch(/TRÊS CAMADAS/);
      expect(d).toMatch(/INTENSIFICAR o conflito/);
      expect(d).toMatch(/PRIMEIRO quadro/);
      expect(d).toMatch(/DENTRO DO MOLDE/);
      // a âncora do autor nunca cede ao molde — a trava literal manda
      expect(d).toMatch(/VERBATIM/);
    }
  });

  it("NÃO carrega régua de outra plataforma (Instagram é Instagram)", () => {
    // ordem do dono 2026-08-09: cada plataforma tem as suas regras, separadas.
    // A régua de YouTube Shorts mora no motor do YouTube — se vazar para cá, reprova.
    for (const f of FORMATOS) {
      const d = diretrizDoRedator(f);
      expect(d).not.toMatch(/YouTube|Shorts|entendível no mudo|anuncie o fim/i);
    }
  });

  // ─── CARONA (delta 2026-08-09) — ancorar no que já tem procura ─────────────
  it("a diretriz cobra a carona, e sempre no CONFLITO", () => {
    for (const f of FORMATOS) {
      const d = diretrizDoRedator(f);
      expect(d).toMatch(/CARONA/);
      expect(d).toMatch(/NOME PRÓPRIO/);
      expect(d).toMatch(/entra no CONFLITO, nunca na tese/);
      // a guarda da voz: carona não vira julgamento de pessoa
      expect(d).toMatch(/jamais julgar, expor ou ridicularizar/);
    }
  });

  it("acha nome próprio, número e data na pesquisa", () => {
    const p = 'Estudo publicado em 2026 mostra que 62% dos jovens dormem com o celular. Anna Lembke, de Stanford, chama isso de dívida de dopamina.';
    const g = ganchosDeCarona(p, 9);
    expect(g.some((x) => /Anna Lembke/.test(x))).toBe(true);
    expect(g.some((x) => /62\s?%/.test(x))).toBe(true);
    expect(g.some((x) => /2026/.test(x))).toBe(true);
  });

  it("NÃO inventa gancho quando não há pesquisa — silêncio, não lista de mentira", () => {
    expect(ganchosDeCarona('')).toEqual([]);
    expect(ganchosDeCarona(null)).toEqual([]);
    expect(ganchosDeCarona('texto simples sem nada citável aqui.')).toEqual([]);
    expect(diretrizDeCarona('')).toBe('');
    expect(diretrizDeCarona('nada citável.')).toBe('');
  });

  it("uma palavra capitalizada sozinha NÃO é nome próprio (todo início de frase é maiúsculo)", () => {
    expect(ganchosDeCarona('Dopamina causa isso. Cerebro reage assim.')).toEqual([]);
  });

  it("o bloco da carona se declara OFERTA, não ordem", () => {
    const d = diretrizDeCarona('Segundo Anna Lembke, 62% relatam o mesmo.');
    expect(d).toMatch(/CARONA DISPONÍVEL/);
    expect(d).toMatch(/oferta, não ordem/);
    expect(d).toMatch(/Anna Lembke/);
  });
});