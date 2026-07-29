import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { filterClipsByTheme, type ThemeWho } from "./footage-subject";
import { FOOTAGE_LIBRARY } from "./footage-library";
import { pickFromWhitelist } from "./reel-shared";

// ─────────────────────────────────────────────────────────────────────────────
// INVARIANTE: **quando o pilar satura, a anti-repetição RELAXA por RECÊNCIA (LRU),
// nunca por sorteio cego.**
//
// Defeito de origem (@dr.liberdade.br, 2026-07-17): dois Reels SEGUIDOS saíram com a
// MESMA CAPA (mesmo clipe, textos diferentes) — o dono viu no grid. Raiz provada
// contra o banco de produção: o `avoid` (clipes usados nos últimos 14d) continha os
// 12 clipes do pilar `self` desde 16/07 13:44 → o 1º estágio de `pickFromWhitelist`
// dava lista VAZIA e a passada de "relaxamento" repunha a whitelist INTEIRA com
// `seededShuffle(seed+1)` — sorteio CEGO. A anti-repetição se DESLIGAVA sozinha, em
// silêncio, justo quando era mais necessária: dois temas do mesmo pilar podiam cair no
// mesmo 1º clipe (= a capa).
//
// Hoje o relaxamento ordena por ÚLTIMO USO (mais antigo primeiro): o clipe que ACABOU
// de sair é o ÚLTIMO a voltar. Mesma ideia da janela LRU do shuffle-bag dos TEMAS
// (`selectThemeIndex`, src/lib/rotation.ts).
//
// ⚠️ O QUE ESTES TESTES MODELAM — o cenário SEQUENCIAL, que é o do defeito ("dois Reels
// SEGUIDOS"): o Reel A publica e GRAVA seus clipes na `reel_shared_cache`; o Reel B roda
// depois e lê esse registro. É aí que o LRU age: os clipes de A afundam pro fim da fila.
// (Dois temas que lessem o banco no MESMO instante — antes de qualquer writeback — veem o
// MESMO mapa; nenhuma função determinística consegue, aí, dar capas distintas para seeds
// arbitrários. Ver `describe` final: essa borda está documentada, não escondida.)
// ─────────────────────────────────────────────────────────────────────────────

const NUM_CLIPS = 5; // 5 cenas do Reel (capa + 3 insights + CTA)
const CATS = Object.keys(FOOTAGE_LIBRARY);
const SEEDS = Array.from({ length: 400 }, (_, i) => i * 7919 + 13); // centenas de seeds

const T0 = Date.parse("2026-07-03T12:00:00.000Z"); // usos "antigos" (dentro dos 14d)
const HORA = 3_600_000;
const AGORA = Date.parse("2026-07-17T13:44:00.000Z"); // o horário do defeito real

const urlsDo = (cat: string) => FOOTAGE_LIBRARY[cat].map((c) => c.url);
const candidatos = (cat: string, who?: ThemeWho) => filterClipsByTheme(FOOTAGE_LIBRARY[cat], who).map((c) => c.url);

// Pilar SATURADO: TODOS os clipes usados nos últimos 14d, com timestamps DIFERENTES
// (é o estado real do `self` desde 16/07 — 270 URLs no avoid, os 12 do pilar entre elas).
function mapaSaturado(cat: string): Map<string, number> {
  return new Map(urlsDo(cat).map((u, i) => [u, T0 + i * HORA]));
}

// O Reel A publicou: seus clipes passam a ser os MAIS RECENTES (é o writeback que a
// `reel_shared_cache` faz — mesma linha (tópico,dia), mesmo `created_at` p/ ES e PT).
function apósPublicar(mapa: ReadonlyMap<string, number>, clips: string[], em = AGORA): Map<string, number> {
  const novo = new Map(mapa);
  for (const u of clips) novo.set(u, em);
  return novo;
}

// Pares (temaA, temaB) = seeds DISTINTOS — dois temas diferentes do mesmo pilar.
const PARES = SEEDS.slice(0, 200).map((s, i) => [s, SEEDS[SEEDS.length - 1 - i]] as const);

