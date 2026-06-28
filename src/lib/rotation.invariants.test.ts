import { describe, it, expect } from "vitest";
import { buildRotation, topicIndexForRun, slotForRun, pickFreshTopicIndex, pickFreshTopicIndexThreaded,
  buildBalancedDeck, seededShuffle, slotForDayRun, cycleOf, drawFromCursor, selectThemeIndex } from "./rotation";

// Espelha THEMES[].cat de api/publish/route.ts (51 temas, em ordem). Se THEMES
// mudar, atualizar aqui. O bug antigo: reembaralho semanal repetia o mesmo tema
// em 1–3 dias e a anti-dup de 7d bloqueava o post. Estes testes barram a volta.
const CATS = ["dopamine","dopamine","dopamine","anxiety","dopamine","dopamine","dopamine","mind","self","network","network","network","network","network","dopamine","network","network","network","network","network","network","network","network","anxiety","freedom","self","network","self","freedom","self","anxiety","freedom","mind","self","freedom","self","anxiety","freedom","anxiety","self","dopamine","freedom","freedom","freedom","anxiety","freedom","freedom","freedom","self","anxiety","freedom"];

describe("rotação — sem repetição antes de fechar o ciclo", () => {
  it("buildRotation é uma permutação válida (cada índice exatamente 1×)", () => {
    const rot = buildRotation(CATS);
    expect(rot.length).toBe(CATS.length);
    expect(new Set(rot).size).toBe(CATS.length);
    expect([...rot].sort((a, b) => a - b)).toEqual(CATS.map((_, i) => i));
  });

  it("nenhum tema repete dentro de N posts (gap ≥ ciclo ≈ 8,5 dias > anti-dup 7d)", () => {
    const rot = buildRotation(CATS);
    const N = rot.length;
    const seq: number[] = [];
    const base = new Date(Date.UTC(2026, 5, 16, 12, 0, 0));
    for (let d = 0; d < 60; d++) {
      const date = new Date(base.getTime() + d * 86400000);
      for (let r = 0; r < 6; r++) seq.push(topicIndexForRun(rot, date, r));
    }
    // toda janela de N slots consecutivos tem N temas DISTINTOS (zero repetição no ciclo)
    for (let i = 0; i + N <= seq.length; i++) {
      expect(new Set(seq.slice(i, i + N)).size).toBe(N);
    }
  });

  it("intercala categorias — nenhum cat aparece > 3× num dia (janela de 6)", () => {
    const rot = buildRotation(CATS);
    let worst = 0;
    for (let s = 0; s < rot.length; s++) {
      const counts: Record<string, number> = {};
      for (let k = 0; k < 6; k++) {
        const cat = CATS[rot[(s + k) % rot.length]];
        counts[cat] = (counts[cat] || 0) + 1;
        worst = Math.max(worst, counts[cat]);
      }
    }
    expect(worst).toBeLessThanOrEqual(3); // o esquema antigo dava 4 (ex.: 4 dopamina/network no dia)
  });

  it("determinística — mesma entrada, mesma ordem (ES e PT batem)", () => {
    expect(buildRotation(CATS)).toEqual(buildRotation(CATS));
  });
});

