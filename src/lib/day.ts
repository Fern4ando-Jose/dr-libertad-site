// ─── "Dia" da automação — ÂNCORA BRASÍLIA (UTC-3) ────────────────────────────
// FONTE ÚNICA do dia usado pelo livro-razão (published_runs), anti-dup, número de
// edição, footage compartilhado e watchdog (runs-status/catchup).
//
// POR QUE BRT e não UTC: a cadência roda no fuso da conta (slot 19h BRT). O
// slot das 21h dispara à 00h UTC; com "dia = dia UTC", esse post (e qualquer
// catchup tarde) caía no dia UTC SEGUINTE e "roubava" as vagas do dia seguinte —
// o run já nascia marcado como publicado, e o reel RENDERIZAVA e PULAVA
// ("run X já publicado hoje"), sem nada novo ir ao feed durante o dia. Ancorar o
// dia em BRT alinha o livro-razão ao calendário real (todos os slots no MESMO
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
// muda só este mapa — as rotas iteram ACTIVE_RUNS/runsForDay, nunca um `0..N`
// escrito à mão.
//
// CADÊNCIA 1 PEÇA/DIA por idioma (ordem do dono 2026-08-23, reestruturação total
// das 2 contas: "pode, aplique tudo"). Substitui a cadência de 3/dia (1 carrossel +
// 2 Reels) de 2026-08-15. Composição:
//   3=19h Reel de vídeo — sai nos dias NORMAIS (2 a cada 3 dias)
//   4=19h Carrossel     — sai a cada 3 dias, NO LUGAR do Reel (mesmo horário)
// Os dois runs ficam armados no MESMO horário (ambos com cron diário às 19h BRT nos
// 2 workflows) mas são MUTUAMENTE EXCLUDENTES por dia: `isCarouselDay(dia)` decide
// qual dos dois publica hoje — o outro se AUTO-PULA (gate em /api/publish, sem
// consumir tentativa/orçamento). `runsForDay` é quem sabe disso; runs-status/guardian
// e o watchdog (catchup.yml/guardiao.yml) devem iterar SÓ o run do dia, nunca os dois.
// Números de run preservados (não renumerados): o livro-razão (published_runs) tem
// histórico gravado com eles, e renumerar faria post antigo casar com vaga errada.
export const RUN_HOUR_BRT: Record<number, number> = { 3: 19, 4: 19 };

// Qual run é qual FORMATO — fonte única p/ quem precisa saber (runsForDay,
// workflows.ts, watchdog). Preservados desde a cadência de 15/08 (4=carrossel,
// 3=reel de vídeo) de propósito: são os mesmos números já gravados no livro-razão.
export const REEL_RUN = 3;
export const CARROSSEL_RUN = 4;

// As vagas ARMADAS (cron ligado nos 2 workflows), em ordem de horário — ambas às
// 19h hoje, então a ordem é só estável/determinística. NÃO confundir com "o que
// publica hoje": use `runsForDay` para isso (só 1 dos 2 é relevante por dia).
export const ACTIVE_RUNS: number[] = Object.keys(RUN_HOUR_BRT)
  .map(Number)
  .sort((a, b) => RUN_HOUR_BRT[a] - RUN_HOUR_BRT[b]);

// Índice de dia DETERMINÍSTICO (dias desde a época Unix, calendário UTC da data
// BRT) — mesmo valor nas duas contas (ES e PT leem o MESMO dayBRT), sem depender
// de fuso do runner. Usado só para decidir o TIPO do dia (isCarouselDay).
export function dayIndex(day: string = dayBRT()): number {
  return Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
}

// Dia de CARROSSEL: 1 a cada 3 dias (mod 3 do índice de dia). Os outros 2/3 dos
// dias são dia de REEL. Pura e determinística — nunca lê banco/relógio além do
// `day` recebido, então dois idiomas/dois workflows sempre concordam.
export function isCarouselDay(day: string = dayBRT()): boolean {
  return dayIndex(day) % 3 === 0;
}

// O(s) run(s) que DEVEM publicar em `day` — hoje sempre 1 elemento (o Reel OU o
// Carrossel, nunca os dois). runs-status/guardian usam isto no lugar de varrer
// ACTIVE_RUNS inteiro: varrer os 2 faria o watchdog achar "faltando" o run que foi
// de propósito pulado por não ser o tipo do dia (alarme falso permanente).
export function runsForDay(day: string = dayBRT()): number[] {
  return [isCarouselDay(day) ? CARROSSEL_RUN : REEL_RUN];
}

// Quantas peças cada conta REALMENTE publica por dia (não o nº de runs armados —
// esses são 2, mutuamente excludentes). É o que o guardião cobra (EXPECTED) e o
// que a rotação de temas/trilha usa para calcular o intervalo de retorno. Fixo em
// 1 pela própria regra da cadência (runsForDay sempre devolve 1 elemento); não é
// `ACTIVE_RUNS.length` de propósito — essa conta os 2 runs ARMADOS, não os que
// publicam. Escrever aqui um número que não seja 1 quebra a cadência declarada.
export const POSTS_PER_DAY = 1;