// ── 1. O CASO DO DONO: dois Reels seguidos, pilar saturado, capas DIFERENTES ──
describe("caso do dono — pilar saturado, dois Reels seguidos NÃO repetem a capa", () => {
  it("`self` (o pilar do defeito): a capa do 2º Reel nunca é a do 1º, em centenas de pares de seeds", () => {
    const colisões: string[] = [];
    for (const [seedA, seedB] of PARES) {
      const m0 = mapaSaturado("self");
      const a = pickFromWhitelist("self", seedA, NUM_CLIPS, m0);
      const b = pickFromWhitelist("self", seedB, NUM_CLIPS, apósPublicar(m0, a));
      if (b[0] === a[0]) colisões.push(`seeds ${seedA}→${seedB}: capa ${a[0]}`);
    }
    expect(colisões).toEqual([]);
  });

  it("é o RELAXAMENTO que conserta: o algoritmo ANTIGO (sorteio cego) colide de verdade", () => {
    // Alimentar `avoid` com um Set = exatamente o algoritmo de ANTES (sem recência, tudo
    // empata → ordem = seededShuffle(seed+1) = o código antigo, linha por linha).
    const avoidCego = new Set(urlsDo("self"));
    const colisões = PARES.filter(([seedA, seedB]) => {
      const a = pickFromWhitelist("self", seedA, NUM_CLIPS, avoidCego);
      const b = pickFromWhitelist("self", seedB, NUM_CLIPS, avoidCego);
      return b[0] === a[0];
    });
    // ~1/12 dos pares (12 clipes no pilar) — foi o que mordeu o dono. Se este teste
    // parar de colidir, o "conserto" abaixo não estaria provando nada.
    expect(colisões.length).toBeGreaterThan(0);
  });

  it("vale em TODO pilar com acervo > 5 clipes (não só no `self`)", () => {
    const violações: string[] = [];
    for (const cat of CATS) {
      if (urlsDo(cat).length <= NUM_CLIPS) continue; // acervo == 5: repetir é aritmética, não bug
      for (const [seedA, seedB] of PARES.slice(0, 50)) {
        const m0 = mapaSaturado(cat);
        const a = pickFromWhitelist(cat, seedA, NUM_CLIPS, m0);
        const b = pickFromWhitelist(cat, seedB, NUM_CLIPS, apósPublicar(m0, a));
        if (b[0] === a[0]) violações.push(`${cat} ${seedA}→${seedB}: ${a[0]}`);
      }
    }
    expect(violações).toEqual([]);
  });

  it("com folga de acervo (> 2× as cenas), o 2º Reel não reusa NENHUM clipe do 1º", () => {
    for (const cat of CATS) {
      if (urlsDo(cat).length < NUM_CLIPS * 2 + 1) continue; // precisa de 5 mais antigos sobrando
      for (const [seedA, seedB] of PARES.slice(0, 50)) {
        const m0 = mapaSaturado(cat);
        const a = pickFromWhitelist(cat, seedA, NUM_CLIPS, m0);
        const b = pickFromWhitelist(cat, seedB, NUM_CLIPS, apósPublicar(m0, a));
        expect(b.filter((u) => a.includes(u))).toEqual([]);
      }
    }
  });
});

// ── 2. O mais recente é o último a voltar ────────────────────────────────────
describe("pilar saturado — o clipe usado MAIS RECENTEMENTE nunca é o 1º escolhido", () => {
  it.each(CATS)("pilar %s: a capa nunca é o clipe mais recente, em nenhum seed", (cat) => {
    const mapa = mapaSaturado(cat);
    const maisRecente = [...mapa.entries()].sort((x, y) => y[1] - x[1])[0][0];
    for (const seed of SEEDS) {
      expect(pickFromWhitelist(cat, seed, NUM_CLIPS, mapa)[0]).not.toBe(maisRecente);
    }
  });

  it("o clipe mais recente só volta quando NÃO há alternativa (é o último da fila)", () => {
    // Com numClips = acervo inteiro, todo mundo entra — mas o mais recente entra por ÚLTIMO.
    const mapa = mapaSaturado("self");
    const maisRecente = [...mapa.entries()].sort((x, y) => y[1] - x[1])[0][0];
    const n = urlsDo("self").length;
    for (const seed of SEEDS.slice(0, 50)) {
      expect(pickFromWhitelist("self", seed, n, mapa)[n - 1]).toBe(maisRecente);
    }
  });

  it("a ordem do relaxamento é a LRU pura: mais antigo → mais recente", () => {
    const mapa = mapaSaturado("mind");
    const esperado = [...mapa.entries()].sort((x, y) => x[1] - y[1]).map(([u]) => u);
    for (const seed of SEEDS.slice(0, 20)) {
      expect(pickFromWhitelist("mind", seed, esperado.length, mapa)).toEqual(esperado);
    }
  });
});

