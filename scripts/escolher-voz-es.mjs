// ─── ESCOLHER A VOZ DO ES — o dono decide OUVINDO (1 comando) ─────────────────
// Espelha o que resolveu o BR em 2026-07-27: gera a MESMA frase com N vozes
// candidatas e monta uma página com os áudios EMBUTIDOS, para o dono comparar no
// ouvido. Mandar mp3 solto não funciona — clicar no arquivo só mostra o caminho.
//
// POR QUE O ES PRECISA DISSO (prova, não impressão):
//   27/07  a voz lia "público" como "publisher" (anglicizado) → PR #133
//   28/07  um Reel ES saiu falando INGLÊS → guarda de idioma, PR #197
//   29/07  sotaque estrangeiro em "LIBERTAD" e "Direct"; o dono: "a voz espanhola
//          está embolando" → o fecho falado foi REMOVIDO do ES (PR #198)
// Os três têm a mesma raiz: `Deep_Voice_Man` (MiniMax) NÃO é voz nativa de
// espanhol — o `language_boost:"Spanish"` só sugere o idioma, não o impõe nem
// troca o sotaque de origem. O BR saiu desse buraco trocando de provedor
// (ElevenLabs multilingual-v2, que aceita `language_code` e FORÇA o idioma).
//
// ⚠️ GASTO (P2): 1 chamada de TTS por candidata. O script imprime a conta e PARA
//    sem `--confirmar-gasto`. O gate da casa também exige autorização registrada.
//
// Uso:
//   node scripts/escolher-voz-es.mjs                    → só mostra a conta
//   node scripts/escolher-voz-es.mjs --confirmar-gasto  → gera e monta a página
//
// Saída: out/escolher-voz-es.html (áudios embutidos) + out/voz-es-<n>-<nome>.mp3

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "out");
const TTS_11LABS = "fal-ai/elevenlabs/tts/multilingual-v2";
const TTS_MINIMAX = "fal-ai/minimax/speech-02-hd";
const COST_TTS_PER_1K = 0.10; // US$/1000 caracteres (igual nos dois provedores)

// FRASE DE TESTE — conteúdo REAL da linha editorial, carregado com o que a voz
// atual erra: "LIBERTAD" e "Direct" (as duas que ele ouviu tropeçar em 29/07),
// "público" (a de 27/07) e os sons que denunciam sotaque estrangeiro no espanhol:
// rr (perro/verdad), ll (elige/aplauso), ñ (mañana), c/z de "veces".
const FRASE = [
  "La libertad empieza donde acaba el miedo.",
  "En público nadie elige quedarse: acepta el default mil veces, y mañana repite.",
  "Comenta LIBERTAD y te lo mando al Direct.",
  "Sígueme si prefieres la verdad incómoda al aplauso.",
].join(" ");

// CANDIDATAS — vozes MASCULINAS GRAVES gravadas por falantes NATIVOS de espanhol
// (o critério que a atual não cumpre). Os voice_id vêm do catálogo público do
// ElevenLabs Voice Library.
// ⚠️ LIMITE CONHECIDO: não está verificado que a conta ElevenLabs por trás do fal
// enxerga toda voz compartilhada da biblioteca. Candidata indisponível volta erro
// da fal — o script segue com as outras e escreve o motivo na página, em vez de
// abortar tudo (uma candidata a menos não pode custar a rodada inteira).
const CANDIDATAS = [
  { nome: "Atual (Deep_Voice_Man)", provedor: "minimax", voz: "Deep_Voice_Man", speed: 0.85,
    nota: "A voz de hoje — está aqui só como referência de comparação. NÃO é nativa." },
  { nome: "Carlos", provedor: "elevenlabs", voz: "4FMxnogu8ehUVsRIxx9H",
    nota: "Castelhano, quente e grave — descrito para podcast." },
  { nome: "Zabra", provedor: "elevenlabs", voz: "G6LT3kjUUW86fQaWfBaj",
    nota: "Grave, timbre ressonante, perfil narrativo sério." },
  { nome: "Ludovico", provedor: "elevenlabs", voz: "GTY55jD77hLBRrnQOhNk",
    nota: "Latino-americano, grave e aveludado." },
  { nome: "Brian", provedor: "elevenlabs", voz: "DGhxgogT0bhXlRToPzFs",
    nota: "Espanhol latino-americano, grave e ressonante." },
  { nome: "Salvatore", provedor: "elevenlabs", voz: "t3eeeqhBjrUqcrPvDqUn",
    nota: "Grave e épico, feito para contar história." },
  { nome: "Agustín", provedor: "elevenlabs", voz: "HbJt0yomFFBFMBQ7I69w",
    nota: "Argentino, quente e grave, tom profissional." },
];

// Parâmetros do ElevenLabs: os MESMOS que o dono aprovou no BR (speed 0.95,
// stability .45, similarity .8, style .1) — assim a comparação isola a VOZ, que é
// o que se está escolhendo, e não o ajuste. `language_code:"es"` é o que FORÇA o
// idioma (o remédio que faltava no ES).
const PARAMS_11 = { speed: 0.95, stability: 0.45, similarity_boost: 0.8, style: 0.1 };

