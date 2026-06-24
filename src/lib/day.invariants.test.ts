// Invariante do "dia" da automação — ÂNCORA BRT (UTC-3).
// Codifica o bug real de 24/06: com dia=UTC, o slot das 21h BRT (00h UTC) e os
// catchups da madrugada caíam no dia UTC SEGUINTE e marcavam as vagas do dia
// seguinte como já publicadas → o reel renderizava e PULAVA. Ancorar em BRT mantém
// todos os 6 slots (09h–21h) no MESMO dia do calendário da conta.
import { describe, it, expect } from "vitest";
import { dayBRT, minOfDayBRT } from "./day";

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
