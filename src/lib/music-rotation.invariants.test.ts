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

// ⛔ 30/08/2026 — O UNIVERSO DA ROTAÇÃO ENCOLHEU DE PROPÓSITO, e estas provas seguiram a régua nova.
// O TikTok silenciou 82 dos 84 vídeos das duas contas por "sons não autorizados": 132 das 143 faixas
// deste acervo têm autor na etiqueta (82 obras de Kevin MacLeod, CC BY) e são reconhecidas pelo banco
// de áudio da plataforma. Desde então o picker só sorteia o que está em `public/music/livres.json`, e
// como nenhum pilar tem duas faixas livres próprias, o pool efetivo de TODO tema é esse conjunto.
// Medir contra o tamanho do pool BRUTO passou a medir uma realidade que deixou de existir — e teste
// que mede o que não existe mais vira vermelho permanente, que é como se aprende a ignorar vermelho.
const LIVRES: string[] = JSON.parse(readFileSync(resolve(MUSIC_DIR, "livres.json"), "utf8")).livres;
const N_EFETIVO = LIVRES.length;

// Um tema representativo — o tamanho do pool bruto deixou de diferenciar os casos, porque o universo
// sorteável é o mesmo para todos os temas. A chave do mapa é o tamanho EFETIVO.
const porTamanho = new Map<number, string>([[N_EFETIVO, Object.keys(pools)[0]]]);

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

  // ⏱️ 45s (2026-08-23, subiu de 20s): a LÓGICA está intacta — isto é só o relógio. Este caso
  // varre todos os pilares × 60 dias e leva ~890ms rodando sozinho, mas ESTOURA quando o
  // vitest roda os 71 arquivos em paralelo numa máquina carregada (`verify.sh`, trava de
  // pre-commit, roda a suíte inteira). Estourou de novo em 23/08 (20s) com a máquina puxando
  // várias sessões Claude ao mesmo tempo — mesmo padrão do estouro de 26/07 (era 5s → 20s),
  // não regressão de lógica (a suíte isolada continua em segundos). Aumentar o limite não
  // afrouxa nenhuma garantia: o teste segue exigindo o mesmo resultado, só deixa de falhar
  // por lentidão da máquina.
  it("na cadência real, aparições seguidas do mesmo tema nunca dão a mesma faixa", { timeout: 45000 }, () => {
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

  // A régua "≥ metade" era calibrada pra retorno=26d (cadência 3/dia até 22/08) e só
  // por coincidência dava ≥50% nos pools daquele momento (11/15/17 → 100%; 16 → 8/16
  // por mdc(26,16)=2). Ela não é a garantia real do algoritmo — é a GARANTIA
  // MATEMÁTICA que importa: `indiceNoPool` anda por PASSO FIXO = RETORNO a cada
  // aparição do tema (ver pick-music.cjs), então o nº de faixas distintas visitadas é
  // SEMPRE `n / mdc(RETORNO, n)`, nem mais nem menos — é o próprio teorema do passo
  // fixo em aritmética modular. Testar essa igualdade exata (em vez de um limiar que
  // envelhece a cada mudança de cadência) cobre TODAS as cadências futuras.
  //
  // 2026-08-23 (cadência 1 peça/dia, retorno=183d=3×61): os pools de 15 e 27 faixas
  // (pilares dopamina e mente/redes) compartilham o fator 3 com 183 → visitam só 1/3
  // do pool (5/15 e 9/27) — MENOS variedade que antes, efeito colateral conhecido e
  // aceito da cadência mais lenta (183 temas ÷ 1 post/dia). Consertar de verdade exige
  // OU gerar faixa nova (fal, pago, fora deste escopo) OU redistribuir os pools —
  // decisão de conteúdo, não desta mudança de cadência.
  function mdc(a: number, b: number): number {
    return b === 0 ? a : mdc(b, a % b);
  }

  it("na cadência real, cada tema visita EXATAMENTE n/mdc(retorno,n) faixas — a garantia do passo fixo", () => {
    for (const [n, topic] of porTamanho) {
      const vistas = new Set<string>();
      for (let i = 0; i < n * 3; i++) vistas.add(noDia(20000 + i * RETORNO, topic));
      const esperado = n / mdc(RETORNO, n);
      expect(
        vistas.size,
        `pool ${n} (retorno de ${RETORNO}d): esperado ${esperado} faixas (n/mdc), viu ${vistas.size}`,
      ).toBe(esperado);
    }
  });

  // Uma amostra de temas por pilar já prova o ponto: varrer os 183 × 40 dias faz milhares
  // de checagens de disco e estoura o tempo do teste sem acrescentar informação.
  //
  // ⚠️ O TETO desta prova mudou em 30/08: era ">100 faixas alcançadas" (o acervo inteiro). Hoje o
  // universo permitido tem N_EFETIVO faixas, e o que precisa ser garantido é que a rotação use
  // TODAS elas — nenhuma encalhada. É a mesma pergunta de sempre, medida no universo que existe.
  it("o conjunto não deixa faixa encalhada — usa TODAS as livres", () => {
    const porPilar = new Map<string, string[]>();
    for (const [t, p] of Object.entries(pools)) {
      const cat = /bed-pilar-([a-z]+)/.exec(p[0])?.[1] ?? "?";
      const lista = porPilar.get(cat) ?? [];
      if (lista.length < 3) lista.push(t); // 3 temas por pilar bastam
      porPilar.set(cat, lista);
    }
    const amostra = [...porPilar.values()].flat();

    const alcancadas = new Set<string>();
    for (let d = 20000; d < 20000 + N_EFETIVO; d++) for (const t of amostra) alcancadas.add(noDia(d, t));

    expect(alcancadas.size).toBe(N_EFETIVO); // nenhuma das livres fica encalhada
    for (const f of alcancadas) expect(LIVRES).toContain(f); // e nenhuma com dono escapa
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