const has = (n) => process.argv.includes(`--${n}`);

function carregarEnv() {
  const p = resolve(ROOT, ".env.local");
  if (!existsSync(p)) return;
  for (const linha of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

function conta() {
  const porAmostra = (FRASE.length / 1000) * COST_TTS_PER_1K;
  const total = porAmostra * CANDIDATAS.length;
  console.log(`Frase: ${FRASE.length} caracteres`);
  console.log(`Candidatas: ${CANDIDATAS.length} × US$${porAmostra.toFixed(4)} = US$${total.toFixed(3)}`);
  return total;
}

async function gerar(c) {
  const modelo = c.provedor === "elevenlabs" ? TTS_11LABS : TTS_MINIMAX;
  const corpo = c.provedor === "elevenlabs"
    ? { text: FRASE, voice: c.voz, language_code: "es", timestamps: true, ...PARAMS_11 }
    : {
        text: FRASE,
        voice_setting: { voice_id: c.voz, speed: c.speed ?? 0.85, vol: 1, pitch: 0 },
        language_boost: "Spanish",
        english_normalization: false,
        audio_setting: { sample_rate: 44100, bitrate: 256000, format: "mp3" },
      };
  const res = await fetch(`https://fal.run/${modelo}`, {
    method: "POST",
    headers: { Authorization: `Key ${process.env.FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 180)}`);
  const d = await res.json();
  const url = d?.audio?.url;
  if (!url) throw new Error(`sem audio.url: ${JSON.stringify(d).slice(0, 180)}`);
  const mp3 = Buffer.from(await (await fetch(url)).arrayBuffer());
  return { url, mp3 };
}

function pagina(itens) {
  const cartoes = itens.map((it, i) => {
    if (it.erro) {
      return `<article class="c erro"><h2>${i + 1}. ${it.nome}</h2>
        <p class="n">${it.nota}</p>
        <p class="e">Não deu para gerar esta amostra: ${it.erro}</p></article>`;
    }
    return `<article class="c"><h2>${i + 1}. ${it.nome}</h2>
      <p class="n">${it.nota}</p>
      <audio controls preload="none" src="data:audio/mpeg;base64,${it.b64}"></audio></article>`;
  }).join("\n");
  return `<meta charset="utf-8"><title>Qual voz vai narrar em espanhol?</title>
<style>
 body{font:16px/1.6 system-ui,sans-serif;max-width:760px;margin:32px auto;padding:0 18px;color:#111}
 h1{font-size:26px;margin:0 0 6px} .sub{color:#555;margin:0 0 26px}
 blockquote{background:#f6f6f6;border-left:4px solid #999;margin:0 0 26px;padding:12px 16px;font-style:italic}
 .c{border:1px solid #ddd;border-radius:10px;padding:14px 16px;margin:0 0 14px}
 .c h2{font-size:18px;margin:0 0 4px} .n{color:#555;margin:0 0 10px;font-size:14px}
 .erro{opacity:.65} .e{color:#a00;font-size:14px;margin:0}
 audio{width:100%}
 footer{margin-top:28px;color:#555;font-size:14px;border-top:1px solid #ddd;padding-top:14px}
</style>
<h1>Qual voz vai narrar em espanhol?</h1>
<p class="sub">Todas dizem a MESMA frase, com as palavras em que a voz de hoje tropeça.</p>
<blockquote>${FRASE}</blockquote>
${cartoes}
<footer>A nº 1 é a voz de hoje, só para comparar. As outras são vozes de gente que
fala espanhol de nascença. Responda com o número da que você quiser — eu troco e
o próximo Reel já sai com ela.</footer>`;
}

async function main() {
  carregarEnv();
  const total = conta();
  if (!has("confirmar-gasto")) {
    console.log("\nNada foi gerado (nenhum centavo gasto).");
    console.log("Para gerar: node scripts/escolher-voz-es.mjs --confirmar-gasto");
    return;
  }
  if (!process.env.FAL_KEY) { console.error("FAL_KEY ausente"); process.exit(1); }
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  const itens = [];
  for (const [i, c] of CANDIDATAS.entries()) {
    process.stdout.write(`[${i + 1}/${CANDIDATAS.length}] ${c.nome} … `);
    try {
      const { mp3 } = await gerar(c);
      const arq = resolve(OUT, `voz-es-${i + 1}-${c.nome.replace(/[^\w]+/g, "-").toLowerCase()}.mp3`);
      writeFileSync(arq, mp3);
      itens.push({ ...c, b64: mp3.toString("base64") });
      console.log(`ok (${(mp3.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      itens.push({ ...c, erro: e instanceof Error ? e.message : String(e) });
      console.log(`FALHOU — ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const html = resolve(OUT, "escolher-voz-es.html");
  writeFileSync(html, pagina(itens), "utf8");
  const ok = itens.filter((x) => !x.erro).length;
  console.log(`\nPágina pronta: ${html}`);
  console.log(`Amostras geradas: ${ok}/${CANDIDATAS.length} · gasto real ≈ US$${((total / CANDIDATAS.length) * ok).toFixed(3)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
