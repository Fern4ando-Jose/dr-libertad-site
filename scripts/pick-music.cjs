// ─── Seleção da trilha do Reel — rotação por `run` ────────────────────────────
// Por quê: havia UMA só faixa (bed.wav) → TODOS os Reels saíam com o mesmo áudio.
// Agora, se houver faixas NUMERADAS em public/music/ (bed-0.wav, bed-1.wav, …),
// cada `run` pega uma distinta (run % nº de faixas) — variando o áudio entre os
// posts do dia. Sem faixas numeradas, usa a bed.wav/bed.mp3 única: comportamento
// IDÊNTICO ao de antes (não quebra a automação; trilha continua opcional).
//
// Camada: CRIAÇÃO (não automação). Faixas são royalty-free OU próprias; ver
// public/music/README.md. O `run` define o tópico do post (0..5), então a mesma
// faixa sai sempre no mesmo slot — consistência por horário, variedade no dia.
//
// Uso CLI:  node scripts/pick-music.cjs --run=2   → imprime "music/bed-2.wav" (ou vazio)
// Uso lib:  require("./scripts/pick-music.cjs").pickMusic(2)  → "music/bed-2.wav" | ""

const fs = require("node:fs");
const path = require("node:path");

const MUSIC_DIR = path.resolve(__dirname, "..", "public", "music");
// bed.wav / bed.mp3 (base, sem número) e bed-<n>.wav / bed-<n>.mp3 (numeradas).
const RE = /^bed(?:-(\d+))?\.(wav|mp3)$/i;

// Lista as faixas válidas, deduplicando por número (preferindo .wav a .mp3).
function listBeds() {
  let files;
  try {
    files = fs.readdirSync(MUSIC_DIR);
  } catch {
    return { numbered: [], base: null };
  }
  const byNum = new Map(); // n -> filename
  let base = null; // bed.wav|mp3 sem número
  for (const f of files) {
    const m = RE.exec(f);
    if (!m) continue;
    const isWav = m[2].toLowerCase() === "wav";
    if (m[1] === undefined) {
      // prefere .wav se também houver .mp3
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

// Devolve o caminho staticFile (ex.: "music/bed-2.wav") ou "" se não houver trilha.
function pickMusic(run) {
  const r = Number.isFinite(Number(run)) ? Math.abs(Math.trunc(Number(run))) : 0;
  const { numbered, base } = listBeds();
  const pool = numbered.length ? numbered : base ? [base] : [];
  if (!pool.length) return "";
  const file = pool[r % pool.length];
  return `music/${file}`;
}

module.exports = { pickMusic, listBeds };

// Execução como CLI: imprime o caminho (ou linha vazia).
if (require.main === module) {
  const arg = process.argv.find((a) => a.startsWith("--run="));
  const run = arg ? arg.slice("--run=".length) : process.env.RUN || "0";
  process.stdout.write(pickMusic(run));
}
