// ─── Seleção da trilha do Reel — UMA FAIXA POR TEMA ──────────────────────────
// Por quê: cada TEMA tem som próprio. `scripts/build-music-manifest.mjs` monta o
// manifest.json (topic → arquivo) a partir dos THEMES + overrides.json; hoje cada tema
// aponta pro instrumental do seu PILAR (bed-pilar-<cat>.mp3). [A música de IA por tema
// foi aposentada — dono rejeitou; o gerador fal antigo e os bed-NN-slug foram removidos.]
// Aqui escolhemos a faixa pelo TEMA do post — quando o tema repete (a cada ~8
// dias), o picker reusa o MESMO arquivo já commitado (nada regenera).
//
// ROTAÇÃO (2026-07-26, pedido do dono "não devem ficar repetindo música todo dia"): a
// faixa NÃO é mais presa ao tema. `pools.json` dá o pool do pilar daquele tema e aqui
// giramos por DIA — a cada aparição do tema sai outra faixa, e a mesma só volta depois
// de percorrer o pool inteiro (meses). Efeito colateral bom: as faixas que antes não
// recebiam tema nenhum (17 encalhadas) passam a tocar.
//
// FAIL-OPEN (não quebra a automação):
//   1. tema no pools.json → gira dentro do pool do pilar (faixa que falta no disco é pulada);
//   2. senão → faixa âncora do manifest (comportamento antigo), se estiver no disco;
//   3. senão → rotação ANTIGA por `run` entre bed-0.mp3, bed-1.mp3, … (se houver);
//   4. senão → bed.wav/bed.mp3 única;
//   5. nada → "" (Reel renderiza mudo, como antes).
//
// Uso CLI:
//   node scripts/pick-music.cjs --topic="La soledad masculina que nadie ve"
//   node scripts/pick-music.cjs --run=2          # legado (sem tema)
// Uso lib:
//   require("./scripts/pick-music.cjs").pickMusic({ topic, run })  → "music/bed-..mp3" | ""
//   require("./scripts/pick-music.cjs").pickMusic(2)               → legado por run

const fs = require("node:fs");
const path = require("node:path");

const MUSIC_DIR = path.resolve(__dirname, "..", "public", "music");
const MANIFEST = path.join(MUSIC_DIR, "manifest.json");
const POOLS = path.join(MUSIC_DIR, "pools.json");
const LIVRES = path.join(MUSIC_DIR, "livres.json");
// bed.wav / bed.mp3 (base) e bed-<n>.wav / bed-<n>.mp3 (legado, rotação por run).
// NÃO casa bed-<NN>-<slug>.mp3 (faixas por tema) — essas só vêm via manifest.
const RE = /^bed(?:-(\d+))?\.(wav|mp3)$/i;

// topic → "music/bed-..mp3" lido do manifest (gerado por build-music-manifest.mjs).
function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  } catch {
    return {};
  }
}

// topic → LISTA de faixas do pilar (pools.json, mesmo gerador). É o que faz a trilha
// GIRAR em vez de ficar presa ao tema.
function readPools() {
  try {
    return JSON.parse(fs.readFileSync(POOLS, "utf8"));
  } catch {
    return {};
  }
}

// ── A PENEIRA QUE FALTAVA (30/08/2026) ───────────────────────────────────────
// ⛔ Só entra no vídeo faixa SEM autor registrado. O TikTok silenciou 82 dos 84 vídeos das duas
// contas — aviso dele, 9 vezes entre 06/08 e 30/08: "Publicação silenciada devido a sons não
// autorizados". As 132 faixas com autor deste acervo (82 obras de Kevin MacLeod, CC BY) estão
// catalogadas no banco de identificação de áudio da plataforma: a licença permite o uso, o robô
// silencia assim mesmo. E como a narração divide o canal com a música, silenciar mata a peça.
// A lista é gerada de fora, lendo a etiqueta de cada arquivo: `scripts/build-music-livres.mjs`.
//
// ⚠️ FAIL-CLOSED de propósito: sem `livres.json` legível, NENHUMA faixa é liberada e o Reel sai
// sem trilha. Peça sem música ainda tem a narração e vai ao ar; peça com faixa reconhecida vai ao
// ar MUDA. Entre as duas, a escolha não é opinião.
let _livresCache = null;
function livres() {
  if (_livresCache) return _livresCache;
  try {
    const j = JSON.parse(fs.readFileSync(LIVRES, "utf8"));
    _livresCache = new Set(Array.isArray(j.livres) ? j.livres : []);
  } catch {
    _livresCache = new Set();
  }
  return _livresCache;
}

/** A faixa pode ir ao ar? Aceita "music/x.mp3" (como está nos pools) ou "x.mp3" (legado). */
function podeIrAoAr(file) {
  if (typeof file !== "string" || !file) return false;
  const comPasta = file.startsWith("music/") ? file : `music/${file}`;
  return livres().has(comPasta);
}

// Mesma conta do gerador (build-music-manifest.mjs) — dá a POSIÇÃO INICIAL do tema no
// pool, para dois temas do mesmo pilar não começarem na mesma faixa.
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Dia corrido (UTC) desde 1970 — o "passo" da rotação. Uma faixa por dia, por tema:
// o tema volta a cada ~26 dias (183 temas ÷ 7 posts), então cada aparição cai num passo
// diferente e a mesma faixa só retorna depois de percorrer o pool inteiro.
// `TRILHA_DIA` permite fixar o dia em teste sem depender do relógio.
function diaCorrido() {
  const forcado = Number(process.env.TRILHA_DIA);
  if (Number.isFinite(forcado)) return Math.abs(Math.trunc(forcado));
  return Math.floor(Date.now() / 86400000);
}

