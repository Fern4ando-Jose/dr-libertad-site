#!/usr/bin/env node
/**
 * instalar.mjs — leva o painel local até a pasta que o DONO abre, sem ninguém copiar à mão.
 *
 * ⛔ O DEFEITO QUE ISTO FECHA (medido 2026-08-06). O README daqui mandava "copiar o .html
 * para a pasta do painel" — um PASSO MANUAL, e passo manual é defeito (P8). Resultado real:
 * a cópia que o dono abre (`Automações\Dr-liberdade-site\pesquisa.html`) ficou parada em
 * 01/08 com 13.714 bytes, enquanto a daqui tinha 17.267 com o bloco "Histórias" e os rótulos
 * em português. As histórias inteiras — material do livro — simplesmente não chegavam a ele,
 * e nada acusava: as duas telas abrem, as duas mostram número, só que uma mostra menos.
 *
 * Duas cópias do mesmo arquivo SEMPRE divergem. Enquanto a cópia existir (aposentá-la é
 * decisão do dono), quem manda é ESTE arquivo — o de lá é espelho e se refaz sozinho.
 *
 * USO
 *   node instalar.mjs              # espelha (só escreve se estiver diferente)
 *   node instalar.mjs --conferir   # não escreve; sai 1 se divergir  → serve de alarme
 *
 * Fora do Windows do dono (CI, outra máquina) não há o que espelhar: sai 0 dizendo isso.
 * Nunca falhe a montagem por causa disto — o arquivo de destino não é do repositório.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const FONTE = path.join(AQUI, "pesquisa.html");

/** A pasta que o dono abre. Fica FORA do repositório, na máquina dele. */
const DESTINO_PASTA = process.env.PAINEL_LOCAL_DESTINO ||
  "D:\\Claude\\Meus Projetos\\Automações\\Dr-liberdade-site";
const DESTINO = path.join(DESTINO_PASTA, "pesquisa.html");

const conferir = process.argv.includes("--conferir");
const diga = (s) => console.log(`[painel-local] ${s}`);

if (!fs.existsSync(FONTE)) {
  console.error(`[painel-local] ABORTEI: não achei a fonte → ${FONTE}`);
  process.exit(2);
}
if (!fs.existsSync(DESTINO_PASTA)) {
  diga(`a pasta do dono não existe aqui (${DESTINO_PASTA}) — nada a espelhar nesta máquina.`);
  process.exit(0);
}

const fonte = fs.readFileSync(FONTE);
const atual = fs.existsSync(DESTINO) ? fs.readFileSync(DESTINO) : null;

if (atual && atual.equals(fonte)) {
  diga(`já está igual (${fonte.length} bytes) — nada a fazer.`);
  process.exit(0);
}

if (conferir) {
  console.error(
    `[painel-local] DIVERGE: a tela do dono tem ${atual ? atual.length : 0} bytes e a fonte tem ` +
    `${fonte.length}. Rode: node "${path.join(AQUI, "instalar.mjs")}"`
  );
  process.exit(1);
}

fs.writeFileSync(DESTINO, fonte);
diga(`espelhado: ${atual ? `${atual.length} → ${fonte.length}` : `${fonte.length}`} bytes em ${DESTINO}`);
