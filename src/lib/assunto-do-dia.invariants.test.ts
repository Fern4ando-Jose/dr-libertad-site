import { describe, it, expect } from "vitest";
import { diretrizDoAssuntoDoDia, pertinente, type AssuntoQuente } from "./assunto-do-dia";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// A pergunta do dono (11/08/2026): «não íamos criar os posts de acordo com uma polêmica do
// dia? como ficou isso?». A resposta medida era: NENHUMA — a pesquisa da peça busca o TEMA
// (catálogo fixo de 61), atemporal. Este módulo é o que faltava; os testes travam as duas
// coisas que ele NÃO pode virar: obrigação, e ataque a pessoa.

const q = (t: string, c: string, u = "https://x.com/a"): Parameters<typeof pertinente>[0] => ({
  title: t,
  content: c,
  url: u,
});

describe("o que vira gancho e o que é ruído", () => {
  it("aceita discussão com substância", () => {
    expect(
      pertinente(
        q(
          "Escolas proíbem celular e o debate esquenta",
          "Especialistas divergem sobre o efeito da proibição no rendimento e na ansiedade dos alunos ao longo do ano letivo.",
        ),
      ),
    ).toBe(true);
  });

  it("recusa página de compra — nada disso vira peça", () => {
    expect(
      pertinente(q("Comprar celular barato", "Veja o melhor preço e cupom de desconto com frete grátis para o seu novo aparelho hoje.")),
    ).toBe(false);
  });

  it("recusa resultado sem substância (título ou resumo curtos demais)", () => {
    expect(pertinente(q("Celular", "Notícia sobre celular."))).toBe(false);
    expect(pertinente(q("Um debate importante hoje", "Curto."))).toBe(false);
  });

  it("recusa listagem de vídeos/imagens", () => {
    expect(
      pertinente(q("Vídeos sobre redes sociais", "Uma coletânea grande de vídeos e imagens sobre o assunto para você assistir agora mesmo.")),
    ).toBe(false);
  });
});

describe("a diretriz é OFERTA, nunca ordem", () => {
  const um: AssuntoQuente[] = [{ titulo: "Escolas proíbem celular", resumo: "O debate esquenta.", fonte: "https://x" }];

  it("sem assunto, o bloco é VAZIO — não se manda usar o que não existe", () => {
    expect(diretrizDoAssuntoDoDia([])).toBe("");
  });

  it("diz explicitamente para IGNORAR quando não couber", () => {
    const d = diretrizDoAssuntoDoDia(um);
    expect(d).toMatch(/não coube|Não coube/i);
    expect(d).toMatch(/sem forçar/i);
  });

  it("proíbe atacar quem for citado — a provocação é pela ideia", () => {
    const d = diretrizDoAssuntoDoDia(um);
    expect(d).toMatch(/jamais julgar, expor ou ridicularizar/i);
    expect(d).toMatch(/pela IDEIA/);
  });

  it("a carona entra no CONFLITO, não na tese", () => {
    expect(diretrizDoAssuntoDoDia(um)).toMatch(/entra no CONFLITO, nunca na tese/);
  });
});

describe("está LIGADO no caminho da peça", () => {
  // O defeito que esta sessão encontrou duas vezes: código escrito, testado e que ninguém
  // chama. Este teste é a prova de que o assunto do dia chega ao redator.
  const publish = readFileSync(join(__dirname, "..", "app", "api", "publish", "route.ts"), "utf8");

  it("a rota chama a busca e injeta a diretriz no prompt", () => {
    expect(publish).toMatch(/diretrizDoAssuntoDoDia\(await assuntosDoDia\(lang\)\)/);
    expect(publish).toMatch(/import \{[^}]*assuntosDoDia[^}]*\} from "@\/lib\/assunto-do-dia"/);
  });

  it("NÃO escolhe o tema da peça — a rotação dos 61 continua intocada", () => {
    const mod = readFileSync(join(__dirname, "assunto-do-dia.ts"), "utf8");
    expect(mod).not.toMatch(/TOPIC|topics|escolherTema|pickTopic/);
  });
});
