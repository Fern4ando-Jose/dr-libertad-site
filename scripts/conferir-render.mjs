#!/usr/bin/env node
// ─── CONFERE A PEÇA PRONTA, NÃO OS CAMPOS DELA (18/08/2026) ──────────────────
//
// O dono viu o Reel BR de 18/08 no ar e reprovou: *"a voz está cortada, a legenda com
// caracteres"*. Os robôs estavam todos verdes — e estavam verdes com razão, porque
// **ninguém media a peça pronta**:
//
//   · `reelPronto` (a trava do "100%") pergunta se os CAMPOS existem. Um mp3 de
//     silêncio preenche `narrationUrl` e passa.
//   · o revisor final da nuvem olha a CAPA, e naquele run nem rodou (chegou sem capa).
//   · o revisor de voz da casa (.claude/lib/revisao/audio.mjs) nunca roda no Instagram:
//     a nuvem não enxerga `.claude/`.
//
// Aqui o alvo é o **arquivo que vai ao feed**. Medida, não opinião — ffmpeg lê o mp4 já
// renderizado e responde três coisas que o dono ouviu/viu com os próprios sentidos:
// a peça tem som? o som cobre a peça até o fim? o texto na tela usa caractere que a
// fonte desenha errado?
//
// O que dá para consertar sozinho (a tipografia) ele CONSERTA e devolve `recorrigir=1`
// para o workflow renderizar de novo. O que não dá, ele BARRA: sem publicação, a vaga
// continua aberta e o catchup a redispara — que é a regra da casa para peça imprestável.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { renderPublicavel, normalizarTipografia, SILENCIO_DB } = require("./reel-media.cjs");

const VIDEO = process.env.VIDEO_PATH || "out/reel.mp4";
const PROPS_PATH = process.env.PROPS_PATH || "reel-props.json";
const CAPTION_PATH = process.env.CAPTION_PATH || "caption.txt";

function ffprobe(args) {
  const r = spawnSync("ffprobe", args, { encoding: "utf8" });
  return r.status === 0 ? String(r.stdout || "").trim() : null;
}

/** Duração, presença de trilha e pico — o básico que prova que a peça soa. */
function sondar(video) {
  const dur = Number(ffprobe(["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video]));
  const tipos = ffprobe(["-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_type", "-of", "csv=p=0", video]);
  // `-v info`, não `error`: o volumedetect ESCREVE o resultado em nível info — com `-v error`
  // a medição some e o pico volta null, que é "não medi" fingindo de "medi e está bom".
  const vol = spawnSync("ffmpeg", ["-v", "info", "-i", video, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  const saida = String(vol.stderr || "") + String(vol.stdout || "");
  const pico = saida.match(/max_volume:\s*(-?[\d.]+) dB/);
  return {
    duracaoS: Number.isFinite(dur) ? dur : 0,
    temAudio: !!tipos,
    picoDb: pico ? Number(pico[1]) : null,
  };
}

/**
 * Quantos segundos de FIM estão mudos.
 *
 * Mede o nível em janelas de 0,25 s e caminha do fim para trás enquanto o nível estiver
 * abaixo do piso. É assim, e não pela duração da narração, porque o que importa é o que
 * SAI no arquivo: uma trilha que não entrou no render também deixa a peça muda, e o
 * campo `narrationDurationSec` continuaria dizendo que está tudo certo.
 */
function caudaMuda(video, duracaoS) {
  const r = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", video, "-af",
      "aresample=8000,asetnsamples=2000,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-",
      "-f", "null", "-"],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  const linhas = String(r.stdout || "").split(/\r?\n/);
  const niveis = [];
  let t = null;
  for (const l of linhas) {
    const mt = l.match(/pts_time:([\d.]+)/);
    if (mt) { t = Number(mt[1]); continue; }
    const mv = l.match(/RMS_level=(-?[\d.inf]+)/);
    if (mv && t !== null) {
      const v = Number(mv[1]);
      niveis.push({ t, db: Number.isFinite(v) ? v : -120 });
      t = null;
    }
  }
  if (niveis.length < 4) return null; // não medi — e quem não mediu não aprova nem reprova
  let i = niveis.length - 1;
  // A última janela costuma ser o corte do arquivo (−100 dB); ela conta, mas sozinha não
  // caracteriza cauda: o piso de 2,5 s é quem decide.
  while (i >= 0 && niveis[i].db <= SILENCIO_DB) i--;
  const fimDoSom = i >= 0 ? niveis[i].t : 0;
  return Math.max(0, Number((duracaoS - fimDoSom).toFixed(2)));
}

function saida(chave, valor) {
  if (process.env.GITHUB_OUTPUT) {
    try { writeFileSync(process.env.GITHUB_OUTPUT, `${chave}=${valor}\n`, { flag: "a" }); } catch {}
  }
  console.log(`[conferir-render] ${chave}=${valor}`);
}

function main() {
  if (!existsSync(VIDEO)) {
    console.log(`[conferir-render] não achei ${VIDEO} — nada a conferir.`);
    saida("render_ok", "0");
    saida("recorrigir", "0");
    return;
  }
  const props = JSON.parse(readFileSync(PROPS_PATH, "utf8"));
  const caption = existsSync(CAPTION_PATH) ? readFileSync(CAPTION_PATH, "utf8") : "";

  const m = sondar(VIDEO);
  const cauda = caudaMuda(VIDEO, m.duracaoS);
  const medida = { ...m, caudaMudaS: cauda };
  console.log(`[conferir-render] medido: ${m.duracaoS.toFixed(1)}s · trilha=${m.temAudio ? "sim" : "NÃO"} · pico=${m.picoDb} dB · fim mudo=${cauda === null ? "não medi" : cauda + "s"}`);

  const v = renderPublicavel(medida, { title: props.title, slides: props.slides, caption });

  if (v.ok) {
    console.log("[conferir-render] ✅ a peça pronta passou: tem som, o som cobre o fim, e o texto usa caractere que a fonte desenha.");
    saida("render_ok", "1");
    saida("recorrigir", "0");
    return;
  }

  for (const a of v.achados) console.log(`[conferir-render] ⛔ ${a}`);

  // Corrigível sem re-gerar conteúdo: troca o caractere e pede um render novo.
  if (v.corrigivelNoTexto && process.env.JA_CORRIGIU !== "1") {
    props.title = normalizarTipografia(props.title);
    if (Array.isArray(props.slides)) props.slides = props.slides.map(normalizarTipografia);
    if (typeof props.cta === "string") props.cta = normalizarTipografia(props.cta);
    writeFileSync(PROPS_PATH, JSON.stringify(props));
    writeFileSync(CAPTION_PATH, normalizarTipografia(caption));
    console.log("::warning title=Tipografia corrigida::As aspas que a fonte desenha como `<<` foram trocadas — a peça vai ser renderizada de novo.");
    saida("render_ok", "0");
    saida("recorrigir", "1");
    return;
  }

  console.log(`::error title=Peça reprovada na conferência do render::${v.achados.join(" · ")}`);
  saida("render_ok", "0");
  saida("recorrigir", "0");
}

main();
