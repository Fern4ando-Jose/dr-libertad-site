// ─── Rotação determinística dos temas (SEM repetição) ───────────────────────
// O esquema antigo reembaralhava a lista INTEIRA toda semana (`weekNum`). Como o
// ciclo dos temas (N posts) não fecha numa semana, o reembaralho caía no meio do
// ciclo e fazia o MESMO tema voltar em 1–3 dias — e a trava anti-dup de 7 dias
// então BLOQUEAVA o post (não saía). Medido: 50 repetições com gap < 7 dias em
// 28 dias, menor gap 0,5 dia.
//
// Aqui a ordem é FIXA: percorre os N temas continuamente, cada um 1× por ciclo
// (gap = N posts; com 51 temas e 6/dia ≈ 8,5 dias > 7d → nunca colide com a
// anti-dup). E INTERCALA as categorias por rank fracionário, pra não agrupar o
// mesmo `cat` (ex.: dopamina/network) no mesmo dia. Determinística → ES e PT batem.

// Ordem de rotação (índices no array original) intercalando categorias: cada cat
// é espalhada o mais uniformemente possível ao longo do ciclo (técnica de rank
// fracionário (k+0,5)/tamanho — quanto maior o cat, mais perto fica de cada post).
export function buildRotation(cats: string[]): number[] {
  const byCat = new Map<string, number[]>();
  cats.forEach((c, i) => {
    const arr = byCat.get(c) ?? [];
    arr.push(i);
    byCat.set(c, arr);
  });
  const ranked: { idx: number; rank: number; cat: string }[] = [];
  for (const [cat, idxs] of byCat) {
    idxs.forEach((idx, k) => ranked.push({ idx, rank: (k + 0.5) / idxs.length, cat }));
  }
  // rank crescente; empate → estável por cat e idx (100% determinístico)
  ranked.sort((a, b) => a.rank - b.rank || a.cat.localeCompare(b.cat) || a.idx - b.idx);
  return ranked.map((r) => r.idx);
}

// Dia do ano — mesma conta do esquema antigo (continuidade). Na Vercel = UTC.
export function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

// Índice do tema (no array original) para um (data, run): caminha a rotação fixa
// continuamente → cada tema 1× por ciclo. 6 posts por dia (runs 0..5).
export function topicIndexForRun(rotation: number[], date: Date, runIndex: number): number {
  const slot = dayOfYear(date) * 6 + runIndex;
  const n = rotation.length;
  return rotation[((slot % n) + n) % n];
}

// Slot inicial (contínuo) de um (data, run). Separado p/ o caminhar-pulando abaixo.
export function slotForRun(date: Date, runIndex: number): number {
  return dayOfYear(date) * 6 + runIndex;
}

// Escolhe o tema do slot PULANDO os já usados recentemente (em QUALQUER formato,
// na conta) — a trava anti-dup REAL, robusta a mudanças de rotação e a repetição
// reel↔carrossel. Caminha a rotação a partir de `startSlot` e devolve o 1º índice
// de tema que NÃO está em `used` (índices de tema publicados nos últimos N dias).
// Se todos estiverem usados (degenerado — N temas < janela), cai no tema-base do
// slot. Função PURA → testável.
export function pickFreshTopicIndex(rotation: number[], startSlot: number, used: Set<number>): number {
  const n = rotation.length;
  for (let i = 0; i < n; i++) {
    const idx = rotation[(((startSlot + i) % n) + n) % n];
    if (!used.has(idx)) return idx;
  }
  return rotation[((startSlot % n) + n) % n]; // tudo usado → base (não deve ocorrer: N > 6×7)
}

