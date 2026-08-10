import { describe, it, expect } from "vitest";
import { contentCacheKey } from "./content-cache";

// INVARIANTE — cache da copy é POR IDIOMA (≠ reel-shared, que é língua-independente).
// A copy é regerada por mercado (ES ≠ PT), então a chave PRECISA incluir o idioma,
// senão um idioma sobrescreveria a copy do outro.
describe("content-cache — chave por (tópico, dia, idioma)", () => {
  it("inclui o idioma → ES e PT têm entradas distintas", () => {
    const es = contentCacheKey("Nadie te debe nada", "2026-06-20", "es");
    const br = contentCacheKey("Nadie te debe nada", "2026-06-20", "br");
    expect(es).not.toBe(br);
    // A chave carrega tópico, dia, idioma e uma VERSÃO. A versão sobe toda vez que muda o que
    // o redator escreve (v5 em 09/08 = as regras de formato) — por isso ela NÃO é congelada
    // aqui: teste que copia valor mutável vira alarme falso na primeira mudança legítima, e
    // vermelho permanente ensina a ignorar o vermelho. Já custou 2 dias com o teto do X.
    expect(es).toMatch(/^Nadie te debe nada\|2026-06-20\|es\|v\d+$/);
    expect(br).toMatch(/^Nadie te debe nada\|2026-06-20\|br\|v\d+$/);
    // a versão é a MESMA para os dois idiomas — senão um subiria e o outro ficaria para trás
    expect(es.split("|").pop()).toBe(br.split("|").pop());
  });

  it("muda por dia → expiração natural diária", () => {
    expect(contentCacheKey("X", "2026-06-20", "es")).not.toBe(contentCacheKey("X", "2026-06-21", "es"));
  });
});
