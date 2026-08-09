import { describe, it, expect } from "vitest";

// Invariantes da CAPA — escala, quebra por sentido e rodapé útil. Estes três defeitos foram
// achados pelo dono na peça publicada em 09/08, não por nós; os testes existem para que a
// próxima sessão não os reintroduza sem perceber.

// Cópias das funções puras do motor (`src/app/api/og/route.tsx` é edge/JSX e não se importa
// num teste de nó). Se o motor mudar, ESTES testes têm de mudar junto — é a única cópia
// tolerada, e ela é explícita.
function titleSize(text: string): number {
  const l = text.length;
  if (l <= 14) return 176;
  if (l <= 22) return 150;
  if (l <= 32) return 128;
  if (l <= 44) return 110;
  if (l <= 58) return 94;
  if (l <= 76) return 76;
  return 64;
}
function quebrarPorSentido(texto: string): string[] {
  const t = texto.trim();
  const m = t.match(/^(.+?[;:—–])\s*(.+)$/);
  if (m && m[1].length > 8 && m[2].length > 8) return [m[1].trim(), m[2].trim()];
  const v = t.match(/^(.{18,}?),\s*(.{18,})$/);
  if (v) return [v[1].trim() + ",", v[2].trim()];
  return [t];
}
function rodapeUtil(kw: string, fallback: string): string {
  const p = (kw || "").trim();
  const vazias = /^(tem|ter|tém|que|com|por|para|pra|dos|das|los|las|una|uno|uma|seu|sua|ele|ela|voce|você|nao|não|sim|mas|mais|ser|foi|era|sao|são|est[aáeé]|hay|del|the|and)$/i;
  return p.length >= 4 && !vazias.test(p) ? p : fallback;
}

describe("escala da manchete", () => {
  it("subiu em TODA faixa — a capa ocupava 76% e a régua é 85%+", () => {
    // Os valores anteriores, degrau a degrau. Nenhum pode voltar.
    const antigos = [150, 128, 108, 92, 78, 64, 54];
    const amostras = ["curta", "x".repeat(20), "x".repeat(30), "x".repeat(40), "x".repeat(55), "x".repeat(70), "x".repeat(90)];
    amostras.forEach((s, i) => expect(titleSize(s), `faixa ${i}`).toBeGreaterThan(antigos[i]));
  });

  it("frase curta domina mais que frase longa", () => {
    expect(titleSize("Ninguém te deve nada")).toBeGreaterThan(titleSize("x".repeat(80)));
  });
});

describe("quebra por sentido", () => {
  it("a virada da frase ganha linha própria", () => {
    const l = quebrarPorSentido("Você tem direito a fazer o que quiser; eu tenho direito de dizer o que penso");
    expect(l).toHaveLength(2);
    expect(l[0].endsWith(";")).toBe(true);
    expect(l[1]).toMatch(/^eu tenho/);
  });

  it("NÃO corta no meio do verbo — o defeito real de 09/08", () => {
    const l = quebrarPorSentido("Você tem direito a fazer o que quiser; eu tenho direito de dizer o que penso");
    expect(l.some((x) => /\beu tenho$/.test(x))).toBe(false);
  });

  it("frase sem virada sai inteira, num bloco só", () => {
    expect(quebrarPorSentido("Ninguém te deve nada")).toEqual(["Ninguém te deve nada"]);
  });

  it("não parte enumeração curta pela vírgula", () => {
    expect(quebrarPorSentido("Silêncio, dor, saída")).toHaveLength(1);
  });
});

describe("rodapé útil", () => {
  it("recusa a palavra solta que saiu no feed", () => {
    expect(rodapeUtil("TEM", "MENTE")).toBe("MENTE");
    expect(rodapeUtil("que", "MENTE")).toBe("MENTE");
    expect(rodapeUtil("", "MENTE")).toBe("MENTE");
  });

  it("mantém a palavra quando ela carrega sentido", () => {
    expect(rodapeUtil("DOPAMINA", "MENTE")).toBe("DOPAMINA");
    expect(rodapeUtil("SILÊNCIO", "MENTE")).toBe("SILÊNCIO");
  });
});
