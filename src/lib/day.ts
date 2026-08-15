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

// ─── Horário-alvo (BRT) de cada run da cadência — FONTE ÚNICA ─────────────────
// run → hora BRT em que a vaga deveria ter saído. O watchdog (catchup/guardian/
// runs-status) usa p/ decidir se um run "venceu" (dueMin = RUN_HOUR_BRT[run]*60 +
// GRACE). Antes o mapa vivia COPIADO idêntico nas 3 rotas → risco de dessincronizar
// (mexer numa e esquecer as outras). Aqui é FONTE ÚNICA (P8): mudou a cadência,
// muda só este mapa — as rotas iteram ACTIVE_RUNS, nunca um `0..N` escrito à mão.
//
// CADÊNCIA 3/dia por idioma (determinação do dono 2026-07-19: "qualidade >
// quantidade"; reduzida de 4→3 em 2026-08-15 por ordem dele: "2 reel ao dia e 1
// carrossel"). Composição por idioma:
//   4=9h  carrossel
//   3=19h reel de vídeo
//   2=21h reel de vídeo
// RETIRADOS nesta mudança: 0 (12h, 3º reel de vídeo — saiu em 15/08) · 1 (17h) ·
// 5 (14h, 2º carrossel) · 6 (7h, 4º reel de vídeo). Os números de run NÃO foram
// renumerados de propósito — o livro-razão (published_runs) tem histórico gravado
// com eles, e renumerar faria post antigo casar com vaga errada. Reativar uma vaga
// = devolvê-la a este mapa E ao cron do workflow correspondente.
export const RUN_HOUR_BRT: Record<number, number> = { 4: 9, 3: 19, 2: 21 };

// As vagas ativas, em ordem de horário. É o que o watchdog varre — derivado do mapa
// acima para que tirar/pôr uma vaga seja UMA edição, não quatro.
export const ACTIVE_RUNS: number[] = Object.keys(RUN_HOUR_BRT)
  .map(Number)
  .sort((a, b) => RUN_HOUR_BRT[a] - RUN_HOUR_BRT[b]);

// Quantas peças cada conta publica por dia. Sai do mapa, não de um número solto:
// era isso que deixava o papel dizer 4 e a máquina fazer 7.
export const POSTS_PER_DAY = ACTIVE_RUNS.length;