// TRAVA ANTI-DUP REAL (cross-formato). A rotação determinística sozinha NÃO
// impedia repetição: trocar o algoritmo no meio do ciclo, ou o Reel não gravar o
// tópico, fazia o MESMO tema sair Reel num dia e carrossel no outro ("El padre
// ausente": reel 21/06 + carrossel 22/06). pickFreshTopicIndex pula o que saiu
// nos últimos 7d em QUALQUER formato → repetição impossível.
describe("pickFreshTopicIndex — não repete tema usado recentemente", () => {
  const n = 51;
  const rot = Array.from({ length: n }, (_, i) => i); // a propriedade não depende da permutação

  it("sem recentes → tema-base do slot", () => {
    expect(pickFreshTopicIndex(rot, 10, new Set())).toBe(10);
  });

  it("pula o(s) recente(s) e devolve o próximo livre", () => {
    expect(pickFreshTopicIndex(rot, 10, new Set([10]))).toBe(11);
    expect(pickFreshTopicIndex(rot, 10, new Set([10, 11, 12]))).toBe(13);
  });

  it("NUNCA devolve um tema usado (salvo se todos usados)", () => {
    const used = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (let s = 0; s < n; s++) {
      expect(used.has(pickFreshTopicIndex(rot, s, used))).toBe(false);
    }
  });

  it("regressão 'padre ausente': tema de ontem não reaparece hoje no seu slot", () => {
    const padre = 30;            // saiu ontem (Reel) → está nos recentes
    const used = new Set([padre]);
    expect(pickFreshTopicIndex(rot, padre, used)).not.toBe(padre);
  });

  it("simulação 14 dias × 6/dia com janela 7d (42 slots) → ZERO repetição em 7d", () => {
    const realRot = buildRotation(CATS);
    const history: number[] = [];
    for (let day = 0; day < 14; day++) {
      for (let run = 0; run < 6; run++) {
        const used = new Set(history.slice(-42)); // últimos 7 dias (qualquer formato)
        const idx = pickFreshTopicIndex(realRot, day * 6 + run, used);
        expect(used.has(idx)).toBe(false); // nunca repete dentro de 7d
        history.push(idx);
      }
    }
  });

  it("slotForRun é contínuo (dia avança 6 slots)", () => {
    const d1 = new Date(Date.UTC(2026, 5, 21, 12));
    const d2 = new Date(Date.UTC(2026, 5, 22, 12));
    expect(slotForRun(d2, 0) - slotForRun(d1, 0)).toBe(6);
  });

  // Threading intra-dia (igual ao getFreshTopicForRun): com base de recentes DENSA
  // (pior caso), os 6 runs do dia avançariam todos p/ o mesmo "1º livre" se não
  // houvesse threading. Incluindo os picks anteriores no `used`, saem 6 DISTINTOS —
  // sem depender da ordem/timing de gravação (robusto a re-disparo do catchup).
  it("threading intra-dia → 6 runs do dia DISTINTOS, nenhum recente", () => {
    const realRot = buildRotation(CATS);
    const baseUsed = new Set<number>();
    for (let i = 0; i < 20; i++) baseUsed.add(i); // 20 recentes (força avanço)
    const day = 200;
    const used = new Set(baseUsed);
    const picks: number[] = [];
    for (let run = 0; run < 6; run++) {
      const idx = pickFreshTopicIndex(realRot, day * 6 + run, used);
      used.add(idx);
      picks.push(idx);
    }
    expect(new Set(picks).size).toBe(6);            // 6 distintos (sem colisão)
    for (const p of picks) expect(baseUsed.has(p)).toBe(false); // nenhum recente
  });
});

