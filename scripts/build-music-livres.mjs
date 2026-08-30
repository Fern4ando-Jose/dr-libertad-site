#!/usr/bin/env node
/**
 * build-music-livres.mjs — escreve `public/music/livres.json`: a lista das trilhas que podem ir ao
 * ar, ou seja, as que NÃO têm autor registrado na etiqueta do arquivo.
 *
 * ⛔ POR QUE EXISTE (30/08/2026, medido nas contas de TikTok). O TikTok vinha SILENCIANDO todas as
 * nossas publicações — aviso da própria plataforma, 9 vezes entre 06/08 e 30/08:
 *
 *     "Publicação silenciada devido a sons não autorizados. Para ativar o som, substitua todos os
 *      sons por um novo ou remova sons não autorizados e adicione novos."
 *
 * Resultado medido no perfil das duas contas: **82 dos 84 vídeos com ZERO visualização**; os dois
 * únicos com alcance (180 e 119 views) são anteriores ao primeiro aviso. E como a narração e a
 * música vão no MESMO canal de áudio ("a música vira leito suave quando há voz",
 * instagram-reels.yml), silenciar não tira só a trilha: mata a peça inteira.
 *
 * A CAUSA: 132 das 143 faixas deste acervo têm autor na etiqueta — 82 obras de Kevin MacLeod
 * (CC BY 4.0) e uma de JR Tundra. **"Livre para usar com crédito" não é "livre de reconhecimento":**
 * essas obras estão catalogadas no banco de identificação de áudio do TikTok. A licença permite o
 * uso; o robô da plataforma silencia assim mesmo.
 *
 * ⚠️ NADA É APAGADO. As faixas com autor continuam no disco, nos créditos e no histórico — elas só
 * deixam de ser sorteadas por `pick-music.cjs`. Se um dia a origem do acervo mudar, basta rodar este
 * script de novo.
 *
 * Uso:
 *   node scripts/build-music-livres.mjs           # reescreve public/music/livres.json
 *   node scripts/build-music-livres.mjs --check   # não escreve; sai 1 se o arquivo estiver defasado
 *
 * Precisa de `ffprobe` na máquina (é ele quem lê a etiqueta). O arquivo gerado fica commitado
 * justamente para o CI não depender disso.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const MUSIC_DIR = path.resolve(AQUI, "..", "public", "music");
const SAIDA = path.join(MUSIC_DIR, "livres.json");

/** O autor gravado na etiqueta do arquivo, ou "" quando não há. `null` = não consegui ler. */
function autorDe(arquivo) {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format_tags=artist", "-of", "default=noprint_wrappers=1:nokey=1", arquivo],
    { encoding: "utf8", windowsHide: true }
  );
  if (r.status !== 0) return null;
  return String(r.stdout || "").trim();
}

const arquivos = fs.readdirSync(MUSIC_DIR).filter((f) => /\.(mp3|wav)$/i.test(f)).sort();
const livres = [];
const comDono = [];
const naoLidos = [];

for (const f of arquivos) {
  const autor = autorDe(path.join(MUSIC_DIR, f));
  // ⛔ FAIL-CLOSED: faixa que não deu para ler NÃO entra na lista de livres. Uma faixa a menos no
  // sorteio não custa nada; uma faixa com dono no ar custou 40 dias de alcance zero.
  if (autor === null) { naoLidos.push(f); continue; }
  if (autor === "") livres.push(`music/${f}`);
  else comDono.push({ arquivo: f, autor });
}

const conteudo = {
  _doc:
    "As ÚNICAS trilhas que pick-music.cjs pode sortear: as sem autor registrado na etiqueta. " +
    "Gerado por scripts/build-music-livres.mjs. Faixa com autor está catalogada em banco de " +
    "identificação de áudio e faz a plataforma SILENCIAR o vídeo inteiro (TikTok, 06/08–30/08/2026, " +
    "82 de 84 vídeos com zero visualização). Não editar à mão: rode o script.",
  _geradoDe: "etiqueta ID3 `artist` de cada arquivo de public/music",
  _comDono: comDono.length,
  _naoLidos: naoLidos,
  livres,
};

if (process.argv.includes("--check")) {
  let atual = null;
  try { atual = JSON.parse(fs.readFileSync(SAIDA, "utf8")); } catch {}
  const igual = atual && JSON.stringify(atual.livres) === JSON.stringify(livres);
  console.log(igual ? `✅ livres.json em dia (${livres.length} faixa(s) livres, ${comDono.length} com dono)` : "❌ livres.json DEFASADO — rode `node scripts/build-music-livres.mjs`");
  process.exit(igual ? 0 : 1);
}

fs.writeFileSync(SAIDA, JSON.stringify(conteudo, null, 2) + "\n");
console.log(`livres.json escrito: ${livres.length} faixa(s) podem ir ao ar · ${comDono.length} com autor ficam de fora${naoLidos.length ? ` · ${naoLidos.length} não deu para ler` : ""}`);
