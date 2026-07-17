import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { clipMatchesTheme, filterClipsByTheme, type ThemeWho } from "./footage-subject";
import { FOOTAGE_LIBRARY, type FootageClip } from "./footage-library";
import { pickFromWhitelist } from "./reel-shared";

// ─────────────────────────────────────────────────────────────────────────────
// INVARIANTE DE CURADORIA: **o sujeito da imagem tem que ser o sujeito da frase**.
//
// Defeito de origem (ed. 164, @dr.liberdade.br, 2026-07-17): o tema
// "La conversación entre hombres que está en extinción" (pilar `self`, copy só sobre
// HOMENS) saiu com um Reel cujo footage mostrava uma MULHER sozinha à janela. Raiz:
// selectFootage recebia SÓ a `cat` do pilar e sorteava da whitelist inteira — o pilar
// `self` tem clipes de mulher → o tema masculino tinha ~84% de chance de mostrar uma.
//
// Estes testes barram a volta da regressão nos DOIS sentidos:
//  (a) tema com sujeito declarado NUNCA recebe o gênero errado — em NENHUM seed;
//  (b) tema SEM sujeito declarado recebe EXATAMENTE o que recebia antes do filtro
//      (fail-open — o filtro não pode mexer nos ~110 temas não classificados).
// ─────────────────────────────────────────────────────────────────────────────

const NUM_CLIPS = 5; // 5 cenas do Reel (capa + 3 insights + CTA)
const CATS = Object.keys(FOOTAGE_LIBRARY);
const SEEDS = Array.from({ length: 400 }, (_, i) => i * 7919 + 13); // centenas de seeds

const whoOf = (cat: string, url: string): FootageClip["who"] =>
  FOOTAGE_LIBRARY[cat].find((c) => c.url === url)?.who;

describe("clipMatchesTheme — semântica do casamento sujeito×clipe", () => {
  it("tema de HOMEM aceita man/none/group e REJEITA woman/couple", () => {
    expect(clipMatchesTheme("man", "man")).toBe(true);
    expect(clipMatchesTheme("none", "man")).toBe(true);
    expect(clipMatchesTheme("group", "man")).toBe(true);
    expect(clipMatchesTheme("woman", "man")).toBe(false);
    expect(clipMatchesTheme("couple", "man")).toBe(false);
  });

  it("tema de MULHER aceita woman/none/group e REJEITA man/couple", () => {
    expect(clipMatchesTheme("woman", "woman")).toBe(true);
    expect(clipMatchesTheme("none", "woman")).toBe(true);
    expect(clipMatchesTheme("group", "woman")).toBe(true);
    expect(clipMatchesTheme("man", "woman")).toBe(false);
    expect(clipMatchesTheme("couple", "woman")).toBe(false);
  });

  it("tema dos DOIS aceita couple/none/group e REJEITA man ou woman sozinhos", () => {
    expect(clipMatchesTheme("couple", "both")).toBe(true);
    expect(clipMatchesTheme("none", "both")).toBe(true);
    expect(clipMatchesTheme("group", "both")).toBe(true);
    expect(clipMatchesTheme("man", "both")).toBe(false);
    expect(clipMatchesTheme("woman", "both")).toBe(false);
  });

  it("FAIL-OPEN: tema ausente/'any', clipe sem `who` ou valor desconhecido aceitam tudo", () => {
    for (const clipWho of ["man", "woman", "couple", "group", "none", undefined] as const) {
      expect(clipMatchesTheme(clipWho, undefined)).toBe(true); // tema não classificado
      expect(clipMatchesTheme(clipWho, "any")).toBe(true);     // tanto faz explícito
    }
    expect(clipMatchesTheme(undefined, "man")).toBe(true);     // clipe não classificado
    expect(clipMatchesTheme("woman", "alien" as ThemeWho)).toBe(true); // valor futuro/errado
  });
});

describe("filterClipsByTheme — filtra, e não completa com incompatível", () => {
  const clips = [
    { url: "a", who: "man" as const },
    { url: "b", who: "woman" as const },
    { url: "c", who: "none" as const },
    { url: "d" }, // sem `who` → fail-open
  ];

  it("tema sem `who` devolve a lista INTEIRA (mesma ordem, mesmos itens)", () => {
    expect(filterClipsByTheme(clips, undefined)).toEqual(clips);
    expect(filterClipsByTheme(clips, "any")).toEqual(clips);
  });

  it("tema de homem tira a mulher e mantém neutro/sem-who", () => {
    expect(filterClipsByTheme(clips, "man").map((c) => c.url)).toEqual(["a", "c", "d"]);
  });

  it("sobrou menos que o pedido → devolve o que sobrou, SEM repor com gênero errado", () => {
    const out = filterClipsByTheme([{ url: "a", who: "woman" as const }, { url: "b", who: "couple" as const }], "man");
    expect(out).toEqual([]); // melhor nada (→ fallback ao vivo) que a mulher no tema de homem
  });

  it("entrada inválida não derruba o filtro", () => {
    expect(filterClipsByTheme(null, "man")).toEqual([]);
    expect(filterClipsByTheme(undefined, "man")).toEqual([]);
  });
});

