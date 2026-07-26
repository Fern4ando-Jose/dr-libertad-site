// ─── Guardião de PRs — trabalho PRONTO que não foi ao ar ─────────────────────
// Por quê (incidente 2026-07-26): as trilhas dos Reels ficaram 11 dias presas em 5
// faixas porque o PR #172 — 92 faixas novas, CI verde, mergeável, sem review pendente —
// ficou aberto e ninguém mergeou. A auditoria do dia achou mais 5 PRs no mesmo estado
// (o mais velho de 40 dias) e 3 que apodreceram até conflitar. O repo já vigiava os
// POSTS (guardiao.yml) e os RUNS (runs-monitor.yml); ninguém vigiava o TRABALHO PRONTO.
//
// O que faz: inventaria os PRs abertos, classifica e ALARMA (mesmo mecanismo do
// runs-monitor: Job Summary + ::error:: + run VERMELHO, que notifica por e-mail e é
// visto pelo supervisor diário local).
//
//   • ENGAVETADO  → aberto, não-draft, MERGEABLE, todos os checks verdes, parado há
//                   mais de MAX_DIAS. É trabalho pronto que só falta subir. ALARME.
//   • APODRECENDO → CONFLICTING: nasceu mergeável e a main andou por cima. ALARME.
//   • QUEBRADO    → algum check FAILURE. Aviso (é a sessão dona que conserta).
//   • EM CURSO    → recente ou checks rodando. Silêncio (nenhum ruído).
//
// NÃO mergeia sozinho: publicar em produção continua exigindo o OK do dono (P4/P7).
// O guardião garante que o trabalho pronto seja VISTO — não que suba sozinho.
//
// Uso:  node scripts/pr-guardiao.mjs            (usa o `gh` autenticado)
//       MAX_DIAS=5 node scripts/pr-guardiao.mjs
//       node scripts/pr-guardiao.mjs --dry      (não escreve no Job Summary)
//
// Saída: 0 = nada engavetado/apodrecendo · 1 = há trabalho parado (run VERMELHO).

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const MAX_DIAS = Number(process.env.MAX_DIAS || 2);
const DRY = process.argv.includes("--dry");
const REPO = process.env.REPO || ""; // vazio = repo do diretório atual
const AGORA = Date.now();

