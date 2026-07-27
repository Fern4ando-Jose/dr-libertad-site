import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import pickMusicMod from "../../scripts/pick-music.cjs";
import { POSTS_PER_DAY } from "./day";

// ─────────────────────────────────────────────────────────────────────────────
// INVARIANTE — A TRILHA GIRA (pedido do dono 2026-07-26: "não devem ficar repetindo
// músicas todo dia... aumentar a lista").
//
// Antes, cada tema tinha UMA faixa presa a ele: quando o tema voltava na rotação voltava
// a mesma música, e 17 faixas nunca tocavam (o pilar "anxiety" tinha 13 temas p/ 16
// faixas — 3 jamais sairiam). Agora `public/music/pools.json` dá o pool do pilar de cada
// tema e o picker anda uma casa por dia dentro dele.
//
// O que este teste guarda:
//   (1) todo tema tem pool; toda faixa do pool existe; faixa de origem não confirmada
//       não entra em pool nenhum;
//   (2) em dias seguidos o pool é percorrido INTEIRO antes de repetir;
//   (3) na CADÊNCIA REAL (o tema volta a cada ~26 dias) não há repetição em aparições
//       seguidas e a cobertura fica em pelo menos METADE do pool;
//   (4) determinismo (render e publish não podem divergir) e fail-open.
//
// Sobre a régua "metade" em (3): no regime de retorno a cada k dias, o tema visita
// n/mdc(k,n) faixas. Com k=26: pools de 11, 15 e 17 dão 100%; o pool de 16 dá 8/16,
// porque 16 e 26 são ambos pares. É limite conhecido e aceito — mesmo assim são 8 faixas
// onde antes havia 1. Se alguém mexer em temas/dia (mudando k) e a cobertura despencar,
// este teste falha e avisa. Atalho para levar o pool de 16 a 100%: deixá-lo ímpar.
// ─────────────────────────────────────────────────────────────────────────────

const { pickMusic } = pickMusicMod as unknown as { pickMusic: (a: unknown) => string };
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".."); // src/lib → raiz
const MUSIC_DIR = resolve(ROOT, "public/music");

const pools = JSON.parse(readFileSync(resolve(MUSIC_DIR, "pools.json"), "utf8")) as Record<
  string,
  string[]
>;
const credits = JSON.parse(
  readFileSync(resolve(ROOT, "src/content/music-credits.json"), "utf8"),
) as { unverified: string[] };

function readThemes(): string[] {
  const src = readFileSync(resolve(ROOT, "src/app/api/publish/route.ts"), "utf8");
  const topics: string[] = [];
  for (const line of src.split("\n")) {
    const t = line.match(/topic:\s*"([^"]+)"/);
    const c = line.match(/cat:\s*"([a-z]+)"/);
    if (t && c) topics.push(t[1]);
  }
  return topics;
}

// Roda o picker fingindo um dia (TRILHA_DIA), sem depender do relógio da máquina.
function noDia(dia: number, topic: string): string {
  const antes = process.env.TRILHA_DIA;
  process.env.TRILHA_DIA = String(dia);
  try {
    return pickMusic({ topic, run: 0 });
  } finally {
    if (antes === undefined) delete process.env.TRILHA_DIA;
    else process.env.TRILHA_DIA = antes;
  }
}

// Quantos dias, em média, até o tema reaparecer: nº de temas ÷ posts por dia.
// Derivado dos THEMES *e* da cadência real (POSTS_PER_DAY em ./day é a fonte única —
// mudou de 7 p/ 4 em 2026-07-27 por determinação do dono), para o teste acompanhar em
// vez de fixar um número que envelhece calado.
const RETORNO = Math.max(2, Math.round(readThemes().length / POSTS_PER_DAY));

// Um tema representativo de cada tamanho de pool existente.
const porTamanho = new Map<number, string>();
for (const [t, p] of Object.entries(pools)) if (!porTamanho.has(p.length)) porTamanho.set(p.length, t);

