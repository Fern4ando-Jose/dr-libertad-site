import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ─── O GUARDIÃO DE ARTE — a direção travada pelo dono não se perde no código ──
// POR QUE EXISTE (2026-08-09, palavras dele ao ver a peça no feed: "peça publicada
// incorreta, onde estão os guardiões?? eles não sabem o que devem corrigir?? fonte
// errada, cores erradas").
//
// Ele estava certo, e o buraco era de desenho: o portão de formato (verificador-formato.ts)
// lê o TEXTO da peça. Fonte e cor não estão no texto — estão no código do render, e ali
// não havia guardião nenhum. Uma regressão de arte passava sem nada acender.
//
// Este teste lê o código do render e reprova quem quebrar a direção travada em
// `.claude/marca/dr-libertad/DIRECAO-CAPAS.md` (fundo escuro, acento por categoria) e a
// régua de tipografia da `BIBLIOTECA-FORMATOS.md` §2.1/§2.2 (frase condensada, marca serifada).
//
// ⚠️ Ele NÃO julga beleza — julga o que é objetivo e já foi decidido pelo dono. Beleza
// continua sendo olho humano; regressão silenciosa é o que este arquivo mata.

const raiz = path.resolve(__dirname, "../../");
const ler = (p: string) => fs.readFileSync(path.join(raiz, p), "utf8");

describe("guardião de arte — a direção travada pelo dono", () => {
  const reel = ler("video/ReelV2.tsx");

  it("a FRASE do vídeo usa a condensada (Anton), não a serifa", () => {
    // A serifa na frase não segura no feed — medido em Comparacao-Fontes-2026-08-09.
    expect(reel).toMatch(/loadAnton|google-fonts\/Anton/);
    // nenhum bloco de frase (peso 800) pode ter voltado para a Fraunces
    expect(reel).not.toMatch(/fontFamily: FRAUNCES, fontWeight: 800/);
  });

  it("a MARCA continua na serifa — o contraste é a assinatura", () => {
    // trocar tudo para condensada mataria o contraste serifa × condensada que a marca pede
    expect(reel).toMatch(/loadFraunces|google-fonts\/Fraunces/);
    expect((reel.match(/fontFamily: FRAUNCES/g) || []).length).toBeGreaterThan(0);
  });

  it("o fundo é ESCURO — o creme/grafite foi REPROVADO pelo dono em 15/07", () => {
    // a direção morta: "grafite/lápis sobre creme". Se um fundo claro voltar como cor de
    // base do quadro, é a regressão que ele já reprovou uma vez.
    const fundosClarosProibidos = /backgroundColor:\s*["'`]#(F4F0E8|FFF|FFFFFF|F5F5F5)["'`]/i;
    expect(reel).not.toMatch(fundosClarosProibidos);
  });

  it("o ACENTO por categoria existe — a cor é do tema, não uma só para tudo", () => {
    // 6 acentos travados na DIRECAO-CAPAS. O render tem de receber acento, não cravar um.
    expect(reel).toMatch(/accent/i);
  });

  it("a assinatura da marca e o número aparecem no vídeo", () => {
    // "DR. LIBERDADE · Nº XXX" é a âncora de coleção — sem ela a peça não é da marca
    expect(reel).toMatch(/Nº|edition|kicker/i);
  });

  it("a MARCA do video usa o CREME, nao o acento — azul/teal somem no fundo escuro", () => {
    // O dono viu no feed: a Nº 358 com "DR. LIBERDADE · Nº 358" ilegivel. A capa (/api/og) ja
    // fazia certo (texto creme + regua no acento); o video pintava o texto com o acento da
    // categoria. Mesma marca nos dois lugares — o acento continua, na regua.
    for (const arq of ["video/ReelV2.tsx", "video/Reel.tsx"]) {
      const src = ler(arq);
      expect(src, arq).not.toMatch(/letterSpacing: 2, color,/);
      expect(src, arq).not.toMatch(/fontWeight: 700, color: accentColor/);
    }
  });

  it("os DOIS motores de video usam a mesma tipografia — peca nao pode variar de fonte", () => {
    for (const arq of ["video/ReelV2.tsx", "video/Reel.tsx"]) {
      const src = ler(arq);
      expect(src, arq).toMatch(/loadAnton|google-fonts\/Anton/);
      expect(src, arq).not.toMatch(/fontFamily: FRAUNCES, fontWeight: 800/);
    }
  });
});