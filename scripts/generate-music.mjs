// ─── Geração das trilhas do Reel (rotação) via fal cassetteai/music-generator ──
// Gera N faixas instrumentais SÓBRIAS/atmosféricas (tom da marca: literário, calmo)
// e grava em public/music/bed-<i>.mp3. O pipeline (pick-music.cjs) rotaciona por
// `run` entre elas — variando o áudio entre os posts do dia.
//
// CAMADA: criação, AUTHOR-TIME (NÃO roda no CI). Roda UMA vez, committa os mp3.
// Custo: ~US$0,05/faixa na fal (uma vez). CI usa os arquivos commitados (zero custo).
//
// Uso:  FAL_KEY=... node scripts/generate-music.mjs            (6 faixas, ~28s)
//       FAL_KEY=... node scripts/generate-music.mjs --only=2   (regenera só a bed-2)
//
// Requer ffmpeg no PATH (transcodifica o wav da fal p/ mp3 leve no repo público).

import { writeFileSync, mkdirSync, existsSync, statSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error("[music] FAL_KEY ausente — abortando (geração é paga).");
  process.exit(1);
}

// cassetteai/music-generator: rápido e fila livre (stable-audio vivia congestionado).
const MODEL = "cassetteai/music-generator";
const arg = (name, def) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : def;
};
const SECS = Math.max(20, Number(arg("secs", "28")) || 28);
const ONLY = arg("only", null); // índice único p/ regenerar

// 6 moods distintos mas coerentes com a marca (instrumental, sem vocais, calmo).
const PROMPTS = [
  "warm minimal solo piano with soft ambient pads, contemplative and slow, no drums, no vocals, cinematic, intimate, literary mood",
  "mellow lo-fi instrumental, gentle Rhodes electric piano, soft tape hiss, introspective, downtempo, no vocals, calm",
  "soft cinematic strings with airy synth pads, reflective and spacious, slow gentle swell, no percussion, no vocals, calm",
  "intimate fingerpicked acoustic guitar, warm and minimal, slow, thoughtful, no vocals, quiet room ambience",
  "ambient analog drone with warm evolving pads, meditative and atmospheric, no beat, no vocals, deep calm",
  "gentle downtempo electronic, soft muted arpeggio, hopeful and warm, sparse, no vocals, calm focus",
];

const OUT_DIR = resolve(process.cwd(), "public", "music");
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const AUTH = { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Geração de áudio é lenta → endpoint síncrono (fal.run) estoura o gateway. Usa a
// FILA: submete, pollra o status e busca o resultado. Submeter tudo de uma vez deixa
// as esperas de fila se sobreporem.
async function falSubmit(prompt) {
  const res = await fetch(`https://queue.fal.run/${MODEL}`, {
    method: "POST",
    headers: AUTH,
    body: JSON.stringify({ prompt, duration: SECS }),
  });
  if (!res.ok) throw new Error(`submit HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  if (!j.status_url || !j.response_url) throw new Error(`submit sem urls: ${JSON.stringify(j).slice(0, 200)}`);
  return { statusUrl: j.status_url, responseUrl: j.response_url };
}

async function falResult({ statusUrl, responseUrl }, timeoutMs = 12 * 60 * 1000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(5000);
    const st = await fetch(statusUrl, { headers: AUTH }).then((r) => r.json()).catch(() => ({}));
    if (st.status === "COMPLETED") break;
    if (st.status === "FAILED" || st.status === "ERROR") throw new Error(`fal status ${st.status}`);
  }
  const data = await fetch(responseUrl, { headers: AUTH }).then((r) => r.json());
  const url = data?.audio_file?.url || data?.audio?.url || data?.url;
  if (!url) throw new Error(`resultado sem URL: ${JSON.stringify(data).slice(0, 200)}`);
  return url;
}

async function download(url, path) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(path, buf);
  return buf.length;
}

async function main() {
  const indices = ONLY != null ? [Number(ONLY)] : PROMPTS.map((_, i) => i);
  console.log(`[music] submetendo ${indices.length} faixa(s) de ${SECS}s na fila (${MODEL})`);

  // 1. Submete TUDO de uma vez — as esperas de fila se sobrepõem.
  const jobs = await Promise.all(
    indices.map(async (i) => {
      try {
        const handle = await falSubmit(PROMPTS[i]);
        console.log(`[music] [${i}] enfileirada`);
        return { i, handle };
      } catch (e) {
        console.error(`[music] [${i}] submit FALHOU: ${e?.message || e}`);
        return { i, handle: null };
      }
    })
  );

  // 2. Aguarda o resultado, baixa e transcodifica cada faixa.
  let ok = 0;
  for (const { i, handle } of jobs) {
    if (!handle) continue;
    const tmpWav = resolve(OUT_DIR, `.bed-${i}.tmp.wav`);
    const outMp3 = resolve(OUT_DIR, `bed-${i}.mp3`);
    try {
      const url = await falResult(handle);
      const bytes = await download(url, tmpWav);
      // Transcodifica p/ mp3 (leve) + normaliza loudness (consistência entre faixas).
      execFileSync("ffmpeg", ["-y", "-i", tmpWav, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-b:a", "128k", outMp3], { stdio: "ignore" });
      rmSync(tmpWav, { force: true });
      const kb = Math.round(statSync(outMp3).size / 1024);
      console.log(`[music] [${i}] ok → public/music/bed-${i}.mp3 (${kb} KB; wav fonte ${Math.round(bytes / 1024)} KB)`);
      ok++;
    } catch (e) {
      rmSync(tmpWav, { force: true });
      console.error(`[music] [${i}] FALHOU: ${e?.message || e}`);
    }
  }
  console.log(`[music] concluído: ${ok}/${indices.length} faixa(s). Teste: node scripts/pick-music.cjs --run=2`);
}

main();