// ── A trava de verdade: o SORTEIO, varrido seed a seed ───────────────────────
describe("sorteio da whitelist NUNCA entrega o gênero errado (centenas de seeds)", () => {
  it("tema 'man' não recebe clipe 'woman' nem 'couple' em NENHUM pilar/seed", () => {
    const violations: string[] = [];
    for (const cat of CATS) {
      for (const seed of SEEDS) {
        for (const url of pickFromWhitelist(cat, seed, NUM_CLIPS, new Set(), "man")) {
          const who = whoOf(cat, url);
          if (who === "woman" || who === "couple") violations.push(`${cat}/seed=${seed}/${who}: ${url}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("tema 'woman' não recebe clipe 'man' nem 'couple' em NENHUM pilar/seed", () => {
    const violations: string[] = [];
    for (const cat of CATS) {
      for (const seed of SEEDS) {
        for (const url of pickFromWhitelist(cat, seed, NUM_CLIPS, new Set(), "woman")) {
          const who = whoOf(cat, url);
          if (who === "man" || who === "couple") violations.push(`${cat}/seed=${seed}/${who}: ${url}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("tema 'both' não recebe homem nem mulher SOZINHOS em NENHUM pilar/seed", () => {
    const violations: string[] = [];
    for (const cat of CATS) {
      for (const seed of SEEDS) {
        for (const url of pickFromWhitelist(cat, seed, NUM_CLIPS, new Set(), "both")) {
          const who = whoOf(cat, url);
          if (who === "man" || who === "woman") violations.push(`${cat}/seed=${seed}/${who}: ${url}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  // O `avoid` (clipes usados nos últimos 14 dias) é o caminho que mais aperta a lista —
  // é nele que a passada de "relaxamento" repõe clipe do fundo da whitelist. Ela NÃO
  // pode repor o gênero errado (foi por isso que o filtro mora ANTES do sorteio).
  it("mesmo com o 'avoid' esvaziando o pilar, o relaxamento não repõe gênero errado", () => {
    for (const cat of CATS) {
      const avoid = new Set(FOOTAGE_LIBRARY[cat].map((c) => c.url)); // TUDO usado recentemente
      for (const seed of SEEDS.slice(0, 50)) {
        for (const url of pickFromWhitelist(cat, seed, NUM_CLIPS, avoid, "man")) {
          expect(whoOf(cat, url)).not.toBe("woman");
          expect(whoOf(cat, url)).not.toBe("couple");
        }
      }
    }
  });
});

// ── FAIL-OPEN provado: tema não classificado escolhe EXATAMENTE como antes ───
describe("tema SEM `who` → seleção IDÊNTICA à de hoje (fail-open)", () => {
  // Réplica do algoritmo ANTERIOR ao filtro (whitelist inteira, mesmo shuffle):
  // se o filtro vazasse pra um tema não classificado, estes dois divergiriam.
  const beforeFilter = (cat: string, seed: number) => pickFromWhitelist(cat, seed, NUM_CLIPS, new Set(), "any");

  it("undefined e 'any' devolvem o mesmo conjunto, em todo pilar e seed", () => {
    for (const cat of CATS) {
      for (const seed of SEEDS) {
        expect(pickFromWhitelist(cat, seed, NUM_CLIPS, new Set(), undefined)).toEqual(beforeFilter(cat, seed));
      }
    }
  });

  it("tema sem `who` continua sorteando da whitelist INTEIRA (nada foi excluído)", () => {
    for (const cat of CATS) {
      const seen = new Set<string>();
      for (const seed of SEEDS) for (const u of pickFromWhitelist(cat, seed, NUM_CLIPS, new Set(), undefined)) seen.add(u);
      // com 400 seeds, todo clipe do pilar aparece pelo menos uma vez
      expect(seen.size).toBe(FOOTAGE_LIBRARY[cat].length);
    }
  });
});

// ── Sanidade da biblioteca: o filtro não pode SECAR nenhum pilar usado ───────
describe("a whitelist filtrada ainda sustenta um Reel (>= 5 clipes distintos)", () => {
  // As combinações (cat × who) saem do PRÓPRIO route.ts, lido como TEXTO. Uma lista
  // escrita à mão aqui dessincronizaria em silêncio do THEMES (passo manual = defeito):
  // bastaria alguém marcar um tema novo num pilar sem acervo e o invariante não veria.
  // THEMES não é exportável (vive no módulo edge da rota, que arrasta db/env), então a
  // fonte única é o texto. Regex casa a linha inteira do tema — `cat` e `who` em
  // qualquer ordem —, por isso o teste QUEBRA se a forma do THEMES mudar, em vez de
  // silenciosamente parar de testar (0 combinações = falha explícita abaixo).
  const ROUTE = readFileSync(resolve(__dirname, "../app/api/publish/route.ts"), "utf8");
  const IN_USE: Array<[string, ThemeWho]> = [
    ...new Set(
      [...ROUTE.matchAll(/^\s*\{ topic: .*$/gm)]
        .map(([line]) => {
          const cat = line.match(/\bcat: "(\w+)"/)?.[1];
          const who = line.match(/\bwho: "(\w+)"/)?.[1] as ThemeWho | undefined;
          return cat && who ? `${cat}|${who}` : null;
        })
        .filter((x): x is string => !!x),
    ),
  ].map((k) => k.split("|") as [string, ThemeWho]);

  it("achou de fato as combinações do route.ts (senão o resto não prova nada)", () => {
    expect(IN_USE.length).toBeGreaterThan(0);
    expect(IN_USE.every(([cat]) => cat in FOOTAGE_LIBRARY)).toBe(true); // tema num pilar inexistente
  });

  it.each(IN_USE)("pilar %s filtrado por '%s' entrega >= 5 clipes distintos", (cat, who) => {
    const left = filterClipsByTheme(FOOTAGE_LIBRARY[cat], who);
    expect(left.length).toBeGreaterThanOrEqual(NUM_CLIPS);
    const picked = pickFromWhitelist(cat, 12345, NUM_CLIPS, new Set(), who);
    expect(picked).toHaveLength(NUM_CLIPS);
    expect(new Set(picked).size).toBe(NUM_CLIPS); // 5 clipes DISTINTOS — nada de fundo repetido
  });

  it("o pilar `self` (o do defeito) sobrevive ao filtro 'man' em qualquer seed", () => {
    for (const seed of SEEDS) {
      const picked = pickFromWhitelist("self", seed, NUM_CLIPS, new Set(), "man");
      expect(new Set(picked).size).toBe(NUM_CLIPS);
    }
  });
});

// ── O caso concreto da ed. 164 ───────────────────────────────────────────────
describe("ed. 164 — 'La conversación entre hombres' (cat self, who man)", () => {
  // Os clipes de MULHER do pilar `self` — os que apareceram/podiam aparecer no Reel.
  const MULHERES_DO_SELF = FOOTAGE_LIBRARY.self.filter((c) => c.who === "woman");

  it("o pilar `self` de fato tem clipes de mulher (senão este teste não prova nada)", () => {
    expect(MULHERES_DO_SELF.length).toBeGreaterThanOrEqual(3);
    // os 3 explícitos que motivaram o conserto continuam marcados
    const whys = MULHERES_DO_SELF.map((c) => c.why ?? "");
    expect(whys.filter((w) => w.startsWith("mulher")).length).toBeGreaterThanOrEqual(3);
  });

  it("NENHUM seed entrega qualquer clipe de mulher do `self` ao tema masculino", () => {
    const proibidos = new Set(MULHERES_DO_SELF.map((c) => c.url));
    for (const seed of SEEDS) {
      const picked = pickFromWhitelist("self", seed, NUM_CLIPS, new Set(), "man");
      expect(picked.filter((u) => proibidos.has(u))).toEqual([]);
    }
  });

  it("ANTES do conserto o defeito acontecia: sem `who`, a mulher entra no sorteio", () => {
    const proibidos = new Set(MULHERES_DO_SELF.map((c) => c.url));
    const comMulher = SEEDS.filter((seed) =>
      pickFromWhitelist("self", seed, NUM_CLIPS, new Set(), undefined).some((u) => proibidos.has(u)),
    );
    // prova que o filtro é o que segura — e que o fail-open segue permissivo
    expect(comMulher.length).toBeGreaterThan(SEEDS.length / 2);
  });
});
