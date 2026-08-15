#!/usr/bin/env node
// ─── Loop de correção da TRAVA DE PEÇA PRONTA (ordem do dono 15/08) ──────────
// "o trabalho deve ser 100% efetivado, se faltar algo ele tem que corrigir,
// tem que criar um looping em cada uma das travas… está conferido 100% siga a
// proxima etapa, não está volte e refaça, até finalir."
//
// O teste real de 15/08 pegou `faltou: imagens` e o motor pulou a vaga (fail-
// closed passivo). O dono reprovou: o motor deve CORRIGIR o que falta e só
// publicar quando os 4 componentes (texto + áudio + imagens + vídeo) estiverem
// 100%. Este script é a entrada do CI: chama `corrigirAtePronto` (mesmo módulo
// da trava, `reel-media.cjs`) com o corretor REAL que:
//   · vídeo    → re-roda fetch-footage (Pexels+Pixabay, GRÁTIS) e relê os clips;
//   · imagens  → re-obtém o preview com `illus=1` (ilustração da fal, ~US$0,03–0,08,
//                DENTRO do teto ig-reels — autorização = teto ativo + ordem de corrigir);
//   · áudio/texto → re-obtém o preview (cache content_cache/narration_cache →
//                não re-paga o que já existe, só completa o que faltou).
// E RE-VERIFICA em loop até 100% (teto de 3 tentativas) ou sem progresso.
// Só então `pronto=1` e os passos render/upload/publicar seguem.
// Fail-closed no fim: `pronto=0` (o catchup redispara a vaga), exit 0 sempre.

import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { corrigirAtePronto } = require("./reel-media.cjs");

const BASE = process.env.PRODUCTION_URL || "https://www.drlibertad.com";
const CRON_SECRET = process.env.CRON_SECRET;
const RUN = process.env.RUN || "2";
const LANGQS = process.env.LANGQS || ""; // "" (ES) ou "&lang=br" (BR)
const PROPS_PATH = process.env.PROPS_PATH || "reel-props.json";
const CAPTION_PATH = process.env.CAPTION_PATH || "caption.txt";

function leProps() {
  return JSON.parse(readFileSync(PROPS_PATH, "utf8"));
}
function gravaProps(props, caption) {
  writeFileSync(PROPS_PATH, JSON.stringify(props));
  writeFileSync(CAPTION_PATH, caption);
}

async function reobterPreview(comIlus) {
  const url = `${BASE}/api/publish?preview=1${comIlus ? "&illus=1" : ""}${LANGQS}&run=${RUN}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
    signal: AbortSignal.timeout(480_000), // mesmo teto do preview principal (a voz é o trecho lento)
  });
  if (res.status === 402) {
    console.log("[corrigir-reel] 402 — teto de gasto estourado. Correção de imagem impossível hoje.");
    return null;
  }
  if (res.status !== 200) {
    console.log(`[corrigir-reel] preview falhou com HTTP ${res.status} — correção não aplicada.`);
    return null;
  }
  return res.json();
}

// Corretor real: dado o que FALTA, busca/gera o componente e devolve o estado novo.
// Grava no disco a cada passada (o loop e a re-verificação leem o estado real).
async function corrigir(faltando, props, caption) {
  let novosProps = { ...props };
  let novoCaption = caption;
  let mudou = false;

  // ── VÍDEO: re-busca footage (grátis). Já roda no passo 5b; aqui é a 2ª chance.
  if (faltando.includes("vídeo")) {
    console.log("[corrigir-reel] faltou VÍDEO — re-buscando footage (Pexels+Pixabay, grátis)…");
    const r = spawnSync(process.execPath, ["scripts/fetch-footage.mjs", `--props=${PROPS_PATH}`], {
      stdio: "inherit",
      env: process.env,
    });
    if (r.status === 0) {
      try { novosProps = leProps(); mudou = true; } catch {}
    }
  }

  // ── IMAGENS / ÁUDIO / TEXTO: re-obtém o preview. `illus=1` SÓ quando falta
  //    imagens (gera a ilustração na fal, custo pequeno dentro do teto); texto/
  //    áudio vêm do preview normal (cache → não re-paga).
  const precisaImagem = faltando.includes("imagens");
  const precisaAudioOuTexto = faltando.includes("áudio") || faltando.some((f) => f.startsWith("texto"));
  if (precisaImagem || precisaAudioOuTexto) {
    console.log(`[corrigir-reel] faltou ${faltando.join(", ")} — re-obtendo preview${precisaImagem ? " com ilustração (illus=1, fal)" : ""}…`);
    const data = await reobterPreview(precisaImagem);
    if (data) {
      if (precisaImagem && data.illustration) { novosProps.img = data.illustration; mudou = true; }
      if (precisaAudioOuTexto || precisaImagem) {
        if (data.title) { novosProps.title = data.title; mudou = true; }
        if (Array.isArray(data.slides) && data.slides.length) { novosProps.slides = data.slides; mudou = true; }
        if (data.caption) { novoCaption = data.caption; mudou = true; }
        if (data.narrationUrl) {
          novosProps.narrationUrl = data.narrationUrl;
          if (data.narrationDurationSec) novosProps.narrationDurationSec = data.narrationDurationSec;
          if (Array.isArray(data.narrationWords) && data.narrationWords.length) novosProps.narrationWords = data.narrationWords;
          if (Array.isArray(data.narrationSegments) && data.narrationSegments.length) novosProps.narrationSegments = data.narrationSegments;
          mudou = true;
        }
      }
    }
  }

  if (!mudou) {
    console.log("[corrigir-reel] corretor não encontrou o componente ausente — sem progresso.");
    return null;
  }
  gravaProps(novosProps, novoCaption);
  return { props: novosProps, caption: novoCaption };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const props = leProps();
  const caption = readFileSync(CAPTION_PATH, "utf8");
  const res = await corrigirAtePronto(props, caption, corrigir, 3);
  gravaProps(res.props, res.caption);

  for (const l of res.log) console.log(`[corrigir-reel] ${l}`);

  const linha = res.ok
    ? `Reel 100% pronto após ${res.tentativas} correção(ões): texto + áudio + imagens + vídeo presentes.`
    : `Reel INCOMPLETO após ${res.tentativas} correção(ões): faltou ${res.faltando.join(", ")} — não publicado (catchup redispara a vaga).`;
  console.log(`[corrigir-reel] ${linha}`);
  if (res.ok) console.log("::notice title=Reel pronto (após correção)::" + linha);
  else console.log("::warning title=Reel incompleto após correção::" + linha);

  const out = process.env.GITHUB_OUTPUT;
  if (out) appendFileSync(out, `pronto=${res.ok ? "1" : "0"}\n`);
  process.exit(0); // o GITHUB_OUTPUT decide; nunca derruba a rodada
}

main().catch((e) => {
  console.error("[corrigir-reel] erro:", e);
  const out = process.env.GITHUB_OUTPUT;
  if (out) appendFileSync(out, "pronto=0\n");
  process.exit(0);
});