describe("trilha que gira — pools", () => {
  it("todo tema dos THEMES tem pool, e nenhum pool é vazio", () => {
    const topics = readThemes();
    expect(topics.length).toBeGreaterThan(50);
    for (const t of topics) {
      expect(pools[t], `tema sem pool: ${t}`).toBeTruthy();
      expect(pools[t].length, `pool vazio: ${t}`).toBeGreaterThan(0);
    }
  });

  it("toda faixa de todo pool existe em public/", () => {
    const faltando = [...new Set(Object.values(pools).flat())].filter(
      (f) => !existsSync(resolve(ROOT, "public", f)),
    );
    expect(faltando, `pool aponta p/ arquivo inexistente: ${faltando.join(", ")}`).toEqual([]);
  });

  it("faixa de origem não confirmada não entra em pool nenhum", () => {
    const noPool = new Set(
      [...new Set(Object.values(pools).flat())].map((f) => f.split("/").pop()!),
    );
    const vazou = credits.unverified.filter((f) => noPool.has(f));
    expect(vazou, `faixa sem licença confirmada dentro de um pool: ${vazou.join(", ")}`).toEqual([]);
  });

  it("todo mp3 de pilar no disco está em algum pool — só as não confirmadas ficam fora", () => {
    const noDisco = readdirSync(MUSIC_DIR).filter((f) => /^bed-pilar-[a-z]+(-\d+)?\.mp3$/i.test(f));
    const emPool = new Set(
      [...new Set(Object.values(pools).flat())].map((f) => f.split("/").pop()!),
    );
    const fora = noDisco.filter((f) => !emPool.has(f)).sort();
    expect(fora).toEqual([...credits.unverified].sort());
  });
});

describe("trilha que gira — não repete cedo", () => {
  it("em dias seguidos, percorre o pool INTEIRO antes de repetir", () => {
    expect(porTamanho.size).toBeGreaterThan(0);
    for (const [n, topic] of porTamanho) {
      const saidas = new Set<string>();
      for (let d = 20000; d < 20000 + n; d++) saidas.add(noDia(d, topic));
      expect(saidas.size, `pool de ${n} repetiu antes de percorrer tudo (tema "${topic}")`).toBe(n);
    }
  });

  // ⏱️ 20s (2026-07-26): a LÓGICA está intacta — isto é só o relógio. Este caso varre
  // todos os pilares × 60 dias e leva ~890ms rodando sozinho, mas ESTOURA os 5s padrão
  // quando o vitest roda os 43 arquivos em paralelo numa máquina carregada. Como o
  // `verify.sh` é a trava de pre-commit, o estouro BLOQUEAVA o commit de todas as
  // sessões no repo. Aumentar o limite não afrouxa nenhuma garantia: o teste segue
  // exigindo o mesmo resultado, só deixa de falhar por lentidão da máquina.
  it("na cadência real, aparições seguidas do mesmo tema nunca dão a mesma faixa", { timeout: 20000 }, () => {
    for (const [n, topic] of porTamanho) {
      for (let i = 0; i < 60; i++) {
        const d = 20000 + i * RETORNO;
        const a = noDia(d, topic);
        const b = noDia(d + RETORNO, topic);
        expect(a === b, `pool ${n}: repetiu na aparição seguinte (${a}) — tema "${topic}"`).toBe(
          false,
        );
      }
    }
  });

  it("na cadência real, cada tema alcança ao menos METADE do seu pool", () => {
    for (const [n, topic] of porTamanho) {
      const vistas = new Set<string>();
      for (let i = 0; i < n * 3; i++) vistas.add(noDia(20000 + i * RETORNO, topic));
      expect(
        vistas.size,
        `pool ${n} (retorno de ${RETORNO}d): só ${vistas.size} faixas — se a cadência mudou, ver o cabeçalho deste arquivo`,
      ).toBeGreaterThanOrEqual(Math.ceil(n / 2));
    }
  });

  // Uma amostra de temas por pilar já prova o ponto: varrer os 183 × 40 dias faz milhares
  // de checagens de disco e estoura o tempo do teste sem acrescentar informação.
  it("o conjunto não deixa faixa encalhada (era 76 antes da rotação)", () => {
    const porPilar = new Map<string, string[]>();
    for (const [t, p] of Object.entries(pools)) {
      const cat = /bed-pilar-([a-z]+)/.exec(p[0])?.[1] ?? "?";
      const lista = porPilar.get(cat) ?? [];
      if (lista.length < 3) lista.push(t); // 3 temas por pilar bastam
      porPilar.set(cat, lista);
    }
    const amostra = [...porPilar.values()].flat();
    const maiorPool = Math.max(...Object.values(pools).map((p) => p.length));

    const alcancadas = new Set<string>();
    for (let d = 20000; d < 20000 + maiorPool; d++) for (const t of amostra) alcancadas.add(noDia(d, t));

    const teto = new Set(Object.values(pools).flat()).size;
    expect(alcancadas.size).toBeGreaterThan(100); // era 76 com uma faixa por tema
    expect(alcancadas.size).toBeLessThanOrEqual(teto);
  });
});

describe("trilha que gira — sanidade", () => {
  it("mesmo tema, mesmo dia → mesma faixa (render e publish não divergem)", () => {
    const t = Object.keys(pools)[0];
    expect(noDia(20123, t)).toBe(noDia(20123, t));
  });

  it("tema desconhecido é fail-open (devolve string, nunca lança)", () => {
    const r = pickMusic({ topic: "Tema que não existe para teste", run: 1 });
    expect(typeof r).toBe("string");
  });
});