// Escolhe girando: passo do dia + posição inicial do tema. Pula faixa que não está no
// disco (fail-open) e devolve null se nenhuma do pool existir.
// Índice da faixa no pool: anda UMA casa por dia, partindo de uma posição própria do
// tema. Em dias seguidos percorre o pool inteiro e só então repete.
//
// LIMITE CONHECIDO (medido, não suposto): o tema não reaparece todo dia — volta a cada
// k dias (hoje ~26: 183 temas ÷ 7 posts). Nesse regime o tema visita n/mdc(k,n) faixas
// do seu pool. Com a cadência de hoje: pools de 11, 15 e 17 → TODAS as faixas; pool de
// 16 → 8 das 16 (mdc(26,16)=2). Mesmo o pior caso é 8× melhor que o desenho antigo, que
// dava UMA faixa por tema para sempre.
// Tentei algoritmos "mais espertos" (passo variável por bloco) e ficaram PIORES: criavam
// buracos em outras cadências e repetição em aparições seguidas. Este é simples, previsível
// e testado — `music-rotation.invariants.test.ts` mede a cobertura na cadência real e
// FALHA se cair abaixo de metade do pool, avisando quem mexer em temas/dia.
function indiceNoPool(topic, n, d) {
  return (hashStr(topic) + d) % n;
}

function pickFromPool(topic, pool) {
  // ⛔ A peneira das livres esvazia quase todo pool: dos 6 pilares, 4 ficaram com UMA faixa e dois
  // (anxiety, freedom) com nenhuma — as outras têm autor registrado (ver `podeIrAoAr`). Pool de uma
  // faixa devolve a MESMA música em todo tema do pilar, que é justamente o que o dono mandou acabar
  // em 26/07 ("não devem ficar repetindo música todo dia"). Então, quando o pilar não tem pelo menos
  // duas faixas livres, o pool passa a ser o acervo livre INTEIRO — a rotação por dia continua a
  // mesma, só que sobre 11 faixas em vez de 1.
  const doPilar = pool.filter(podeIrAoAr);
  const usar = doPilar.length >= 2 ? doPilar : [...livres()];
  const n = usar.length;
  if (!n) return null;
  const base = indiceNoPool(topic, n, diaCorrido());
  for (let i = 0; i < n; i++) {
    const file = usar[(base + i) % n];
    if (fs.existsSync(path.resolve(MUSIC_DIR, "..", file))) return file;
  }
  return null;
}

// Lista as faixas LEGADO (bed.* e bed-<n>.*), deduplicando por número (.wav > .mp3).
function listBeds() {
  let files;
  try {
    files = fs.readdirSync(MUSIC_DIR);
  } catch {
    return { numbered: [], base: null };
  }
  const byNum = new Map();
  let base = null;
  for (const f of files) {
    const m = RE.exec(f);
    if (!m) continue;
    const isWav = m[2].toLowerCase() === "wav";
    if (m[1] === undefined) {
      if (!base || isWav) base = f;
    } else {
      const n = Number(m[1]);
      const cur = byNum.get(n);
      if (!cur || isWav) byNum.set(n, f);
    }
  }
  const numbered = [...byNum.keys()].sort((a, b) => a - b).map((n) => byNum.get(n));
  return { numbered, base };
}

// Fallback legado: rotação por run entre as faixas numeradas / base.
function pickByRun(run) {
  const r = Number.isFinite(Number(run)) ? Math.abs(Math.trunc(Number(run))) : 0;
  const { numbered, base } = listBeds();
  const todas = numbered.length ? numbered : base ? [base] : [];
  const pool = todas.filter(podeIrAoAr);
  if (!pool.length) return "";
  return `music/${pool[r % pool.length]}`;
}

// Escolhe a trilha. Aceita:
//   • objeto { topic, run }  → tenta tema (manifest); senão run
//   • string                 → tratada como topic
//   • número                 → legado por run
function pickMusic(input) {
  let topic = null;
  let run = 0;
  if (input && typeof input === "object") {
    topic = input.topic != null ? String(input.topic) : null;
    run = input.run;
  } else if (typeof input === "string" && !/^\d+$/.test(input)) {
    topic = input;
  } else {
    run = input;
  }

  if (topic) {
    // 1º: pool do pilar girando por dia (nenhuma faixa fica encalhada, nem repete cedo)
    const pool = readPools()[topic];
    if (Array.isArray(pool)) {
      const girada = pickFromPool(topic, pool);
      if (girada) return girada;
    }
    // 2º: faixa âncora do manifest (comportamento antigo — vale se pools.json faltar)
    const file = readManifest()[topic];
    if (podeIrAoAr(file) && fs.existsSync(path.resolve(MUSIC_DIR, "..", file))) return file;
  }
  return pickByRun(run);
}

module.exports = { pickMusic, listBeds, readManifest, readPools, pickFromPool, hashStr, podeIrAoAr, livres };

// CLI: imprime o caminho (ou linha vazia).
if (require.main === module) {
  const argv = process.argv.slice(2);
  const get = (name) => {
    const a = argv.find((x) => x.startsWith(`--${name}=`));
    return a ? a.slice(name.length + 3) : undefined;
  };
  const topic = get("topic");
  const run = get("run") ?? process.env.RUN ?? "0";
  process.stdout.write(pickMusic(topic != null ? { topic, run } : run));
}
