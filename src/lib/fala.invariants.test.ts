import { describe, it, expect } from "vitest";
import { paraFalar, porExtenso } from "./fala";
import { blocosFalados } from "./roteiro-falado";

// O caso que criou este módulo, nas palavras do dono (11/08/2026):
// «a palavra (20 min) corta a palavra e fica estranho, não existe 20 min falado».
// O bloco ia CRU ao motor de voz. Tela e boca são textos diferentes.

describe("o caso que o dono ouviu", () => {
  it("«scrolla 20 min» é FALADO como «vinte minutos»", () => {
    const dito = paraFalar("Você abre Netflix, scrolla 20 min e fecha sem ver nada.", "br");
    expect(dito).toContain("vinte minutos");
    expect(dito).not.toMatch(/\bmin\b/);
    expect(dito).not.toMatch(/\b20\b/);
  });

  it("o mesmo em espanhol", () => {
    expect(paraFalar("Abres Netflix, scrolleas 20 min y cierras.", "es")).toContain("veinte minutos");
  });

  it("o texto da TELA não é tocado — quem passa por aqui é só a voz", () => {
    // `blocosFalados` é o roteiro falado; o texto da tela vem de props.title/props.slides,
    // que não passam por esta função. Este teste guarda a fronteira.
    const falado = blocosFalados("Título", ["Você perde 20 min por dia"], "br", "");
    expect(falado.join(" ")).toContain("vinte minutos");
    expect(falado.join(" ")).not.toContain("20 min");
  });
});

describe("números por extenso", () => {
  it("nas duas línguas, na faixa que a peça usa", () => {
    expect(porExtenso(0, "br")).toBe("zero");
    expect(porExtenso(3, "br")).toBe("três");
    expect(porExtenso(15, "br")).toBe("quinze");
    expect(porExtenso(20, "br")).toBe("vinte");
    expect(porExtenso(21, "br")).toBe("vinte e um");
    expect(porExtenso(100, "br")).toBe("cem");
    expect(porExtenso(365, "br")).toBe("trezentos e sessenta e cinco");
    expect(porExtenso(21, "es")).toBe("veintiuno");
    expect(porExtenso(31, "es")).toBe("treinta y uno");
    expect(porExtenso(100, "es")).toBe("cien");
  });

  it("ANO fica como está — «2026» não vira frase dentro da frase", () => {
    expect(porExtenso(2026, "br")).toBe("2026");
    expect(paraFalar("A régua de 2026 é outra.", "br")).toContain("2026");
  });
});

describe("o que NÃO pode ser mexido", () => {
  it("«min» dentro de outra palavra não vira «minutos»", () => {
    expect(paraFalar("O mínimo da administração.", "br")).toBe("O mínimo da administração.");
  });

  it("marca não é abreviação — Netflix e TikTok saem inteiros", () => {
    const t = paraFalar("Netflix e TikTok tomam sua noite.", "br");
    expect(t).toContain("Netflix");
    expect(t).toContain("TikTok");
  });

  it("texto vazio volta como veio — não se inventa fala", () => {
    expect(paraFalar("", "br")).toBe("");
    expect(paraFalar("   ", "br")).toBe("   ");
  });

  it("singular segue o número: 1 minuto, 2 minutos", () => {
    expect(paraFalar("Só 1 min por dia.", "br")).toContain("um minuto");
    expect(paraFalar("São 2 min por dia.", "br")).toContain("dois minutos");
  });

  it("percentual vira «por cento»", () => {
    expect(paraFalar("Só 3% assistem.", "br")).toContain("três por cento");
    expect(paraFalar("Solo 3% miran.", "es")).toContain("tres por ciento");
  });
});
