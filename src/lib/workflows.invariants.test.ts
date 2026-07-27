// ─── A TRAVA QUE FALTAVA (2026-07-27) — código × arquivos que existem de verdade ──
//
// O defeito real: a fusão ES+PT de 2026-07-14 apagou `instagram-reels-pt.yml` e
// irmãos, mas /api/catchup continuou montando esse nome. Todo redisparo de vaga em
// PORTUGUÊS batia num arquivo inexistente e voltava vazio (HTTP 404) — 13 dias, a
// cada 15 minutos, sem nada gritar. O espanhol se curava; o português se perdia.
//
// Por que nenhum teste pegou: os que existiam checavam o CÓDIGO contra ele mesmo.
// Ninguém abria a pasta `.github/workflows/` para ver o que está LÁ. Este arquivo
// abre — mesmo remédio que fechou o buraco da cadência em `day.invariants.test.ts`.
//
// Cobre quatro formas de o código apontar para o vazio:
//   1. citar um workflow que não existe no disco;
//   2. `workflowFor` devolver arquivo inexistente;
//   3. mandar um input que o workflow não declara (o GitHub rejeita com 422);
//   4. os scripts em bash (catchup.yml/guardiao.yml) divergirem do mapa TypeScript —
//      foi a divergência entre eles que criou o buraco.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { WORKFLOWS, WORKFLOW_FOR_RUN, workflowFor } from "./workflows";

const DIR_WORKFLOWS = join(process.cwd(), ".github", "workflows");
const LANGS = ["es", "pt"] as const;

/** Os workflows que EXISTEM no disco, agora. A verdade contra a qual tudo é medido. */
const NO_DISCO = readdirSync(DIR_WORKFLOWS).filter((f) => f.endsWith(".yml"));

/** Todos os arquivos de código sob `dir` (sem testes — teste cita nome quebrado de propósito). */
function arquivosDeCodigo(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const saida: string[] = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === "node_modules" || entrada.name === ".next") continue;
      saida.push(...arquivosDeCodigo(caminho));
    } else if (/\.(ts|tsx|mjs|js)$/.test(entrada.name) && !/\.test\.tsx?$/.test(entrada.name)) {
      saida.push(caminho);
    }
  }
  return saida;
}

/**
 * O código SEM comentários. Um nome citado em comentário não vira chamada nenhuma —
 * e a documentação do defeito precisa poder escrever o nome morto (`...-pt.yml`) sem
 * a própria trava reclamar. `https://` sobrevive: só corta `//` não precedido de `:`.
 *
 * Divide por `\r?\n`: com CRLF (o padrão dos arquivos do repo nesta máquina Windows),
 * o `\r` fica ANTES do fim da linha e o `$` da regex nunca chega lá — o filtro passava
 * batido e o teste acusava comentário como se fosse código.
 */
function semComentarios(texto: string): string {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|[^:])\/\/.*$/, "$1"))
    .join("\n");
}

/** Nomes de input declarados no bloco `workflow_dispatch:` de um workflow. */
function inputsDeclarados(arquivo: string): string[] {
  const linhas = readFileSync(join(DIR_WORKFLOWS, arquivo), "utf8").split("\n");
  const iDispatch = linhas.findIndex((l) => /^\s*workflow_dispatch:/.test(l));
  if (iDispatch < 0) return [];
  const recuo = (l: string) => l.match(/^\s*/)![0].length;
  const recuoDispatch = recuo(linhas[iDispatch]);
  const nomes: string[] = [];
  let recuoInputs = -1;
  let recuoDoNome = -1;
  for (let i = iDispatch + 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha.trim() || /^\s*#/.test(linha)) continue;
    const r = recuo(linha);
    if (r <= recuoDispatch) break;                       // saiu do workflow_dispatch
    if (recuoInputs < 0) {
      if (/^\s*inputs:/.test(linha)) recuoInputs = r;
      continue;
    }
    if (r <= recuoInputs) break;                         // saiu do bloco inputs
    if (recuoDoNome < 0) recuoDoNome = r;                // 1º filho define o nível dos nomes
    if (r !== recuoDoNome) continue;                     // descrição/default/type do input
    const m = linha.match(/^\s*([A-Za-z_][\w-]*):/);
    if (m) nomes.push(m[1]);
  }
  return nomes;
}

/** run → {base, publish} lido do `case` em bash de catchup.yml / guardiao.yml. */
function mapaDoBash(arquivo: string): Record<number, { base: string; publish: boolean }> {
  const mapa: Record<number, { base: string; publish: boolean }> = {};
  for (const linha of readFileSync(join(DIR_WORKFLOWS, arquivo), "utf8").split("\n")) {
    const m = linha.match(/^\s*([\d|]+)\)\s*base="([\w.-]+)";\s*extra="([^"]*)"/);
    if (!m) continue;
    for (const r of m[1].split("|")) mapa[Number(r)] = { base: m[2], publish: m[3].includes("publish=yes") };
  }
  return mapa;
}

