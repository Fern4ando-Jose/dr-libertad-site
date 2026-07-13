// ─── Invariante do MOTOR DE SEND (CTA que NOMEIA o destinatário) ──────────────
// Estratégia verificada (Mosseri 2025): no IG o LIKE só distribui p/ seguidores; só
// o ENVÍO em DM (share) abre a peça a QUEM AINDA NÃO segue. Os virais do nicho
// desenham cada peça para ser ENVIADA a uma pessoa NOMEADA ("manda pra quem…").
// O "cta" gerado pelo prompt é o lugar onde esse motor mora — este teste garante que
// o campo "cta" do JSON continue sendo uma CHAMADA A ENVIAR que NOMEIA o destinatário,
// e NÃO regrida para a antiga "pregunta que invite a comentar con alguien" (genérica).
// É um guarda de fonte: lê o texto do prompt em publish/route.ts. Se alguém afrouxar o
// CTA de send, o CI fica vermelho antes de ir ao ar.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = readFileSync(resolve(process.cwd(), "src/app/api/publish/route.ts"), "utf8");

// Extrai a linha de especificação do campo "cta": do JSON pedido ao haiku.
function ctaFieldSpec(): string {
  const line = SRC.split(/\r?\n/).find((l) => /^\s*"cta":/.test(l));
  if (!line) throw new Error('não achei a linha do campo "cta": no prompt');
  return line;
}

describe("motor de SEND — o cta NOMEIA o destinatário", () => {
  it('o campo "cta" é uma CHAMADA A ENVIAR (send), não uma pergunta genérica p/ comentar', () => {
    const spec = ctaFieldSpec();
    // Deve pedir ENVÍO/enviar/mandar/etiquetar (o gesto de SHARE que abre a não-seguidores)
    expect(spec).toMatch(/ENV[IÍ]O|ENVIAR|MANDE|ETIQUETE|Manda esto/i);
  });

  it('o cta exige NOMEAR o destinatário ligado ao tema (não "con alguien" genérico)', () => {
    const spec = ctaFieldSpec();
    expect(spec).toMatch(/DESTINATARIO|NOMBRA/i);
    // Regressão: não pode voltar a ser "pregunta ... que invite a comentar ... con alguien"
    expect(spec).not.toMatch(/pregunta de 60-100 chars que invite a comentar y a etiquetar\/compartir con alguien/i);
  });

  it("o princípio de ENVÍOS explica a mecânica (só o send abre a não-seguidores) e manda NOMEAR", () => {
    // O bloco do MOTOR DE ATENCIÓN deve conter a razão + a ordem de nomear o destinatário
    expect(SRC).toMatch(/solo el ENV[IÍ]O en DM|solo el ENV[IÍ]O.*abre/i);
    expect(SRC).toMatch(/NOMBRA al DESTINATARIO concreto ligado a ESTE tema/i);
  });

  it("a legenda também pede ENVIAR nomeando a quem (share com destinatário)", () => {
    expect(SRC).toMatch(/ENVIAR \(📩\) diciendo A QUI[EÉ]N/i);
  });
});