// Threading intra-dia + pick, em UMA função PURA (testável). Monta o `used` =
// recentes ∪ picks DETERMINÍSTICOS dos runs anteriores do dia, e devolve o índice
// do tema do run. Invariante-chave: com o MESMO `recentIndices`, ES e PT devolvem o
// MESMO índice (mesmo vídeo) — por isso o chamador EXCLUI hoje do recent (senão o
// tema do 1º idioma poluiria o do 2º). E os 6 runs do dia saem DISTINTOS (threading).
export function pickFreshTopicIndexThreaded(rotation: number[], date: Date, runIndex: number, recentIndices: Set<number>): number {
  const used = new Set<number>(recentIndices);
  for (let i = 0; i < runIndex; i++) {
    used.add(pickFreshTopicIndex(rotation, slotForRun(date, i), used));
  }
  return pickFreshTopicIndex(rotation, slotForRun(date, runIndex), used);
}

// ─── SHUFFLE BAG (saco de cartas) — rotação balanceada, sem repetir até esgotar ──
// PROBLEMA que conserta: a rotação acima é presa ao CALENDÁRIO (dia*6+run). Vaga
// que falha (orçamento/lang-guard/ilustração reprovada) = tema PULADO pra sempre →
// só ~metade dos 61 temas ia ao ar (P1-Dopamina em 22%). Aqui o catálogo vira um
// BARALHO: cada CICLO (= N vagas ≈ 10 dias) é uma permutação embaralhada e
// balanceada; um tema só sai 1× por ciclo (entra no "usado" quando PUBLICA — só o
// que realmente publicou conta, então tema não-publicado CONTINUA no baralho). A
// cada ciclo re-embaralha (semente = nº do ciclo) → ordem varia (aleatoriedade)
// com cobertura garantida. Determinístico → ES e PT batem; catchup é idempotente.

// PRNG determinístico (mulberry32) — embaralho reproduzível por semente.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates determinístico (não muta a entrada).
export function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const out = arr.slice();
  const rnd = mulberry32(seed >>> 0);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Baralho balanceado de um ciclo: permutação de [0..N) onde cada CATEGORIA é
// embaralhada (pela semente) e depois INTERCALADA por rank fracionário, pra não
// agrupar o mesmo cat no mesmo dia. Cada semente (= nº do ciclo) dá uma ordem
// diferente, mas SEMPRE uma permutação válida (cada índice 1×) e balanceada.
export function buildBalancedDeck(cats: string[], seed: number): number[] {
  const byCat = new Map<string, number[]>();
  cats.forEach((c, i) => {
    const arr = byCat.get(c) ?? [];
    arr.push(i);
    byCat.set(c, arr);
  });
  const ranked: { idx: number; rank: number; tie: number }[] = [];
  // ordem das categorias também varia por semente (desempate), pra a 1ª carta do
  // ciclo não ser sempre do mesmo cat.
  const catKeys = [...byCat.keys()].sort();
  for (const cat of catKeys) {
    const shuffled = seededShuffle(byCat.get(cat)!, seed ^ hashStr(cat));
    const tie = mulberry32((seed ^ hashStr(cat)) >>> 0)(); // jitter estável por (cat,seed)
    shuffled.forEach((idx, k) => ranked.push({ idx, rank: (k + 0.5) / shuffled.length, tie }));
  }
  ranked.sort((a, b) => a.rank - b.rank || a.tie - b.tie || a.idx - b.idx);
  return ranked.map((r) => r.idx);
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Slot CONTÍNUO (monotônico, sem reset de ano) a partir do dia-string 'YYYY-MM-DD'
// (o mesmo `day` que o livro-razão grava) e do run. Base do nº de ciclo e do cursor.
export function slotForDayRun(dayStr: string, run: number): number {
  const [y, m, d] = dayStr.split("-").map(Number);
  const absDay = Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000);
  return absDay * 6 + run;
}

export function cycleOf(slot: number, n: number): number {
  return Math.floor(slot / n);
}

// Caminha o baralho a partir de `cursor` (posição no ciclo, com wrap) e devolve o
// 1º índice de tema que NÃO está em `used`. -1 se todos usados (cobertura cheia).
export function drawFromCursor(deck: number[], cursor: number, used: Set<number>): number {
  const n = deck.length;
  for (let i = 0; i < n; i++) {
    const idx = deck[(((cursor + i) % n) + n) % n];
    if (!used.has(idx)) return idx;
  }
  return -1;
}