describe("todo workflow citado pelo código EXISTE no disco", () => {
  it("nenhum arquivo .yml mencionado em src/ ou scripts/ está faltando", () => {
    const faltando: string[] = [];
    for (const arquivo of [...arquivosDeCodigo(join(process.cwd(), "src")), ...arquivosDeCodigo(join(process.cwd(), "scripts"))]) {
      const texto = semComentarios(readFileSync(arquivo, "utf8"));
      for (const [, nome] of texto.matchAll(/([A-Za-z0-9][\w.-]*\.yml)/g)) {
        if (!NO_DISCO.includes(nome)) faltando.push(`${arquivo.replace(process.cwd(), "")} → ${nome}`);
      }
    }
    // Se isto falhar: o código cita um workflow que não está em .github/workflows/.
    // Ou o arquivo foi renomeado/fundido (conserte a citação), ou o nome é montado
    // por pedaços (`${base}-pt.yml`) — que foi exatamente o defeito de 14/07.
    expect(faltando).toEqual([]);
  });

  it("os 3 workflows de publicação estão no disco", () => {
    for (const arquivo of Object.values(WORKFLOWS)) expect(NO_DISCO).toContain(arquivo);
  });

  it("não existe mais workflow POR IDIOMA (fusão ES+PT de 2026-07-14)", () => {
    // Enquanto o disco não tiver `-pt.yml`, nenhum código pode montar esse nome.
    expect(NO_DISCO.filter((f) => /-(pt|es)\.yml$/.test(f))).toEqual([]);
  });
});

describe("workflowFor — o que o watchdog manda ao GitHub", () => {
  const runs = Object.keys(WORKFLOW_FOR_RUN).map(Number);

  it("todo run × idioma aponta para arquivo que existe", () => {
    for (const run of runs) {
      for (const lang of LANGS) {
        const wf = workflowFor(run, lang)!;
        expect(wf, `run ${run} (${lang}) sem workflow`).not.toBeNull();
        expect(NO_DISCO, `run ${run} (${lang}) → ${wf.file}`).toContain(wf.file);
      }
    }
  });

  it("o idioma vai SEMPRE por input — omitir faria PT publicar em ES", () => {
    for (const run of runs) {
      expect(workflowFor(run, "pt")!.inputs.lang).toBe("pt");
      expect(workflowFor(run, "es")!.inputs.lang).toBe("es");
      expect(workflowFor(run, "xx")!.inputs.lang).toBe("es"); // normaliza, igual ao job
    }
  });

  it("todo input enviado é DECLARADO no workflow (senão o GitHub devolve 422)", () => {
    for (const run of runs) {
      const wf = workflowFor(run, "pt")!;
      const declarados = inputsDeclarados(wf.file);
      expect(declarados.length, `${wf.file} sem inputs declarados`).toBeGreaterThan(0);
      for (const input of Object.keys(wf.inputs)) {
        expect(declarados, `${wf.file} não declara o input "${input}"`).toContain(input);
      }
    }
  });

  it("run desconhecido devolve null (a vaga é pulada, não vira arquivo inventado)", () => {
    expect(workflowFor(99, "pt")).toBeNull();
  });
});

describe("os scripts em bash espelham o mapa TypeScript (os 3 lugares em sincronia)", () => {
  // A divergência entre estes lugares É o defeito: em 14/07 os dois YAMLs foram
  // atualizados e a rota TypeScript ficou para trás, sem nada comparar os dois.
  for (const arquivo of ["catchup.yml", "guardiao.yml"]) {
    it(`${arquivo}: mesmo workflow e mesmo publish que workflowFor`, () => {
      const bash = mapaDoBash(arquivo);
      expect(Object.keys(bash).length, `${arquivo} sem mapa run→workflow`).toBeGreaterThan(0);
      for (const [run, { base, publish }] of Object.entries(bash)) {
        const wf = workflowFor(Number(run), "pt")!;
        expect(wf, `${arquivo}: run ${run} desconhecido no TypeScript`).not.toBeNull();
        expect(`${base}.yml`, `${arquivo}: run ${run}`).toBe(wf.file);
        expect(publish, `${arquivo}: run ${run} publish`).toBe(wf.inputs.publish === "yes");
      }
    });

    it(`${arquivo}: manda o idioma por -f lang`, () => {
      const texto = readFileSync(join(DIR_WORKFLOWS, arquivo), "utf8");
      expect(texto).toMatch(/-f lang="\$lang"/);
    });
  }
});
