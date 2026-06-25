import { describe, it, expect } from "vitest";
import { foreignTokens, scanContentForeign } from "./lang-guard";

// Invariantes da trava de pureza de idioma ("BR é BR; ES é ES"). Casos REAIS do
// content_cache (25/06) — os limpos NÃO podem ser marcados (falso positivo =
// vaga perdida); os contaminados TÊM de ser pegos.

describe("foreignTokens — espanhol vazando em conteúdo PT", () => {
  it("pega o vazamento real do Reel BR (slide copiado do tema ES)", () => {
    const leak = "Voar más alto no es traición: es lealtad a lo que eres";
    const hits = foreignTokens(leak, "pt");
    expect(hits).toContain("más");
    expect(hits).toContain("es");
    expect(hits).toContain("traición");
    expect(hits).toContain("lealtad");
    expect(hits).toContain("eres");
  });

  it("pega 'cita' (encontro) do Reel clássico BR", () => {
    expect(foreignTokens("na cita aparece outra pessoa", "pt")).toContain("cita");
  });

  it("pega a hashtag #MenteLibre (camelCase separado → 'libre')", () => {
    expect(foreignTokens("#MenteLibre", "pt")).toContain("libre");
  });

  it("pega outros espanholismos do marketBrief", () => {
    expect(foreignTokens("revisa el móvil", "pt")).toEqual(
      expect.arrayContaining(["el", "móvil"]),
    );
    expect(foreignTokens("disfrutar la pantalla ahora", "pt")).toEqual(
      expect.arrayContaining(["disfrutar", "pantalla", "ahora"]),
    );
  });
});

describe("foreignTokens — PT legítimo NÃO é marcado (falso positivo)", () => {
  const limpos = [
    "A verdade incomoda mais que a mentira amável",
    "Mentira amável = escravidão disfarçada de aceitação",
    "A liberdade começa onde acaba o medo",
    "Você gasta mais tempo escolhendo que vivendo",
    "Liberdade não é ter mil opções; é ter clareza pra descartar 999",
    "Nunca mude quem você é por ninguém",
    "Qual é o medo que está te mantendo preso agora?",
    "#VerdadeIncômoda",
    "#LiberdadeMental",
    "#CrescerSemCulpa",
    "#DesconectarParaConectar",
    "Siga @dr.liberdade.br se você prefere a verdade desconfortável",
  ];
  for (const t of limpos) {
    it(`limpo: "${t.slice(0, 38)}"`, () => {
      expect(foreignTokens(t, "pt")).toEqual([]);
    });
  }
});

describe("foreignTokens — ES legítimo NÃO é marcado (não vê PT onde não há)", () => {
  const limpos = [
    "Nunca cambies lo que eres por nadie",
    "La verdad incomoda más que la mentira amable",
    "La libertad empieza donde acaba el miedo",
    "Revisas el móvil 144 veces al día",
  ];
  for (const t of limpos) {
    it(`ES limpo: "${t.slice(0, 38)}"`, () => {
      expect(foreignTokens(t, "es")).toEqual([]);
    });
  }
});

describe("scanContentForeign — varre só os campos que vão pro feed/Reel", () => {
  it("flagra o conteúdo real contaminado (slide + tags)", () => {
    const content = {
      postTitle: "Crescer é trair quem você era?",
      slides: [
        "Voar más alto no es traición: es lealtad a lo que eres",
        "Culpa é a corrente invisível que mantém gente pequenininha",
        "Crescer é matar quem você era — e isso é exatamente o ponto",
      ],
      cta: "Você deixou algo para trás na sua subida? Etiqueta quem precisa ler.",
      instagramCaption: "Tem uma culpa que ninguém fala: a de crescer.",
      tags: ["#LealdadeAVoceMesmo", "#CrexerSemCulpa", "#LiberdadeMental", "#MenteLibre"],
    };
    const hits = scanContentForeign(content, "pt");
    const fields = hits.map((h) => h.field);
    expect(fields).toContain("slides[0]");
    expect(fields).toContain("tags");
    // slides limpos NÃO entram
    expect(fields).not.toContain("slides[1]");
    expect(fields).not.toContain("slides[2]");
    expect(fields).not.toContain("postTitle");
  });

  it("conteúdo PT 100% limpo → nenhuma ocorrência", () => {
    const content = {
      postTitle: "A liberdade começa onde acaba o medo",
      slides: [
        "A liberdade começa onde acaba o medo",
        "Medo sussurra. Você escuta. Você obedece.",
        "Todo dia você escolhe entre viver e estar seguro.",
      ],
      cta: "Qual é o medo que está te mantendo preso agora?",
      instagramCaption: "Você já reparou que o medo nunca grita? Siga @dr.liberdade.br.",
      tags: ["#LiberdadeMental", "#Medo", "#Autonomia", "#PsicologiaBrasil"],
    };
    expect(scanContentForeign(content, "pt")).toEqual([]);
  });
});