// Conserto do DESCASAMENTO ES/PT: pickFreshTopicIndexThreaded é PURO e determinístico.
// Com o MESMO recentIndices, ES e PT devolvem o MESMO índice (mesmo vídeo) — a chave do
// fix é o chamador EXCLUIR hoje do recent (senão o tema do 1º idioma poluiria o do 2º).
describe("pickFreshTopicIndexThreaded — ES e PT batem; runs do dia distintos", () => {
  const rot = buildRotation(CATS);
  const day = new Date(Date.UTC(2026, 5, 24, 12));

  it("determinístico: mesmo recent → mesmo índice (ES e PT pegam o mesmo tema)", () => {
    const a = pickFreshTopicIndexThreaded(rot, day, 0, new Set());
    const b = pickFreshTopicIndexThreaded(rot, day, 0, new Set());
    expect(a).toBe(b);
  });

  it("os 6 runs do dia saem DISTINTOS (threading)", () => {
    const picks = [0, 1, 2, 3, 4, 5].map((run) => pickFreshTopicIndexThreaded(rot, day, run, new Set()));
    expect(new Set(picks).size).toBe(6);
  });

  it("pula o índice recente", () => {
    const base = pickFreshTopicIndexThreaded(rot, day, 0, new Set());
    const pick = pickFreshTopicIndexThreaded(rot, day, 0, new Set([base]));
    expect(pick).not.toBe(base);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SHUFFLE BAG (rotação balanceada, sem repetir até esgotar). Espelha THEMES[].cat
// dos 61 temas ATUAIS (5 pilares + cânone + §4), em ordem. Se THEMES mudar, atualizar.
// O bug que isto barra: rotação presa ao calendário pulava vagas que falhavam → só
// ~metade dos 61 temas ia ao ar (P1-Dopamina em 22%). O baralho garante cobertura.
const CATS61 = [
  // P1 Dopamina (9)
  "dopamine","dopamine","dopamine","anxiety","dopamine","dopamine","dopamine","mind","self",
  // P2 Redes (9)
  "network","network","network","network","network","dopamine","network","network","network",
  // P2+ Filtros (6)
  "network","network","network","network","network","anxiety",
  // P3 Homem (9)
  "freedom","self","network","self","freedom","self","anxiety","freedom","mind",
  // P4 Verdades (9)
  "self","freedom","self","anxiety","freedom","anxiety","self","dopamine","freedom",
  // P5 Liberdade (9)
  "freedom","freedom","anxiety","freedom","freedom","freedom","self","anxiety","freedom",
  // Cânone (5)
  "self","mind","freedom","network","freedom",
  // §4 adições (5)
  "network","self","self","self","self",
];

describe("buildBalancedDeck — permutação válida, balanceada, variável por semente", () => {
  it("é permutação válida (cada índice 1×) para qualquer semente", () => {
    for (const seed of [0, 1, 7, 42, 1000, 123456]) {
      const deck = buildBalancedDeck(CATS61, seed);
      expect(deck.length).toBe(CATS61.length);
      expect(new Set(deck).size).toBe(CATS61.length);
      expect([...deck].sort((a, b) => a - b)).toEqual(CATS61.map((_, i) => i));
    }
  });

  it("CATS61 tem 61 temas (sincronizado com THEMES)", () => {
    expect(CATS61.length).toBe(61);
  });

  it("intercala categorias — nenhum cat > 3× numa janela de 6 (anti-cluster)", () => {
    for (const seed of [0, 3, 99]) {
      const deck = buildBalancedDeck(CATS61, seed);
      let worst = 0;
      for (let s = 0; s < deck.length; s++) {
        const counts: Record<string, number> = {};
        for (let k = 0; k < 6; k++) {
          const cat = CATS61[deck[(s + k) % deck.length]];
          counts[cat] = (counts[cat] || 0) + 1;
          worst = Math.max(worst, counts[cat]);
        }
      }
      expect(worst).toBeLessThanOrEqual(3);
    }
  });

  it("determinístico: mesma semente → mesmo baralho (ES e PT batem)", () => {
    expect(buildBalancedDeck(CATS61, 5)).toEqual(buildBalancedDeck(CATS61, 5));
  });

  it("ALEATORIEDADE: ciclos diferentes dão ordens diferentes (≥80% dos pares)", () => {
    const decks = Array.from({ length: 10 }, (_, c) => buildBalancedDeck(CATS61, c).join(","));
    const uniq = new Set(decks);
    expect(uniq.size).toBeGreaterThanOrEqual(9); // quase todos os 10 ciclos diferem
  });

  it("seededShuffle não muta a entrada e preserva os elementos", () => {
    const src = [1, 2, 3, 4, 5];
    const out = seededShuffle(src, 42);
    expect(src).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("slotForDayRun / cycleOf / drawFromCursor — base do baralho", () => {
  it("slot é contínuo e monotônico (dia avança 6; sem reset de ano)", () => {
    expect(slotForDayRun("2026-06-22", 0) - slotForDayRun("2026-06-21", 0)).toBe(6);
    // virada de ano NÃO reseta (era o risco do dayOfYear)
    expect(slotForDayRun("2027-01-01", 0)).toBeGreaterThan(slotForDayRun("2026-12-31", 5));
  });

  it("cycleOf agrupa N slots por ciclo", () => {
    const n = 61;
    const c = cycleOf(slotForDayRun("2026-06-22", 0), n);
    const s0 = c * n; // slot alinhado ao início do ciclo
    expect(cycleOf(s0, n)).toBe(c);
    expect(cycleOf(s0 + n - 1, n)).toBe(c);   // N slots consecutivos = 1 ciclo
    expect(cycleOf(s0 + n, n)).toBe(c + 1);   // o próximo vira o ciclo
  });

  it("drawFromCursor devolve o 1º livre a partir do cursor (com wrap)", () => {
    const deck = [5, 3, 1, 4, 2, 0];
    expect(drawFromCursor(deck, 0, new Set())).toBe(5);
    expect(drawFromCursor(deck, 0, new Set([5, 3]))).toBe(1);
    expect(drawFromCursor(deck, 4, new Set([2, 0]))).toBe(5); // wrap
    expect(drawFromCursor(deck, 0, new Set([5, 3, 1, 4, 2, 0]))).toBe(-1); // tudo usado
  });
});

// O CORAÇÃO: simula o loop real de seleção (getFreshTopicForRun) sobre muitos dias,
// alimentando selectThemeIndex com o livro-razão simulado. Prova as garantias do dono.
function simulate(opts: { days: number; failEvery?: number; startDay?: string }) {
  const { days, failEvery = 0 } = opts;
  const n = CATS61.length;
  // livro-razão simulado: vagas PUBLICADAS (idx + slot)
  const ledger: { idx: number; slot: number }[] = [];
  const published: number[] = [];   // sequência de temas publicados (na ordem)
  const baseDate = new Date(Date.UTC(2026, 0, 1)); // 2026-01-01
  for (let d = 0; d < days; d++) {
    const date = new Date(baseDate.getTime() + d * 86400000);
    const dayStr = date.toISOString().slice(0, 10);
    for (let run = 0; run < 6; run++) {
      const idx = selectThemeIndex(CATS61, dayStr, run, ledger);
      const slot = slotForDayRun(dayStr, run);
      // simula falha de publicação determinística (não grava no livro-razão)
      const fail = failEvery > 0 && (d * 6 + run) % failEvery === 0;
      if (!fail) { ledger.push({ idx, slot }); published.push(idx); }
    }
  }
  return { published, ledger };
}

// Gap garantido = N - POOL (POOL=6 → 55). Um tema só repete depois de ≥ 55 OUTROS,
// i.e. esgota quase todo o catálogo (9 dias) antes de voltar — janela deslizante, sem
// borda de ciclo. (Gap=61 exigiria ordem 100% fixa = zero aleatoriedade; ver RANDOM_POOL.)
const POOL = 6;
const GAP = CATS61.length - POOL; // 55

describe("selectThemeIndex — shuffle bag: sem repetir até esgotar + cobertura total", () => {
  it(`SEM repetição até esgotar: toda janela de ${GAP} publicados tem temas DISTINTOS`, () => {
    const { published } = simulate({ days: 60 });
    expect(published.length).toBeGreaterThanOrEqual(CATS61.length * 5);
    for (let i = 0; i + GAP <= published.length; i++) {
      expect(new Set(published.slice(i, i + GAP)).size).toBe(GAP); // gap ≥ 55: zero repetição
    }
  });

  it("COBERTURA: sem falhas, TODOS os 61 temas vão ao ar (nenhum fica de fora)", () => {
    const { published } = simulate({ days: 30 });
    const n = CATS61.length;
    expect(new Set(published).size).toBe(n);          // os 61 trabalharam
    // e cada bloco de N consecutivos cobre quase tudo (≥ N-POOL distintos)
    for (let c = 0; c * n + n <= published.length; c++) {
      expect(new Set(published.slice(c * n, c * n + n)).size).toBeGreaterThanOrEqual(n - POOL);
    }
  });

  it("ROBUSTO A FALHAS: com 1 em 5 vagas falhando, ainda cobre TODOS e mantém o gap", () => {
    const { published } = simulate({ days: 90, failEvery: 5 });
    const n = CATS61.length;
    expect(new Set(published).size).toBe(n); // tema que falhou CONTINUA no baralho → todos saem
    for (let i = 0; i + GAP <= published.length; i++) {
      expect(new Set(published.slice(i, i + GAP)).size).toBe(GAP); // gap preservado apesar das falhas
    }
  });

  it("ES e PT pegam o MESMO tema na MESMA vaga (determinístico, dado o mesmo livro-razão)", () => {
    const ledger: { idx: number; slot: number }[] = [{ idx: 3, slot: slotForDayRun("2026-06-22", 0) }];
    const a = selectThemeIndex(CATS61, "2026-06-22", 1, ledger);
    const b = selectThemeIndex(CATS61, "2026-06-22", 1, ledger);
    expect(a).toBe(b);
  });

  it("os 6 runs do dia saem DISTINTOS (threading intra-dia)", () => {
    const picks = [0, 1, 2, 3, 4, 5].map((run) => selectThemeIndex(CATS61, "2026-06-22", run, []));
    expect(new Set(picks).size).toBe(6);
  });

  it("não escolhe um tema já PUBLICADO neste ciclo", () => {
    const dayStr = "2026-06-22";
    const slot0 = slotForDayRun(dayStr, 0);
    const first = selectThemeIndex(CATS61, dayStr, 0, []);
    // grava-o como publicado e pede o run seguinte → não pode repetir
    const next = selectThemeIndex(CATS61, dayStr, 1, [{ idx: first, slot: slot0 }]);
    expect(next).not.toBe(first);
  });

  // Balanço GARANTIDO é o do BARALHO (≤3, testado acima) + cobertura de TODOS os pilares
  // por ciclo. No ar (sequência real, sob a restrição da janela LRU + re-embaralho por
  // ciclo = a aleatoriedade pedida) é best-effort: NUNCA um dia monocromático (≤5 de 6).
  it("BALANÇO no ar: nenhuma janela de 6 publicados é monocromática (≤5 de um cat)", () => {
    const { published } = simulate({ days: 120 });
    let worst = 0;
    for (let i = 0; i + 6 <= published.length; i++) {
      const counts: Record<string, number> = {};
      for (let k = 0; k < 6; k++) {
        const cat = CATS61[published[i + k]];
        counts[cat] = (counts[cat] || 0) + 1;
        worst = Math.max(worst, counts[cat]);
      }
    }
    expect(worst).toBeLessThanOrEqual(5);
  });
});
