import { describe, it, expect } from "vitest";
import { foreignTokens, scanContentForeign } from "./lang-guard";

// Invariantes da trava de pureza de idioma ("BR é BR; ES é ES"). Casos REAIS do
// content_cache (25/06) — os limpos NÃO podem ser marcados (falso positivo =
// vaga perdida); os contaminados TÊM de ser pegos.

describe("foreignTokens — espanhol vazando em conteúdo PT", () => {
  it("pega o vazamento real do Reel BR (slide copiado do tema ES)", () => {
    const leak = "Voar más alto no es traición: es lealtad a lo que eres";
    const hits = foreignTokens(leak, "br");
    expect(hits).toContain("más");
    expect(hits).toContain("es");
    expect(hits).toContain("traición");
    expect(hits).toContain("lealtad");
    expect(hits).toContain("eres");
  });

  // "cita" SAIU da lista em 04/08/2026: em português é o verbo citar ("ele cita o
  // autor") e aparecia 14× nos manuscritos — marcá-la bloquearia post legítimo. O
  // vazamento REAL que este teste guardava é a frase inteira do tema espanhol, e
  // ela continua sendo pega por "la", "haces" e "otra".
  it("pega a frase do tema ES sobre encontros (sem depender de 'cita')", () => {
    const leak = "En la foto haces match; en la cita aparece otra persona";
    expect(foreignTokens(leak, "br")).toEqual(
      expect.arrayContaining(["la", "haces", "otra"]),
    );
  });

  it("NÃO marca 'cita' quando é o verbo citar em português", () => {
    expect(foreignTokens("ele cita o estudo e some", "br")).toEqual([]);
  });

  it("pega a hashtag #MenteLibre (camelCase separado → 'libre')", () => {
    expect(foreignTokens("#MenteLibre", "br")).toContain("libre");
  });

  it("pega 'adelanto' vazado na legenda do funil (ED 04 PT)", () => {
    const leak = "comenta LIBERDADE e te mando o adelanto do livro na DM";
    expect(foreignTokens(leak, "br")).toContain("adelanto");
  });

  it("pega 'libro'/'mensaje' (família do funil)", () => {
    expect(foreignTokens("recebe o libro por mensaje privado", "br")).toEqual(
      expect.arrayContaining(["libro", "mensaje"]),
    );
  });

  it("pega outros espanholismos do marketBrief", () => {
    expect(foreignTokens("revisa el móvil", "br")).toEqual(
      expect.arrayContaining(["el", "móvil"]),
    );
    expect(foreignTokens("disfrutar la pantalla ahora", "br")).toEqual(
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
      expect(foreignTokens(t, "br")).toEqual([]);
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
    const hits = scanContentForeign(content, "br");
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
    expect(scanContentForeign(content, "br")).toEqual([]);
  });
});

// A4 (auditoria 30/06): reforço da lista — verbos/palavras ES de alta frequência que
// vazavam no PT. Alta precisão: só formas ES-EXCLUSIVAS (querer/sentir existem nos dois
// → FORA). Estes casos aproximam a copy PT contaminada real que passava antes.
describe("foreignTokens — A4: espanhol de alta frequência vazando no PT", () => {
  it("pega verbos ES-exclusivos (necesitas/tienes/hace/quiere/cambia)", () => {
    expect(foreignTokens("no necesitas ser amado", "br")).toContain("necesitas");
    expect(foreignTokens("tienes que hacer algo", "br")).toEqual(expect.arrayContaining(["tienes", "hacer"]));
    expect(foreignTokens("solo cambias cuando quieres", "br")).toEqual(expect.arrayContaining(["cambias", "quieres"]));
    expect(foreignTokens("y duele mucho", "br")).toContain("duele");
  });

  it("pega 'hombre' e o comparativo ES (peor/mejor)", () => {
    expect(foreignTokens("el hombre no llora", "br")).toContain("hombre");
    expect(foreignTokens("es peor de lo que crees", "br")).toContain("peor");
  });

  it("NÃO marca PT legítimo com as raízes compartilhadas (querer/sentir/melhor)", () => {
    expect(foreignTokens("você precisa querer mudar e sentir de novo", "br")).toEqual([]);
    expect(foreignTokens("é melhor viver do que fingir", "br")).toEqual([]);
  });

  it("PT vazando no ES: 'porém/também/têm/melhor/pior' são pegos", () => {
    expect(foreignTokens("es mejor, porém duele", "es")).toContain("porém");
    expect(foreignTokens("eles têm medo também", "es")).toEqual(expect.arrayContaining(["têm", "também"]));
  });

  it("NÃO marca ES legítimo com 'mejor/peor' (formas ES, não PT)", () => {
    expect(foreignTokens("es mejor que ayer, y menos peor", "es")).toEqual([]);
  });
});

// ─── A5 (04/08/2026): o erro que o dono viu no feed ──────────────────────────
// «Influência não absuelve:» foi ao ar em @dr.liberdade.br. A lista da época não
// conhecia o verbo. Estas provas guardam o buraco fechado.
describe("A5 — a mescla que chegou ao feed do Instagram", () => {
  it("pega «Influência não absuelve:» exatamente como saiu no Reel", () => {
    expect(foreignTokens("Influência não absuelve:", "br")).toContain("absuelve");
  });

  it("pega a família da ditongação espanhola (vuelve/resuelto/absuelva)", () => {
    expect(foreignTokens("ele vuelve sempre", "br")).toContain("vuelve");
    expect(foreignTokens("nada está resuelto", "br")).toContain("resuelto");
    expect(foreignTokens("que ela absuelva você", "br")).toContain("absuelva");
  });

  it("pega palavra que ninguém listou, pela forma (-ble, -iendo, -arse, -aron, -tud)", () => {
    expect(foreignTokens("isso é imposible", "br")).toContain("imposible");
    expect(foreignTokens("continua viviendo a mentira", "br")).toContain("viviendo");
    expect(foreignTokens("é hora de rendirse", "br")).toContain("rendirse");
    expect(foreignTokens("eles hablaron demais", "br")).toContain("hablaron");
    expect(foreignTokens("a juventud não volta", "br")).toContain("juventud");
  });

  it("título em CAIXA ALTA ainda é varrido — é onde o erro apareceu", () => {
    expect(foreignTokens("INFLUÊNCIA NÃO ABSUELVE", "br")).toContain("absuelve");
  });

  it("nome próprio no meio da frase não é vazamento (Schüll, María)", () => {
    expect(foreignTokens("a pesquisa de Natasha Schüll mostra o mesmo", "br")).toEqual([]);
    expect(foreignTokens("foi o que María contou depois", "br")).toEqual([]);
  });

  it("termo de internet da marca não é vazamento (doomscrolling, stories, feed)", () => {
    expect(foreignTokens("o doomscrolling rouba sua noite; saia do feed", "br")).toEqual([]);
    expect(foreignTokens("pare de scroll infinito nos stories", "br")).toEqual([]);
  });

  it("português legítimo que a v1 marcava: houve, saía, papéis, silenciosa", () => {
    expect(foreignTokens("houve um tempo em que os papéis bastavam", "br")).toEqual([]);
    expect(foreignTokens("ele saía cedo e construía a própria jaula", "br")).toEqual([]);
    expect(foreignTokens("a saída silenciosa é a mais cara", "br")).toEqual([]);
    expect(foreignTokens("redirecione a atenção antes que ela funcione contra você", "br")).toEqual([]);
  });

  it("a NARRAÇÃO do Reel entra na varredura — é o áudio que todo mundo ouve", () => {
    const hits = scanContentForeign(
      { postTitle: "Influência não absolve", narration: "o ambiente te influye, mas não absuelve" },
      "br",
    );
    expect(hits.map((h) => h.field)).toContain("narration");
  });
});
