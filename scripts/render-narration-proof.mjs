// ─── PROVA da narração sincronizada (1 comando, PT + ES) ──────────────────────
// Gera o Reel de prova que o dono ouve pra aprovar a sincronia: voz REAL (MiniMax
// Deep_Voice_Man, a que ele já aprovou) + legenda travada no tempo de cada palavra
// + vídeo dimensionado pela fala.
//
// POR QUE ESTE SCRIPT EXISTE: a prova precisa da voz de verdade, e voz custa. Em vez
// de deixar o passo manual espalhado, ele é UM comando — no minuto em que o dono
// autorizar o gasto, a prova sai sem ninguém reconstruir nada.
//
// ⚠️ GASTO (P2): chama a fal DUAS vezes por idioma (TTS + transcrição).
//    ~US$0,042 por idioma → ~US$0,09 nos dois. Por isso NÃO roda sem `--confirmar-gasto`:
//    o script imprime a conta e para, esperando a autorização explícita.
//
// Uso:
//   FAL_KEY=... node scripts/render-narration-proof.mjs            → só mostra a conta
//   FAL_KEY=... node scripts/render-narration-proof.mjs --confirmar-gasto
//   ... --lang=pt        → só um idioma
//   ... --sem-render     → gera só o áudio + os props (pula o Remotion)
//
// Saída: out/reel-prova-<lang>.mp4 e out/prova-props-<lang>.json

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "out");

const TTS_MODEL = "fal-ai/minimax/speech-02-hd";
const STT_MODEL = "fal-ai/elevenlabs/speech-to-text";
const VOICE_ID = "Deep_Voice_Man"; // aprovado pelo dono — NÃO trocar
const SPEED_NATURAL = 0.85;        // velocidade natural fixa (o vídeo é que se ajusta)
const COST_TTS_PER_1K = 0.10;
const COST_STT_PER_MIN = 0.03;

// Conteúdo REAL da linha editorial (não inventa tema novo: a prova é da SINCRONIA,
// não da copy). Mesmo tema nos dois idiomas → dá pra comparar ES × PT lado a lado,
// que é onde a dessincronia aparecia primeiro (PT é mais verboso).
const CONTEUDO = {
  es: {
    title: "La libertad empieza donde acaba el miedo",
    slides: [
      // "esperas a controlar" estava ERRADO (a estrategista-de-atencao pegou, 2026-07-26):
      // em espanhol `esperar a` + infinitivo = "aguardar até". O sentido é "que esperas
      // controlar", sem o `a`. Só afetava este roteiro de PROVA — o conteúdo de produção
      // é gerado fresco a cada Reel, não sai daqui.
      "El miedo no es una emoción que esperas controlar",
      "Cada día eliges entre vivir y estar seguro",
    ],
    cta: "¿Qué es lo que más te roba la atención hoy?",
    follow: "Sígueme si prefieres la verdad incómoda al aplauso.",
    handle: "@dr.liberdad", brand: "Dr. Libertad",
    ctaFollow: "Sigue", ctaBio: "→ Más en el link de la bio",
  },
  pt: {
    title: "A liberdade começa onde acaba o medo",
    slides: [
      "O medo não é uma emoção que você espera controlar",
      "Todo dia você escolhe entre viver e estar seguro",
    ],
    cta: "O que mais rouba a sua atenção hoje?",
    follow: "Me siga se você prefere a verdade incômoda ao aplauso.",
    handle: "@dr.liberdade.br", brand: "Dr. Liberdade",
    ctaFollow: "Siga", ctaBio: "→ Mais no link da bio",
  },
};

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const has = (name) => process.argv.includes(`--${name}`);

const langs = arg("lang") ? [arg("lang")] : ["es", "pt"];
const FAL_KEY = process.env.FAL_KEY;

function segmentosDe(c) {
  // MESMA montagem da API (src/app/api/publish/route.ts): blocos na ordem falada,
  // com ponto final. É esta lista que o render usa pra saber onde cada cena começa.
  return [c.title, ...c.slides]
    .map((s) => s.trim())
    .map((s) => (/[.!?]$/.test(s) ? s : s + "."))
    .concat(c.follow);
}

function estimativa() {
  let total = 0;
  for (const lang of langs) {
    const texto = segmentosDe(CONTEUDO[lang]).join(" ");
    const tts = (texto.length / 1000) * COST_TTS_PER_1K;
    const segundos = texto.length / 11.6; // ritmo medido da voz a 0,85
    const stt = (segundos / 60) * COST_STT_PER_MIN;
    total += tts + stt;
    console.log(
      `  ${lang.toUpperCase()}: ${texto.length} caracteres → voz US$${tts.toFixed(3)} + ` +
      `transcrição US$${stt.toFixed(3)} = US$${(tts + stt).toFixed(3)} (~${segundos.toFixed(0)}s de áudio)`,
    );
  }
  return total;
}

