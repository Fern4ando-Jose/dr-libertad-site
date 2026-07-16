// Trava a separação entre os DOIS acentos de video/Reel.tsx (achado do
// designer-criativos, 2026-07-16): o WASH sobre footage é mono/travado (nunca
// varia por pilar — trava do dono 2026-07-14); o acento de UI PLANA (régua/
// handle/número/palavra-destaque) varia nos 6 pilares da marca (mesmo mapa
// `ACCENTS` de src/lib/illustration.ts). Antes das duas variáveis, ambas vinham
// da MESMA `accent` — este teste existe pra nunca voltar a fundir as duas.
import { describe, it, expect } from "vitest";
import { resolveAccents, CAT_ACCENT } from "./Reel";

const PILLARS = ["freedom", "dopamine", "anxiety", "network", "self", "mind"] as const;

const EXPECTED_UI: Record<(typeof PILLARS)[number], string> = {
  freedom: "#A45A5A",
  dopamine: "#BE7A2A",
  anxiety: "#3D6360",
  network: "#3F5E78",
  self: "#835A6E",
  mind: "#5B6B3C",
};

describe("resolveAccents — wash do footage NUNCA varia por pilar", () => {
  it("washAccent é sempre #A45A5A nos 6 pilares", () => {
    for (const p of PILLARS) {
      expect(resolveAccents(p).washAccent).toBe("#A45A5A");
    }
  });

  it("washAccent é #A45A5A também sem pilar / pilar desconhecido (fail-safe)", () => {
    expect(resolveAccents(undefined).washAccent).toBe("#A45A5A");
    expect(resolveAccents("pilar-que-nao-existe").washAccent).toBe("#A45A5A");
  });
});

describe("resolveAccents — acento de UI PLANA varia nos 6 pilares da marca", () => {
  it("uiAccent bate com o hex esperado de cada um dos 6 pilares", () => {
    for (const p of PILLARS) {
      expect(resolveAccents(p).uiAccent).toBe(EXPECTED_UI[p]);
    }
  });

  it("os 6 valores de uiAccent são todos distintos entre si (a variação existe de fato)", () => {
    const values = PILLARS.map((p) => resolveAccents(p).uiAccent);
    expect(new Set(values).size).toBe(PILLARS.length);
  });

  it("sem pilar / pilar desconhecido → cai no default 'freedom' (fail-safe)", () => {
    expect(resolveAccents(undefined).uiAccent).toBe(EXPECTED_UI.freedom);
    expect(resolveAccents("pilar-que-nao-existe").uiAccent).toBe(EXPECTED_UI.freedom);
  });

  it("CAT_ACCENT não tem nenhum valor repetido (trava contra o bug do rollback 2026-07-15, que fundiu tudo em #A45A5A)", () => {
    const values = Object.values(CAT_ACCENT);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("resolveAccents — wash e UI são independentes (não é mais a mesma variável)", () => {
  it("em pilares != 'freedom', washAccent e uiAccent DIVERGEM (a prova de que se separaram)", () => {
    for (const p of PILLARS.filter((x) => x !== "freedom")) {
      const { washAccent, uiAccent } = resolveAccents(p);
      expect(uiAccent).not.toBe(washAccent);
    }
  });
});
