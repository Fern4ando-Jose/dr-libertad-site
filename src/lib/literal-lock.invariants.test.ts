// Invariante da trava anti-amenização: em tema-convicção a diretiva entra e PROÍBE
// trocar a frase-verdade pela palavra de marca ("libertad"); em tema aberto não
// injeta nada (título livre). Foi o bug do ED 106. A função é pura; a lista de temas
// literais mora no flag `literal` do THEMES (fonte única).
import { describe, it, expect } from "vitest";
import { buildLiteralDirective, anchorForLang, anchorViolated, normalizeAnchorText } from "./literal-lock";

describe("buildLiteralDirective (trava anti-amenização)", () => {
  it("tema-convicção: injeta a trava, exige preservar a frase e proíbe trocar por libertad", () => {
    const d = buildLiteralDirective(true, "libertad");
    expect(d).toContain("INVIOLABLE");
    expect(d).toContain("PRESERVA");
    expect(d).toMatch(/NUNCA en el título/);
    expect(d.toLowerCase()).toContain("la frase completa");
    // o miolo: não sustituir a frase pela palavra de marca
    expect(d).toMatch(/sustituyas la frase por/);
  });

  it("tema aberto: não injeta nada (título pode ser criado livremente)", () => {
    expect(buildLiteralDirective(false, "libertad")).toBe("");
  });

  it("usa o termo de marca da conta (freedom) — ES 'libertad' e PT 'liberdade'", () => {
    expect(buildLiteralDirective(true, "liberdade")).toContain("liberdade");
    expect(buildLiteralDirective(true, "libertad")).toContain("libertad");
  });
});

// Âncora fixa POR IDIOMA (bug "cariño"→"cuidado": a trava só protegia a frase em ES
// e o marketBrief PT forçava tradução LIVRE da convicção — único ponto onde tradução
// acontecia). PT com verbatim do dono usa a frase dada; PT sem verbatim traduz FIEL.
describe("buildLiteralDirective — âncora por idioma (bug cariño→cuidado)", () => {
  const ANCHOR_PT = "O homem não precisa ser amado: precisa de carinho, respeito e admiração";

  it("PT com âncora canônica: injeta a frase PT verbatim e proíbe traduzir o tema ES", () => {
    const d = buildLiteralDirective(true, "liberdade", { lang: "br", anchorBr: ANCHOR_PT });
    expect(d).toContain(ANCHOR_PT);
    expect(d).toContain("NÃO traduza");
    expect(d).toContain("INVIOLÁVEL");
    expect(d.toLowerCase()).toContain("eufemismo");
    expect(d).toContain("TERMINA NO OSSO");
  });

  it("PT SEM âncora canônica: exige tradução FIEL palavra por palavra (sem eufemismo/antítese quebrada)", () => {
    const d = buildLiteralDirective(true, "liberdade", { lang: "br" });
    expect(d).toContain("PALAVRA POR PALAVRA");
    expect(d.toLowerCase()).toContain("eufemismo");
    expect(d).toContain("termina no osso");
  });

  it("ES fica com a diretiva clássica (frase do tema textual), mesmo com anchorBr presente", () => {
    const d = buildLiteralDirective(true, "libertad", { lang: "es", anchorBr: ANCHOR_PT });
    expect(d).toContain("INVIOLABLE");
    expect(d).not.toContain(ANCHOR_PT);
    // anula tb a regra geral "PROHIBIDO copiar el Tema" (senão o guardião bloquearia ES)
    expect(d).toContain("PROHIBIDO copiar el enunciado del Tema");
  });

  it("sem opts (chamada legada) = comportamento ES", () => {
    expect(buildLiteralDirective(true, "libertad")).toContain("INVIOLABLE");
  });
});

// Guardião do texto GERADO: os 2 vazamentos reais do feed têm de ser pegos.
describe("anchorViolated — guardião da convicção no texto gerado", () => {
  const ANCHOR = "A mulher escolhe com quem transar; o homem escolhe com quem casar";

  it("slide 1 com a âncora verbatim → íntegro (não viola)", () => {
    expect(anchorViolated([ANCHOR, "insight 2"], ANCHOR)).toBe(false);
  });

  it("normalização leve: caixa, aspas/travessão tipográficos e pontuação de borda não violam", () => {
    expect(anchorViolated(["«A mulher escolhe com quem transar; o homem escolhe com quem casar.»"], ANCHOR)).toBe(false);
    expect(anchorViolated(["O filtro não corrige a pele - corrige a sua expectativa"], "O filtro não corrige a pele — corrige a sua expectativa")).toBe(false);
  });

  it("EUFEMISMO (vazamento 27/06: transar→deita) → VIOLA", () => {
    expect(anchorViolated(["A mulher escolhe com quem deita; o homem escolhe com quem casa"], ANCHOR)).toBe(true);
  });

  it("fecho ESTUFADO (vazamento 01/07: explicar depois do osso) → VIOLA", () => {
    const a = "O filtro não corrige a pele — corrige a sua expectativa";
    // modo (B): contém a âncora mas CONTINUA depois dela — "termina no osso" quebrado
    expect(anchorViolated(["O filtro não corrige a pele — corrige a sua expectativa sobre o que ela deveria parecer"], a)).toBe(true);
    // reescrita/antítese quebrada também viola
    expect(anchorViolated(["O filtro corrige a sua expectativa sobre a pele"], a)).toBe(true);
    // prefixo leve ANTES da âncora é tolerado (a frase ainda termina no osso)
    expect(anchorViolated(["Verdade: o filtro não corrige a pele — corrige a sua expectativa"], a)).toBe(false);
  });

  it("sem âncora (PT sem verbatim do dono) → nunca viola (não há com o que comparar)", () => {
    expect(anchorViolated(["qualquer coisa"], null)).toBe(false);
  });

  it("acento IMPORTA (não normalizamos acentos — 'e' ≠ 'é' muda o sentido)", () => {
    expect(normalizeAnchorText("Ninguém te deve nada")).not.toBe(normalizeAnchorText("Ninguem te deve nada"));
  });
});

describe("anchorForLang — de onde vem a âncora de validação", () => {
  it("ES: o próprio tema é a âncora", () => {
    expect(anchorForLang("Nadie te debe nada", "es", "Ninguém te deve nada")).toBe("Nadie te debe nada");
  });
  it("PT com verbatim: usa o canônico do dono", () => {
    expect(anchorForLang("Nadie te debe nada", "br", "Ninguém te deve nada")).toBe("Ninguém te deve nada");
  });
  it("PT sem verbatim: null (sem check determinístico; vale a regra de tradução fiel)", () => {
    expect(anchorForLang("La comodidad te está matando lentamente", "br")).toBeNull();
  });
});
