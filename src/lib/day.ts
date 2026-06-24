// ─── "Dia" da automação — ÂNCORA BRASÍLIA (UTC-3) ────────────────────────────
// FONTE ÚNICA do dia usado pelo livro-razão (published_runs), anti-dup, número de
// edição, footage compartilhado e watchdog (runs-status/catchup).
//
// POR QUE BRT e não UTC: a cadência roda no fuso da conta (slots 09h–21h BRT). O
// slot das 21h dispara à 00h UTC; com "dia = dia UTC", esse post (e qualquer
// catchup tarde) caía no dia UTC SEGUINTE e "roubava" as vagas do dia seguinte —
// o run já nascia marcado como publicado, e o reel RENDERIZAVA e PULAVA
// ("run X já publicado hoje"), sem nada novo ir ao feed durante o dia. Ancorar o
// dia em BRT alinha o livro-razão ao calendário real (todos os 6 slots no MESMO
// dia) e elimina o vazamento de fim de dia. Brasil não tem horário de verão desde
// 2019 → offset fixo -3h (sem DST).
export const BRT_OFFSET_MIN = -180; // America/Sao_Paulo = UTC-3 (fixo)

// YYYY-MM-DD no fuso de Brasília.
export function dayBRT(date = new Date()): string {
  return new Date(date.getTime() + BRT_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}

// Minuto-do-dia (0..1439) em BRT. O watchdog usa para saber se um run já "venceu";
// PRECISA ser BRT p/ casar com dayBRT (senão o run das 21h = 00h UTC quebra a janela).
export function minOfDayBRT(date = new Date()): number {
  const d = new Date(date.getTime() + BRT_OFFSET_MIN * 60_000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
