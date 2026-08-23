// Invariante do "dia" da automação — ÂNCORA BRT (UTC-3).
// Codifica o bug real de 24/06: com dia=UTC, o slot das 21h BRT (00h UTC) e os
// catchups da madrugada caíam no dia UTC SEGUINTE e marcavam as vagas do dia
// seguinte como já publicadas → o reel renderizava e PULAVA. Ancorar em BRT mantém
// todos os slots no MESMO dia do calendário da conta.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  dayBRT, minOfDayBRT, RUN_HOUR_BRT, ACTIVE_RUNS, POSTS_PER_DAY,
  REEL_RUN, CARROSSEL_RUN, dayIndex, isCarouselDay, runsForDay,
} from "./day";

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
  it("00h UTC = 21h BRT = 1260 min", () => {
    expect(minOfDayBRT(new Date("2026-06-25T00:00:00Z"))).toBe(21 * 60);
  });

  it("15h UTC = 12h BRT = 720 min", () => {
    expect(minOfDayBRT(new Date("2026-06-24T15:00:00Z"))).toBe(12 * 60);
  });
});

describe("RUN_HOUR_BRT — FONTE ÚNICA do horário-alvo por run (watchdog)", () => {
  // Cadência 1 peça/dia (ordem do dono 2026-08-23): Reel (run 3) e Carrossel (run 4)
  // ficam ARMADOS no MESMO horário — 19h BRT — e são mutuamente excludentes por dia
  // (isCarouselDay decide qual publica).
  it("os 2 runs armados apontam para o MESMO horário — 19h", () => {
    expect(RUN_HOUR_BRT).toEqual({ 3: 19, 4: 19 });
  });

  it("ACTIVE_RUNS sai do mapa, sem número solto", () => {
    expect(ACTIVE_RUNS.slice().sort()).toEqual([3, 4]);
    expect(ACTIVE_RUNS.length).toBe(2);
  });

  it("REEL_RUN e CARROSSEL_RUN são os números preservados da cadência anterior", () => {
    expect(REEL_RUN).toBe(3);
    expect(CARROSSEL_RUN).toBe(4);
  });

  it("o dueMin do watchdog casa com o horário do run (19h + carência)", () => {
    const GRACE_MIN = 75; // mesma carência das rotas
    expect(RUN_HOUR_BRT[REEL_RUN] * 60 + GRACE_MIN).toBe(19 * 60 + 75);
    expect(RUN_HOUR_BRT[CARROSSEL_RUN] * 60 + GRACE_MIN).toBe(19 * 60 + 75);
  });
});

describe("isCarouselDay / dayIndex — 1 carrossel a cada 3 dias, o resto é Reel", () => {
  it("é pura e determinística: mesma entrada, mesma saída", () => {
    expect(isCarouselDay("2026-08-23")).toBe(isCarouselDay("2026-08-23"));
  });

  it("exatamente 1 em cada 3 dias consecutivos é dia de carrossel", () => {
    let carrosseis = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.UTC(2026, 7, 1) + i * 86_400_000).toISOString().slice(0, 10);
      if (isCarouselDay(d)) carrosseis++;
    }
    // 30 dias consecutivos, ciclo de 3 → exatamente 10.
    expect(carrosseis).toBe(10);
  });

  it("nunca 2 dias de carrossel seguidos", () => {
    for (let i = 0; i < 30; i++) {
      const d1 = new Date(Date.UTC(2026, 7, 1) + i * 86_400_000).toISOString().slice(0, 10);
      const d2 = new Date(Date.UTC(2026, 7, 1) + (i + 1) * 86_400_000).toISOString().slice(0, 10);
      if (isCarouselDay(d1)) expect(isCarouselDay(d2)).toBe(false);
    }
  });

  it("dayIndex avança exatamente 1 por dia civil", () => {
    expect(dayIndex("2026-08-24") - dayIndex("2026-08-23")).toBe(1);
  });
});

describe("runsForDay — o único run que deve publicar hoje", () => {
  it("devolve sempre exatamente 1 run", () => {
    for (let i = 0; i < 10; i++) {
      const d = new Date(Date.UTC(2026, 7, 1) + i * 86_400_000).toISOString().slice(0, 10);
      expect(runsForDay(d).length).toBe(1);
    }
  });

  it("dia de carrossel → CARROSSEL_RUN; dia de reel → REEL_RUN", () => {
    for (let i = 0; i < 10; i++) {
      const d = new Date(Date.UTC(2026, 7, 1) + i * 86_400_000).toISOString().slice(0, 10);
      const esperado = isCarouselDay(d) ? CARROSSEL_RUN : REEL_RUN;
      expect(runsForDay(d)).toEqual([esperado]);
    }
  });
});

describe("POSTS_PER_DAY — o que REALMENTE publica, não o que está armado", () => {
  it("é 1 (não ACTIVE_RUNS.length=2) — os 2 runs armados são mutuamente excludentes", () => {
    expect(POSTS_PER_DAY).toBe(1);
    expect(POSTS_PER_DAY).not.toBe(ACTIVE_RUNS.length);
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

  it("cada vaga ARMADA (Reel + Carrossel) tem cron nos DOIS idiomas, e nenhum cron sobra", () => {
    // instagram-reels-classic.yml está DESLIGADO (só workflow_dispatch) desde 09/08 —
    // não entra nesta soma.
    const agendadas = [
      ...horasBrtDosCrons("instagram-posts.yml"),
      ...horasBrtDosCrons("instagram-reels.yml"),
    ].sort((a, b) => a - b);

    // 2 idiomas (ES em :17, PT em :22) × 2 runs armados (3 e 4, ambos 19h) → 4 crons, todos às 19h.
    const esperadas = ACTIVE_RUNS.flatMap((r) => [RUN_HOUR_BRT[r], RUN_HOUR_BRT[r]]).sort((a, b) => a - b);

    expect(agendadas).toEqual(esperadas);
  });

  it("cada workflow (1 run cada) sai 2× ao dia — uma por conta (ES e PT), na hora do seu run", () => {
    // Hora sozinha não distingue run 3 de run 4 (os dois são 19h de propósito) —
    // aqui o disambiguador é o ARQUIVO: instagram-posts.yml é sempre CARROSSEL_RUN,
    // instagram-reels.yml é sempre REEL_RUN.
    const posts = horasBrtDosCrons("instagram-posts.yml");
    const reels = horasBrtDosCrons("instagram-reels.yml");
    expect(posts).toEqual([RUN_HOUR_BRT[CARROSSEL_RUN], RUN_HOUR_BRT[CARROSSEL_RUN]]);
    expect(reels).toEqual([RUN_HOUR_BRT[REEL_RUN], RUN_HOUR_BRT[REEL_RUN]]);
  });
});
