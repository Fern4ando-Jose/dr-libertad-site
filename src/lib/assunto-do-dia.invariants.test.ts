import { describe, it, expect } from "vitest";
import { categoriaDoTema, diretrizDoAssuntoDoDia, diretrizDoTemaDoDia, escolherTemaDoDia, pertinente, type AssuntoQuente } from "./assunto-do-dia";
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

describe("a polêmica do dia vira o TEMA da reel (15/08/2026 — ordem do dono)", () => {
  // A carona deixa de ser OFERTA e vira o TEMA: *"no inicio do dia deve buscar algum tema
  // que está polemico, e vamos criar o reel referente a esse tema, porem com nossa voz"*.
  // Medido no mesmo dia (54 peças): a oferta deixava ZERO rastro — ela não escolhia o tema.
  const manchete: AssuntoQuente[] = [
    { titulo: "Escolas proíbem celular e o debate esquenta", resumo: "Especialistas divergem sobre o efeito da proibição no rendimento e na ansiedade dos alunos.", fonte: "https://x.com" },
  ];

  it("escolhe a 1ª polêmica aproveitável como tema, com categoria da marca", () => {
    const t = escolherTemaDoDia(manchete);
    expect(t?.topic).toContain("proíbem celular");
    expect(t?.cat).toBe("dopamine"); // "celular" → dopamine
  });

  it("sem polêmica, devolve null — a rotação segue intocada", () => {
    expect(escolherTemaDoDia([])).toBeNull();
  });

  it("categoria é sempre uma das 6 da marca (fallback 'freedom')", () => {
    const cats = ["dopamine", "anxiety", "mind", "self", "network", "freedom"];
    for (const titulo of ["Liberdade e autonomia", "A ansiedade nas redes", "Qualquer título"]) {
      expect(cats).toContain(categoriaDoTema(titulo));
    }
  });

  it("a diretriz do tema MANDA ancorar na polêmica, com a nossa voz e sem julgar pessoa", () => {
    const d = diretrizDoTemaDoDia({ topic: "X", cat: "freedom", subject: "X", fonte: "", resumo: "" });
    expect(d).toMatch(/O TEMA DE HOJE É A POLÊMICA/);
    expect(d).toMatch(/a tese continua sendo da marca/);
    expect(d).toMatch(/julgar, expor ou ridicularizar/i);
  });
});

describe("está LIGADO no caminho da peça", () => {
  // O defeito que esta sessão encontrou duas vezes: código escrito, testado e que ninguém
  // chama. Estes testes provam que o assunto do dia CHEGA ao redator — e agora também
  // vira o TEMA da reel no preview (a 1ª tarefa do dia).
  const publish = readFileSync(join(__dirname, "..", "app", "api", "publish", "route.ts"), "utf8");

  it("a rota chama a busca e injeta a diretriz no prompt", () => {
    expect(publish).toMatch(/diretrizDoAssuntoDoDia\(await assuntosDoDia\(lang\)\)/);
    expect(publish).toMatch(/import \{[^}]*assuntosDoDia[^}]*\} from "@\/lib\/assunto-do-dia"/);
  });

  it("a 1ª tarefa do dia é a busca da polêmica, e ela vira o TEMA do preview", () => {
    expect(publish).toMatch(/garantirTemaDoDia\(/);
    expect(publish).toMatch(/tema\?\.topic/); // a polêmica entra como seed do tema da reel
    expect(publish).toMatch(/diretrizDoTemaDoDia/); // a oferta vira ordem quando há tema
  });

  it("o carrossel NÃO muda — a ordem do dono fala do REEL", () => {
    // O preview (reel) é o caminho que consome o tema do dia; sem polêmica (fail-open)
    // a rotação dos temas segue como seed, e o carrossel não recebe tema do dia.
    expect(publish).toMatch(/tema\?\.topic \?\? await getFreshTopicForRun/); // fail-open → rotação
  });
});