// ── 3. NÃO-REGRESSÃO: com folga, tudo igual a hoje ───────────────────────────
describe("pool com folga → seleção IDÊNTICA à de hoje (a recência não vaza)", () => {
  it("mapa de recência e Set das MESMAS urls dão o mesmo resultado (nada saturado)", () => {
    // `avoid` pequeno (2 clipes) → o 1º estágio sustenta as 5 cenas → o relaxamento nem
    // roda → a recência é IRRELEVANTE. Prova de que só a passada de socorro mudou.
    for (const cat of CATS) {
      const doisUsados = urlsDo(cat).slice(0, 2);
      const comoSet = new Set(doisUsados);
      const comoMapa = new Map(doisUsados.map((u, i) => [u, T0 + i * HORA]));
      for (const seed of SEEDS) {
        expect(pickFromWhitelist(cat, seed, NUM_CLIPS, comoMapa)).toEqual(
          pickFromWhitelist(cat, seed, NUM_CLIPS, comoSet),
        );
      }
    }
  });

  it("FAIL-OPEN (erro de banco → mapa vazio) = comportamento de sempre", () => {
    for (const cat of CATS) {
      for (const seed of SEEDS) {
        expect(pickFromWhitelist(cat, seed, NUM_CLIPS, new Map())).toEqual(
          pickFromWhitelist(cat, seed, NUM_CLIPS, new Set()),
        );
        expect(pickFromWhitelist(cat, seed, NUM_CLIPS)).toEqual(pickFromWhitelist(cat, seed, NUM_CLIPS, new Set()));
      }
    }
  });

  it("saturado com Set (chamador legado) = sorteio de antes, sem quebrar", () => {
    for (const cat of CATS) {
      const avoid = new Set(urlsDo(cat));
      for (const seed of SEEDS.slice(0, 50)) {
        const picked = pickFromWhitelist(cat, seed, NUM_CLIPS, avoid);
        expect(picked).toHaveLength(NUM_CLIPS);
        expect(new Set(picked).size).toBe(NUM_CLIPS); // 5 clipes DISTINTOS dentro do Reel
      }
    }
  });
});

// ── 4. ES = PT: o determinismo por (tópico, dia) é SAGRADO ───────────────────
describe("ES e PT (mesmo tópico+dia → mesmo seed) geram o MESMO vídeo", () => {
  it("mesmo seed + mesmo mapa → MESMO resultado, saturado ou não", () => {
    for (const cat of CATS) {
      const saturado = mapaSaturado(cat);
      const folgado = new Map(urlsDo(cat).slice(0, 2).map((u, i) => [u, T0 + i * HORA]));
      for (const seed of SEEDS) {
        // o timestamp vem do BANCO (mesma linha (tópico,dia)) → idêntico p/ os 2 idiomas
        expect(pickFromWhitelist(cat, seed, NUM_CLIPS, saturado)).toEqual(
          pickFromWhitelist(cat, seed, NUM_CLIPS, saturado),
        );
        expect(pickFromWhitelist(cat, seed, NUM_CLIPS, folgado)).toEqual(
          pickFromWhitelist(cat, seed, NUM_CLIPS, folgado),
        );
      }
    }
  });

  it("o par ES/PT NÃO se auto-envenena: o `excludeKey` da própria vaga fica fora do avoid", () => {
    // Cenário real: ES roda 1º e grava os clipes da vaga. O PT lê o avoid SEM a própria
    // linha (excludeKey, achado #126) → mesmo mapa do ES → mesmos clipes. Se a própria
    // vaga entrasse no avoid, o LRU jogaria os clipes do ES pro fim e o PT divergiria.
    const cat = "self";
    const m0 = mapaSaturado(cat);
    const es = pickFromWhitelist(cat, 12345, NUM_CLIPS, m0);
    const brSemExcluir = pickFromWhitelist(cat, 12345, NUM_CLIPS, apósPublicar(m0, es)); // o que NÃO acontece
    const ptComExcluir = pickFromWhitelist(cat, 12345, NUM_CLIPS, m0); // o real (excludeKey)
    expect(ptComExcluir).toEqual(es);
    expect(brSemExcluir).not.toEqual(es); // prova que o excludeKey é o que segura o par
  });
});