async function gerarVoz(lang, texto) {
  const res = await fetch(`https://fal.run/${TTS_MODEL}`, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: texto,
      voice_setting: { voice_id: VOICE_ID, speed: SPEED_NATURAL, vol: 1, pitch: 0 },
      language_boost: lang === "pt" ? "Portuguese" : "Spanish",
      english_normalization: false,
      audio_setting: { sample_rate: 44100, bitrate: 256000, format: "mp3" },
    }),
  });
  if (!res.ok) throw new Error(`TTS HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const d = await res.json();
  const url = d?.audio?.url;
  if (!url) throw new Error(`TTS sem audio.url: ${JSON.stringify(d).slice(0, 200)}`);
  return { url, durationSec: Number(d?.duration_ms ?? 0) / 1000 };
}

async function transcrever(lang, audioUrl) {
  const res = await fetch(`https://fal.run/${STT_MODEL}`, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      audio_url: audioUrl,
      language_code: lang === "pt" ? "por" : "spa",
      tag_audio_events: false,
      diarize: false,
    }),
  });
  if (!res.ok) {
    console.error(`  [aviso] transcrição HTTP ${res.status} — segue sem legenda palavra a palavra`);
    return [];
  }
  const d = await res.json();
  return (Array.isArray(d?.words) ? d.words : [])
    .filter((w) => String(w?.type ?? "word") === "word")
    .map((w) => ({ text: String(w?.text ?? "").trim(), start: Number(w?.start ?? 0), end: Number(w?.end ?? 0) }))
    .filter((w) => w.text && Number.isFinite(w.start) && Number.isFinite(w.end));
}

async function main() {
  console.log("─── PROVA da narração sincronizada ───");
  console.log("Voz:", VOICE_ID, `(velocidade natural fixa ${SPEED_NATURAL} — o vídeo é que se ajusta)`);
  console.log("Custo estimado:");
  const total = estimativa();
  console.log(`  TOTAL: ~US$${total.toFixed(3)}\n`);

  if (!has("confirmar-gasto")) {
    console.log("PAROU AQUI (P2): rode de novo com --confirmar-gasto quando o dono autorizar.");
    process.exit(0);
  }
  if (!FAL_KEY) throw new Error("FAL_KEY ausente no ambiente (cofre .claude/chaves)");

  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  for (const lang of langs) {
    const c = CONTEUDO[lang];
    const segments = segmentosDe(c);
    const texto = segments.join(" ");
    console.log(`\n[${lang}] gerando voz…`);
    const voz = await gerarVoz(lang, texto);
    console.log(`[${lang}] voz pronta: ${voz.durationSec.toFixed(2)}s (duração MEDIDA, não estimada)`);

    console.log(`[${lang}] medindo o tempo de cada palavra…`);
    const words = await transcrever(lang, voz.url);
    console.log(`[${lang}] ${words.length} palavras com tempo próprio`);

    const props = {
      title: c.title,
      slides: c.slides,
      accentWords: [],
      cta: c.cta,
      kw: lang === "pt" ? "LIBERDADE" : "LIBERTAD",
      ed: "PROVA",
      cat: "freedom",
      handle: c.handle,
      brand: c.brand,
      ctaFollow: c.ctaFollow,
      ctaBio: c.ctaBio,
      videoQueries: [],
      narrationUrl: voz.url,
      narrationDurationSec: voz.durationSec,
      narrationWords: words,
      narrationSegments: segments,
    };
    const propsPath = resolve(OUT, `prova-props-${lang}.json`);
    writeFileSync(propsPath, JSON.stringify(props));

    // Footage real (Pexels/Pixabay — grátis). Sem chave, o Reel ainda renderiza
    // com o fundo de fallback; a prova é da SINCRONIA, não do footage.
    try {
      execFileSync("node", [resolve(ROOT, "scripts/fetch-footage.mjs"), `--props=${propsPath}`], {
        cwd: ROOT, stdio: "inherit", env: process.env,
      });
    } catch { console.error(`[${lang}] footage indisponível — segue com o fundo de fallback`); }

    if (has("sem-render")) { console.log(`[${lang}] props em ${propsPath} (render pulado)`); continue; }

    console.log(`[${lang}] renderizando…`);
    execFileSync("node", [resolve(ROOT, "scripts/render-reel.mjs"), `--props=${propsPath}`, "--composition=ReelV2"], {
      cwd: ROOT, stdio: "inherit", env: process.env,
    });
    const destino = resolve(OUT, `reel-prova-${lang}.mp4`);
    writeFileSync(destino, readFileSync(resolve(OUT, "reel.mp4")));
    console.log(`[${lang}] PRONTO → ${destino}`);
  }
  console.log("\nProva gerada. Entregue os mp4 ao dono pelo SendUserFile (ele aprova OUVINDO).");
}

main().catch((e) => { console.error("[prova] erro:", e.message || e); process.exit(1); });
