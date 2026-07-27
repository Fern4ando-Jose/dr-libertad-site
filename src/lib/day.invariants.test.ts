// Invariante do "dia" da automação — ÂNCORA BRT (UTC-3).
// Codifica o bug real de 24/06: com dia=UTC, o slot das 21h BRT (00h UTC) e os
// catchups da madrugada caíam no dia UTC SEGUINTE e marcavam as vagas do dia
// seguinte como já publicadas → o reel renderizava e PULAVA. Ancorar em BRT mantém
// todos os 6 slots (09h–21h) no MESMO dia do calendário da conta.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dayBRT, minOfDayBRT, RUN_HOUR_BRT, ACTIVE_RUNS, POSTS_PER_DAY } from "./day";

describe("dayBRT — dia ancorado em Brasília (UTC-3)", () => {
  it("meio do dia BRT fica no dia certo", () => {
    expect(dayBRT(new Date("2026-06-24T15:00:00Z"))).toBe("2026-06-24"); // 12h BRT
  });

  it("slot das 21h BRT (00:30 UTC do dia seguinte) NÃO vaza pro dia seguinte", () => {
    // 2026-06-25T00:30Z = 21:30 BRT de 24/06 → pertence ao dia 24, não ao 25.
    expect(dayBRT(new Date("2026-06-25T00:30:00Z"))).toBe("2026-06-24");
  });

  it("catchup da madrugada (02h UTC) ainda é o dia BRT anterior (23h)", () => {
    // 2026-06-25T02:00Z = 23:00 BRT de 24/06 → dia 24.
    expect(dayBRT(new Date("2026-06-25T02:00:00Z"))).toBe("2026-06-24");
  });

  it("após 03h UTC vira o novo dia BRT (00h)", () => {
    expect(dayBRT(new Date("2026-06-25T03:00:00Z"))).toBe("2026-06-25");
  });
});

describe("minOfDayBRT — minuto-do-dia em BRT (janela do watchdog)", () => {
  it("00h UTC = 21h BRT = 1260 min (o run 2 já venceu, não 0)", () => {
    expect(minOfDayBRT(new Date("2026-06-25T00:00:00Z"))).toBe(21 * 60);
  });

  it("15h UTC = 12h BRT = 720 min (run 0)", () => {
    expect(minOfDayBRT(new Date("2026-06-24T15:00:00Z"))).toBe(12 * 60);
  });
});

describe("RUN_HOUR_BRT — FONTE ÚNICA do horário-alvo por run (watchdog)", () => {
  // Antes o mapa vivia COPIADO nas 3 rotas do watchdog (catchup/guardian/runs-status).
  // Aqui trava o contrato: se a cadência mudar, muda SÓ este mapa e o teste avisa.
  it("cobre as 4 vagas da cadência com as horas dos crons dos workflows", () => {
    // Cadência 4/dia por idioma (determinação do dono 19/07, aplicada 27/07):
    // 9h carrossel · 12h reel vídeo · 19h reel clássico · 21h reel vídeo.
    expect(RUN_HOUR_BRT).toEqual({ 4: 9, 0: 12, 3: 19, 2: 21 });
  });

  it("ACTIVE_RUNS sai do mapa, em ordem de horário, sem número solto", () => {
    expect(ACTIVE_RUNS).toEqual([4, 0, 3, 2]);
    expect(POSTS_PER_DAY).toBe(4);
  });

  it("o dueMin do watchdog casa com o horário do run (ex.: run 2 = 21h)", () => {
    const GRACE_MIN = 75; // mesma carência das rotas
    expect(RUN_HOUR_BRT[2] * 60 + GRACE_MIN).toBe(21 * 60 + 75);
  });
});

// ─── A TRAVA QUE FALTAVA (2026-07-27) ────────────────────────────────────────
// O defeito real: o dono determinou 4 posts/dia em 19/07, o papel passou a dizer 4 e
// a MÁQUINA continuou com 7 crons por 8 dias, sem nada gritar. Papel e código só
// param de divergir quando algo LÊ os dois e falha. Isto lê os crons de verdade.
describe("os crons dos workflows espelham a cadência (papel × máquina)", () => {
  // "M H * * *" em UTC → hora BRT (UTC-3). Só nos interessa a hora.
  function horasBrtDosCrons(arquivo: string): number[] {
    const yml = readFileSync(join(process.cwd(), ".github", "workflows", arquivo), "utf8");
    const horas: number[] = [];
    for (const linha of yml.split("\n")) {
      const m = linha.match(/^\s*-\s*cron:\s*"(\d+)\s+(\d+)\s+\*\s+\*\s+\*"/);
      if (m) horas.push((Number(m[2]) - 3 + 24) % 24);
    }
    return horas;
  }

  it("cada vaga de RUN_HOUR_BRT tem cron nos DOIS idiomas, e nenhum cron sobra", () => {
    const agendadas = [
      ...horasBrtDosCrons("instagram-posts.yml"),
      ...horasBrtDosCrons("instagram-reels.yml"),
      ...horasBrtDosCrons("instagram-reels-classic.yml"),
    ].sort((a, b) => a - b);

    // 2 idiomas (ES em :17, PT em :22) → cada vaga aparece exatamente 2×.
    const esperadas = ACTIVE_RUNS.flatMap((r) => [RUN_HOUR_BRT[r], RUN_HOUR_BRT[r]]).sort((a, b) => a - b);

    expect(agendadas).toEqual(esperadas);
  });

  it("cada vaga sai 2× ao dia — uma por conta (ES e PT)", () => {
    const todas = [
      ...horasBrtDosCrons("instagram-posts.yml"),
      ...horasBrtDosCrons("instagram-reels.yml"),
      ...horasBrtDosCrons("instagram-reels-classic.yml"),
    ];
    expect(todas.length).toBe(POSTS_PER_DAY * 2);
    for (const run of ACTIVE_RUNS) {
      expect(todas.filter((h) => h === RUN_HOUR_BRT[run]).length).toBe(2);
    }
  });
});