// Folga de aleatoriedade: nº de temas "elegíveis" deixados livres a cada vaga. É o
// tamanho do baralho de onde se sorteia. POOL=6 (uma diária) → a ordem varia (✓
// aleatoriedade) e mesmo assim um tema só REPETE depois de ≥ N-POOL outros (= 55 de
// 61 ≈ 9 dias). Subir o POOL = mais variação, repete um pouco mais cedo. POOL=0 =
// rotação fixa pura (repete só após TODOS os 61), zero aleatoriedade. Mínimo 6 porque
// o dia tem 6 vagas distintas. MATEMÁTICA: garantir 6 distintos/dia E gap=61 exige
// ordem 100% fixa; qualquer aleatoriedade custa folga do gap. POOL escolhe o ponto.
export const RANDOM_POOL = 6;

// ── SELEÇÃO do tema (PURA, testável) — o coração do shuffle bag ──
// Modelo: JANELA DE RECÊNCIA (LRU). `used` = temas publicados nos últimos (N-POOL)
// slots; pula-os → um tema só repete depois de ≥ N-POOL OUTROS (gap garantido, SEM
// borda de ciclo — janela deslizante contínua). Tema NUNCA publicado nunca está em
// `used` → entra ASAP (conserta o sub-uso: todos trabalham). Entre os ELEGÍVEIS,
// escolhe na ordem do BARALHO BALANCEADO da época (semente=ciclo) → categorias
// intercaladas + variação por ciclo. Threading: os runs anteriores do dia entram no
// `used` → 6 vagas/dia distintas. Determinístico (mesmo livro-razão → ES=PT, catchup
// idempotente). Só o que PUBLICOU conta (falha não consome o baralho).
export function selectThemeIndex(
  cats: string[],
  dayStr: string,
  run: number,
  publishedIdxSlots: { idx: number; slot: number }[],
  pool: number = RANDOM_POOL,
): number {
  const n = cats.length;
  const poolEff = Math.max(6, pool);
  // último slot em que cada tema publicou (−1 = nunca) → RANK por recência.
  const lastSlot = new Array<number>(n).fill(-1);
  for (const p of publishedIdxSlots) {
    if (p.idx >= 0 && p.idx < n && p.slot > lastSlot[p.idx]) lastSlot[p.idx] = p.slot;
  }
  // "usado" = os (N-POOL) temas MAIS RECENTES (por nº de publicações distintas, não por
  // slots — robusto a falhas). Tema nunca publicado (−1) nunca entra → elegível ASAP.
  const aired = [];
  for (let i = 0; i < n; i++) if (lastSlot[i] >= 0) aired.push(i);
  aired.sort((a, b) => lastSlot[b] - lastSlot[a]); // mais recente primeiro
  const recentUsed = new Set<number>(aired.slice(0, Math.max(0, n - poolEff)));

  const deck = buildBalancedDeck(cats, cycleOf(slotForDayRun(dayStr, run), n));

  // pick do run `r`: pula os recentes (rank) ∪ picks dos runs anteriores do dia.
  const pickFor = (r: number): number => {
    const used = new Set<number>(recentUsed);
    for (let k = 0; k < r; k++) used.add(pickFor(k)); // threading intra-dia → 6 distintos
    for (const idx of deck) if (!used.has(idx)) return idx; // 1ª carta elegível (ordem balanceada)
    // degenerado (elegíveis < runs restantes do dia): o MENOS recente que NÃO saiu HOJE.
    const today = new Set<number>();
    for (let k = 0; k < r; k++) today.add(pickFor(k));
    let best = deck[0], bestSlot = Infinity;
    for (const idx of deck) {
      if (today.has(idx)) continue;
      if (lastSlot[idx] < bestSlot) { bestSlot = lastSlot[idx]; best = idx; }
    }
    return best;
  };
  return pickFor(run);
}
