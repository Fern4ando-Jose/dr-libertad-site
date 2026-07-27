// Trava do CIERRE FALADO: a voz tem de pedir a MESMA coisa que a TELA está pedindo.
//
// Defeito que originou (2026-07-26, achado do head-de-crescimento e confirmado em
// produção — ENGAGEMENT_FUNNEL_ENABLED estava ligado): com o funil no ar, o end-card
// mostrava "Comenta LIBERTAD — e mandamos no seu Direct" enquanto a VOZ dizia
// "me siga". Dois pedidos concorrentes no exato segundo em que a pessoa decide;
// quem recebe dois pedidos não faz nenhum. E "seguir" é a ação mais cara de quem
// te conhece há 15 segundos, contra um comentário barato que ainda vira lead.
//
// Este módulo replica a REGRA de escolha do cierre (a mesma de publish/route.ts).
// Se a regra mudar lá, estes testes têm de acompanhar — é a trava, não o enfeite.
import { describe, it, expect } from "vitest";

type Funil = { keyword: string } | undefined;

// Espelha o `followLine` de src/app/api/publish/route.ts.
export function cierreFalado(lang: string, funnel: Funil): string {
  return funnel
    ? (lang === "pt"
        ? `Comente ${funnel.keyword} aqui embaixo e eu mando no seu Direct.`
        : `Comenta ${funnel.keyword} aquí abajo y te lo envío al Direct.`)
    : (lang === "pt"
        ? "Me siga se você prefere a verdade incômoda ao aplauso."
        : "Sígueme si prefieres la verdad incómoda al aplauso.");
}

const FUNIL_PT: Funil = { keyword: "LIBERDADE" };
const FUNIL_ES: Funil = { keyword: "LIBERTAD" };

describe("cierre falado — a voz pede o MESMO que a tela", () => {
  it("com funil LIGADO, a voz pede o COMENTÁRIO (não 'me siga')", () => {
    for (const [lang, f] of [["pt", FUNIL_PT], ["es", FUNIL_ES]] as const) {
      const c = cierreFalado(lang, f);
      expect(c.toLowerCase()).not.toContain("me siga");
      expect(c.toLowerCase()).not.toContain("sígueme");
      expect(c).toContain(f!.keyword); // a MESMA palavra que o end-card mostra
    }
  });

  it("a palavra-chave falada é EXATAMENTE a do end-card (senão o funil não fecha)", () => {
    // Se a voz disser uma palavra e a tela outra, o robô do Direct nunca dispara.
    expect(cierreFalado("es", { keyword: "LIBERTAD" })).toContain("LIBERTAD");
    expect(cierreFalado("pt", { keyword: "LIBERDADE" })).toContain("LIBERDADE");
    expect(cierreFalado("es", { keyword: "DOPAMINA" })).toContain("DOPAMINA");
  });

  it("SEM funil, mantém o fecho de seguir (é o que a tela mostra ali)", () => {
    expect(cierreFalado("pt", undefined).toLowerCase()).toContain("me siga");
    expect(cierreFalado("es", undefined).toLowerCase()).toContain("sígueme");
  });

  it("cada idioma fala a SUA língua — nunca vaza o outro (conta ES ≠ conta PT)", () => {
    const pt = cierreFalado("pt", FUNIL_PT);
    const es = cierreFalado("es", FUNIL_ES);
    expect(pt).toContain("Comente");     // PT
    expect(pt).not.toContain("Comenta ");// forma ES
    expect(es).toContain("Comenta");     // ES
    expect(es).not.toContain("Comente"); // forma PT
    expect(pt).not.toBe(es);
  });

  it("o cierre é UMA frase só — dois pedidos no mesmo fôlego é o defeito que matamos", () => {
    for (const c of [cierreFalado("pt", FUNIL_PT), cierreFalado("es", FUNIL_ES), cierreFalado("pt", undefined)]) {
      const finais = (c.match(/[.!?]/g) || []).length;
      expect(finais).toBe(1);
    }
  });
});
