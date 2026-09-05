// Porta os markdowns do guia "100 Dias" para conteúdo estruturado do site.
//
// FERRAMENTA LOCAL (não roda no CI): lê os originais do projeto Livros-Escrevendo
// (§1.0 — só LÊ, nunca altera) e gera src/content/guia/pt.json, que é o que a app
// consome. Regenerar rodando:  node scripts/port-guia.mjs
//
// Limpa o que NÃO pode chegar ao leitor: o rodapé de fonte interno (‹fonte:…›) e o
// scaffold do diário do autor ([AUTOR ESCREVE AQUI]) — na área logada o diário vira
// campo do próprio usuário, salvo por dia.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC =
  "D:/Claude/Meus Projetos/Livros-Escrevendo/100 dias para a Liberdade/Curso-Anti-Vicio/Guia-Diario";

const PHASES = [
  { dir: "Preparacao",    key: "preparacao",   label: "Preparação",   prep: true },
  { dir: "O-Choque",      key: "choque",       label: "O Choque" },
  { dir: "A-Travessia",   key: "travessia",    label: "A Travessia" },
  { dir: "Consolidacao",  key: "consolidacao", label: "Consolidação" },
  { dir: "A-Vida-Depois", key: "vida-depois",  label: "A Vida Depois" },
];

function stripInternal(md) {
  return md
    .split("\n")
    .filter((l) => !/^\s*>\s*‹fonte/i.test(l))
    .join("\n")
    .replace(/^\s*---\s*$/gm, "")
    .trim();
}

function sections(md) {
  const parts = md.split(/\n##\s+/).map((s, i) => (i === 0 ? s : "## " + s));
  const out = {};
  for (const p of parts) {
    const m = p.match(/^##\s+\d+\.\s*(.+)/);
    if (!m) continue;
    const name = m[1].toLowerCase();
    const body = p.replace(/^##\s+.+\n/, "");
    if (name.includes("ciência") || name.includes("ciencia")) out.science = body;
    else if (name.includes("ação") || name.includes("acao")) out.action = body;
    else if (name.includes("armadilha")) out.trap = body;
  }
  return out;
}

const days = [];
const skipped = [];

for (const phase of PHASES) {
  let files;
  try { files = readdirSync(join(SRC, phase.dir)).filter((f) => f.endsWith(".md")); }
  catch { continue; }

  for (const file of files) {
    if (/^00-/.test(file)) { skipped.push(file); continue; }
    const dayMatch = file.match(/Dia-(\d+)/i);
    if (!dayMatch) { skipped.push(file); continue; }
    const dayNum = parseInt(dayMatch[1], 10);

    const cleaned = stripInternal(readFileSync(join(SRC, phase.dir, file), "utf8"));
    const h1 = cleaned.match(/^#\s+(.+)$/m);
    const headline = h1 ? h1[1].trim() : file;
    const titleParts = headline.split(/\s+—\s+/);
    const title = titleParts.length ? titleParts[titleParts.length - 1].trim() : headline;
    const promiseMatch = cleaned.match(/^#\s+.+\n+\*(.+?)\*/m);
    const promise = promiseMatch ? promiseMatch[1].trim() : "";
    const sec = sections(cleaned.replace(/^#\s+.+\n/, ""));

    days.push({
      phase: phase.key,
      phaseLabel: phase.label,
      prep: !!phase.prep,
      day: dayNum,
      order: phase.prep ? dayNum / 100 : dayNum,
      title,
      promise,
      science: (sec.science || "").trim(),
      action: (sec.action || "").trim(),
      trap: (sec.trap || "").trim(),
      sourceFile: `${phase.dir}/${file}`,
    });
  }
}

days.sort((a, b) => a.order - b.order);

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "src", "content", "guia");
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "pt.json"), JSON.stringify(days, null, 2) + "\n", "utf8");

const counts = {};
for (const d of days) counts[d.phase] = (counts[d.phase] || 0) + 1;
console.log(`Portados ${days.length} dias → ${join(OUT_DIR, "pt.json")}`);
console.log("Por fase:", JSON.stringify(counts));
if (skipped.length) console.log("Pulados:", skipped.join(", "));
const noSci = days.filter((d) => !d.science);
const noAct = days.filter((d) => !d.action);
if (noSci.length) console.log("⚠️ SEM ciência:", noSci.map((d) => d.sourceFile).join(", "));
if (noAct.length) console.log("⚠️ SEM ação:", noAct.map((d) => d.sourceFile).join(", "));
