import { describe, expect, it } from "vitest";
import {
  ORIGEM_VALUES,
  SURVEY_TARGET_PER_LANG,
  SURVEY_TEST_IDS,
  WAITLIST_SOURCES,
  normalizeOrigem,
  normalizeWaitlistSource,
} from "./survey-meta";

describe("survey-meta — contador, origem e waitlist (fase página do livro)", () => {
  it("ids de teste conhecidos (1–4) ficam FORA do contador público", () => {
    expect([...SURVEY_TEST_IDS]).toEqual([1, 2, 3, 4]);
  });

  it("marco por idioma = 400 (o contador é a barra de progresso do lançamento)", () => {
    expect(SURVEY_TARGET_PER_LANG).toBe(400);
  });

  it("origem: whitelist fechada — só 'livro' passa; resto vira null (nada de string livre no banco)", () => {
    expect(ORIGEM_VALUES).toContain("livro");
    expect(normalizeOrigem("livro")).toBe("livro");
    expect(normalizeOrigem("instagram")).toBeNull();
    expect(normalizeOrigem("")).toBeNull();
    expect(normalizeOrigem(null)).toBeNull();
    expect(normalizeOrigem(undefined)).toBeNull();
    expect(normalizeOrigem(42)).toBeNull();
    expect(normalizeOrigem("livro'; DROP TABLE--")).toBeNull();
  });

  it("waitlist source: só 'obrigado' e 'livro'; resto vira null (fluxo legado)", () => {
    expect([...WAITLIST_SOURCES]).toEqual(["obrigado", "livro"]);
    expect(normalizeWaitlistSource("obrigado")).toBe("obrigado");
    expect(normalizeWaitlistSource("livro")).toBe("livro");
    expect(normalizeWaitlistSource("bio")).toBeNull();
    expect(normalizeWaitlistSource(undefined)).toBeNull();
  });
});
