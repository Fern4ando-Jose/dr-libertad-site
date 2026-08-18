// ⛔ O SEGUNDO IDIOMA NÃO PERDE A VAGA POR TRÊS MINUTOS (17/08/2026).
//
// Ordem do dono: *"o looping tem que ser implementado para que nunca perca um post"*. Ele
// pegou o dia em que o Reel saiu no ES e não saiu no BR. Medido nos dois robôs:
//
//   22:43 ES começa · 22:44 BR começa · 22:45 BR pede verba para completar a peça → NEGADO
//   ("a irmã ainda não publicou") · 22:48 ES publica.
//
// O perdão de atomicidade existia desde 07/07, mas perguntava "a irmã já PUBLICOU?" — numa
// corrida de 1 minuto isso responde "não" quase sempre, e o segundo idioma morre com o robô
// verde. Estas provas travam a pergunta certa: **a irmã já está NA VAGA?**
import { describe, it, expect } from "vitest";
import fs from "node:fs";

const ROTA = fs.readFileSync("src/app/api/publish/route.ts", "utf8");
const LEDGER = fs.readFileSync("src/lib/run-ledger.ts", "utf8");

describe("a vaga do par ES+BR não morre na corrida", () => {
  it("o Reel perdoa pela PRESENÇA na vaga, não por a irmã ter publicado", () => {
    // A janela pega o gate do preview do Reel (ig-reels) e o que ele decide logo abaixo.
    const gate = ROTA.slice(ROTA.indexOf('checkBudget("ig-reels"'), ROTA.indexOf('checkBudget("ig-reels"') + 1800);
    expect(gate).toContain("siblingActiveInVaga");
    expect(gate).not.toContain("siblingPublished(");
  });

  it("o carrossel usa a mesma pergunta — o defeito é o mesmo nas duas peças", () => {
    const gate = ROTA.slice(ROTA.indexOf('checkBudget("ig-posts"'), ROTA.indexOf('checkBudget("ig-posts"') + 2600);
    expect(gate).toContain("siblingActiveInVaga");
  });

  it("cada idioma MARCA presença antes de pedir verba — senão a irmã não tem como vê-lo", () => {
    expect(ROTA).toContain("marcarVagaIniciada");
    // Presença antes do gate: marcar depois não resolveria corrida nenhuma.
    const iMarca = ROTA.indexOf("marcarVagaIniciada(dayBRT(now), r, lang)");
    const iGate = ROTA.indexOf('checkBudget("ig-reels"');
    expect(iMarca).toBeGreaterThan(0);
    expect(iMarca).toBeLessThan(iGate);
  });
});

describe("a marca de presença não faz ninguém achar que houve post", () => {
  it("quem decide publicação continua exigindo o id do post", () => {
    const f = LEDGER.slice(LEDGER.indexOf("export async function runAlreadyPublished"), LEDGER.indexOf("export async function runAlreadyPublished") + 700);
    expect(f).toContain("instagram_post_id IS NOT NULL");
  });

  it("a presença entra com attempts 0 e nunca rebaixa quem já publicou", () => {
    const f = LEDGER.slice(LEDGER.indexOf("export async function marcarVagaIniciada"), LEDGER.indexOf("export async function marcarVagaIniciada") + 700);
    expect(f).toContain("DO NOTHING");
    expect(f).toMatch(/NOW\(\), 0/);
  });

  it("sem banco, o comportamento é o de antes (fail-open)", () => {
    const f = LEDGER.slice(LEDGER.indexOf("export async function siblingActiveInVaga"), LEDGER.indexOf("export async function siblingActiveInVaga") + 700);
    expect(f).toMatch(/catch\s*\{\s*return false;/);
  });

  it("a irmã é a OUTRA língua — nunca a própria (o legado 'pt' conta junto)", () => {
    const f = LEDGER.slice(LEDGER.indexOf("export async function siblingActiveInVaga"), LEDGER.indexOf("export async function siblingActiveInVaga") + 700);
    expect(f).toContain("lang NOT IN");
    expect(f).toContain("langLegado(lang)");
  });
});