// ── 5. O filtro de sujeito continua ANTES de tudo, inclusive no relaxamento ──
describe("sujeito do tema (`who`) manda também no relaxamento", () => {
  it("tema 'man' em pilar SATURADO nunca recebe clipe 'woman'/'couple' (nenhum seed)", () => {
    const violações: string[] = [];
    for (const cat of CATS) {
      const mapa = mapaSaturado(cat); // avoid = pilar inteiro, inclusive os clipes de mulher
      for (const seed of SEEDS) {
        for (const url of pickFromWhitelist(cat, seed, NUM_CLIPS, mapa, "man")) {
          const who = FOOTAGE_LIBRARY[cat].find((c) => c.url === url)?.who;
          if (who === "woman" || who === "couple") violações.push(`${cat}/seed=${seed}: ${url} (${who})`);
        }
      }
    }
    expect(violações).toEqual([]);
  });

  it("`self`+'man' saturado: as 4 mulheres do pilar NUNCA entram, nem para completar", () => {
    const mulheres = new Set(FOOTAGE_LIBRARY.self.filter((c) => c.who === "woman").map((c) => c.url));
    expect(mulheres.size).toBeGreaterThanOrEqual(3); // senão o teste não prova nada
    const mapa = mapaSaturado("self");
    for (const seed of SEEDS) {
      expect(pickFromWhitelist("self", seed, NUM_CLIPS, mapa, "man").filter((u) => mulheres.has(u))).toEqual([]);
    }
  });

  it("o LRU respeita o recorte do sujeito: a capa é o mais antigo ENTRE OS COMPATÍVEIS", () => {
    const mapa = mapaSaturado("self");
    const compatíveis = candidatos("self", "man");
    const maisAntigoCompatível = compatíveis.slice().sort((a, b) => mapa.get(a)! - mapa.get(b)!)[0];
    for (const seed of SEEDS.slice(0, 50)) {
      expect(pickFromWhitelist("self", seed, NUM_CLIPS, mapa, "man")[0]).toBe(maisAntigoCompatível);
    }
  });
});

// ── 6. Borda declarada: acervo justo e leitura simultânea ────────────────────
describe("bordas conhecidas (documentadas, não escondidas)", () => {
  // Combos (cat × who) REAIS do THEMES cujo acervo compatível é EXATAMENTE 5: com o pilar
  // saturado, as 5 cenas consomem o acervo inteiro → a capa repete por ARITMÉTICA (nenhum
  // algoritmo salva). Só acervo novo resolve (frente do `footage-library`). Este teste
  // EXPÕE a lista — se crescer, alguém marcou um tema num pilar sem acervo.
  const ROUTE = readFileSync(resolve(__dirname, "../app/api/publish/route.ts"), "utf8");
  const EM_USO: Array<[string, ThemeWho]> = [
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

  it("achou as combinações do route.ts (senão não prova nada)", () => {
    expect(EM_USO.length).toBeGreaterThan(0);
  });

  it("os combos de acervo JUSTO (== 5 cenas) são só os conhecidos", () => {
    const justos = EM_USO.filter(([cat, who]) => candidatos(cat, who).length === NUM_CLIPS)
      .map(([cat, who]) => `${cat}|${who}`)
      .sort();
    // acervo justo ⇒ o Reel seguinte do mesmo combo repete clipe (inclusive a capa) —
    // limite do ACERVO, não do algoritmo. Cresceu a lista → pedir clipe novo à curadoria.
    expect(justos).toEqual(["network|man", "self|both"]);
  });

  it("leitura SIMULTÂNEA (antes do writeback) — borda declarada, sem promessa falsa", () => {
    // Dois temas que leem o banco no MESMO instante veem o MESMO mapa → o LRU, sendo
    // determinístico, dá a MESMA ordem: capas iguais. Nenhuma função determinística de
    // (mapa, seed) evita isto p/ seeds arbitrários (12 clipes, infinitos seeds — princípio
    // da casa dos pombos). Na produção isto exige que o Reel A ainda NÃO tenha gravado na
    // reel_shared_cache quando B lê (só num redisparo concorrente do catchup no MESMO
    // pilar saturado). O caminho normal — A publica, grava, B lê — é o testado acima.
    const m0 = mapaSaturado("self");
    const a = pickFromWhitelist("self", 111, NUM_CLIPS, m0);
    const b = pickFromWhitelist("self", 999, NUM_CLIPS, m0);
    expect(b[0]).toBe(a[0]); // ← comportamento CONHECIDO e aceito (era 1/12 aleatório antes)
  });
});