const gh = (args) =>
  execFileSync("gh", REPO ? [...args, "--repo", REPO] : args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

const dias = (iso) => Math.floor((AGORA - Date.parse(iso)) / 86_400_000);
// pausa síncrona sem spawnar processo (só p/ dar tempo ao GitHub calcular o merge)
const dormir = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// `gh pr list --json mergeable` devolve UNKNOWN: o GitHub só calcula o merge sob
// demanda. Consultar o PR individualmente dispara o cálculo — daí 1 retry curto.
function verPR(numero) {
  const campos =
    "number,title,url,createdAt,updatedAt,isDraft,mergeable,mergeStateStatus,statusCheckRollup";
  let pr = JSON.parse(gh(["pr", "view", String(numero), "--json", campos]));
  if (pr.mergeable === "UNKNOWN") {
    dormir(3000); // 3s p/ o GitHub terminar de calcular
    pr = JSON.parse(gh(["pr", "view", String(numero), "--json", campos]));
  }
  return pr;
}

function estadoDosChecks(pr) {
  const checks = pr.statusCheckRollup || [];
  if (!checks.length) return "sem-checks";
  const cs = checks.map((c) => c.conclusion || c.state || "");
  if (cs.some((c) => ["FAILURE", "ERROR", "TIMED_OUT", "CANCELLED"].includes(c))) return "quebrado";
  if (cs.some((c) => ["PENDING", "IN_PROGRESS", "QUEUED", "EXPECTED", ""].includes(c))) return "rodando";
  return "verde";
}

function classificar(pr) {
  const idade = dias(pr.createdAt);
  const checks = estadoDosChecks(pr);
  if (pr.isDraft) return { cat: "em-curso", motivo: "rascunho", idade, checks };
  if (pr.mergeable === "CONFLICTING") return { cat: "apodrecendo", motivo: "conflita com a main", idade, checks };
  if (checks === "quebrado") return { cat: "quebrado", motivo: "algum teste falhou", idade, checks };
  if (checks === "rodando") return { cat: "em-curso", motivo: "testes rodando", idade, checks };
  if (pr.mergeable === "MERGEABLE" && checks !== "quebrado" && idade > MAX_DIAS)
    return { cat: "engavetado", motivo: `pronto e parado há ${idade} dias`, idade, checks };
  return { cat: "em-curso", motivo: `recente (${idade}d)`, idade, checks };
}

function resumo(linhas) {
  const arquivo = process.env.GITHUB_STEP_SUMMARY;
  const texto = linhas.join("\n") + "\n";
  if (!DRY && arquivo) appendFileSync(arquivo, texto);
  else console.log(texto);
}

// ─── main ────────────────────────────────────────────────────────────────────
const abertos = JSON.parse(gh(["pr", "list", "--state", "open", "--limit", "100", "--json", "number"]));
if (!abertos.length) {
  resumo(["## Guardião de PRs", "", "✅ Nenhum PR aberto — nada engavetado."]);
  process.exit(0);
}

const prs = abertos.map((p) => {
  const pr = verPR(p.number);
  return { ...pr, ...classificar(pr) };
});

const engavetados = prs.filter((p) => p.cat === "engavetado").sort((a, b) => b.idade - a.idade);
const apodrecendo = prs.filter((p) => p.cat === "apodrecendo").sort((a, b) => b.idade - a.idade);
const quebrados = prs.filter((p) => p.cat === "quebrado");

const linha = (p) => `| [#${p.number}](${p.url}) | ${p.idade}d | ${p.motivo} | ${p.title.slice(0, 60)} |`;
const out = ["## Guardião de PRs — trabalho pronto que não foi ao ar", ""];
out.push(`Abertos: **${prs.length}** · pronto e parado: **${engavetados.length}** · conflitando: **${apodrecendo.length}** · com teste falhando: **${quebrados.length}**`, "");

if (engavetados.length) {
  out.push(`### 🚨 PRONTO E PARADO (verde, mergeável, > ${MAX_DIAS} dias)`, "", "| PR | idade | situação | título |", "|---|---|---|---|");
  engavetados.forEach((p) => out.push(linha(p)));
  out.push("", "Isto é trabalho **terminado** que não está no ar. Cada dia parado é um dia sem o efeito dele.", "");
}
if (apodrecendo.length) {
  out.push("### ⚠️ APODRECENDO (conflita com a main — nasceu pronto e a main passou por cima)", "", "| PR | idade | situação | título |", "|---|---|---|---|");
  apodrecendo.forEach((p) => out.push(linha(p)));
  out.push("");
}
if (quebrados.length) {
  out.push("### 🔧 TESTE FALHANDO (a sessão dona conserta)", "", "| PR | idade | situação | título |", "|---|---|---|---|");
  quebrados.forEach((p) => out.push(linha(p)));
  out.push("");
}
if (!engavetados.length && !apodrecendo.length) out.push("✅ Nada engavetado, nada conflitando.");
resumo(out);

for (const p of engavetados) console.log(`::error title=PR pronto e parado::#${p.number} — ${p.motivo} — ${p.title}`);
for (const p of apodrecendo) console.log(`::error title=PR conflitando::#${p.number} — aberto há ${p.idade}d — ${p.title}`);
for (const p of quebrados) console.log(`::warning title=PR com teste falhando::#${p.number} — ${p.title}`);

if (engavetados.length || apodrecendo.length) {
  console.log(`::error title=Guardião de PRs::${engavetados.length} PR(s) prontos e parados + ${apodrecendo.length} conflitando — trabalho terminado fora do ar.`);
  process.exit(1);
}
console.log("Guardião de PRs: nada engavetado.");
