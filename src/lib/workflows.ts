// ─── run → workflow do GitHub Actions — FONTE ÚNICA (P8) ─────────────────────
// Quem redispara uma vaga que o cron atrasou/derrubou precisa saber DOIS fatos:
// qual arquivo de workflow chamar e quais inputs mandar. Isso vivia escrito à mão
// em três lugares — /api/catchup (TypeScript), catchup.yml e guardiao.yml (bash) —
// e foi exatamente aí que nasceu o defeito de 2026-07-14→27:
//
//   A FUSÃO ES+PT (2026-07-14) juntou `instagram-reels.yml` + `instagram-reels-pt.yml`
//   num arquivo ÚNICO por formato, com o idioma vindo por input/cron. Os dois YAMLs
//   foram atualizados. A rota TypeScript NÃO: continuou montando `${base}-pt.yml`,
//   nome que deixou de existir. Resultado: TODA recuperação de vaga em português
//   batia num arquivo inexistente e voltava vazia (HTTP 404) — por 13 dias, a cada
//   15 minutos. O espanhol se curava sozinho; o português não. Ninguém percebeu
//   porque a resposta da rota só listava a falha num campo que nada lia.
//
// Agora o mapa mora AQUI e a rota importa. `workflows.invariants.test.ts` confere
// contra o DISCO (o arquivo existe? o input é aceito? o bash espelha o mapa?) e
// reprova antes de subir — papel × máquina, a mesma trava que fechou o buraco da
// cadência em `day.invariants.test.ts`.

/** Os 3 workflows de publicação. Um por FORMATO — nunca mais um por idioma. */
export const WORKFLOWS = {
  /** Reel de vídeo (footage + narração). Runs 0, 1, 2 e 6. */
  reels: "instagram-reels.yml",
  /** Reel clássico (slide animado sobre a ilustração). Run 3. */
  classic: "instagram-reels-classic.yml",
  /** Carrossel. Runs 4 e 5. */
  posts: "instagram-posts.yml",
} as const;

/**
 * run → arquivo do workflow. Cobre TODOS os runs conhecidos (0..6), inclusive os que
 * hoje não têm cron (1, 5, 6 — retirados na cadência 4/dia de 27/07) e seguem
 * disponíveis para backfill manual. Ver RUN_HOUR_BRT em `./day` p/ as vagas ATIVAS.
 */
export const WORKFLOW_FOR_RUN: Record<number, string> = {
  0: WORKFLOWS.reels,
  1: WORKFLOWS.reels,
  2: WORKFLOWS.reels,
  3: WORKFLOWS.classic,
  4: WORKFLOWS.posts,
  5: WORKFLOWS.posts,
  6: WORKFLOWS.reels,
};

/**
 * O que mandar ao GitHub para redisparar a vaga `run` no idioma `lang`.
 *
 * `lang` vai SEMPRE como input — é ele que diz ao job em qual conta publicar. Num
 * disparo manual sem `lang` o job cai no default `es`, então omiti-lo faria uma
 * recuperação de português publicar em espanhol (pior que não publicar).
 *
 * `publish: "yes"` só nos Reels: o carrossel não declara esse input e o GitHub
 * REJEITA (HTTP 422) um dispatch com input não declarado. A trava de invariante
 * confere isso lendo o bloco `workflow_dispatch` de cada YAML.
 *
 * Devolve `null` para run desconhecido (quem chama pula a vaga).
 */
export function workflowFor(
  run: number,
  lang: string,
): { file: string; inputs: Record<string, string> } | null {
  const file = WORKFLOW_FOR_RUN[run];
  if (!file) return null;
  // Mesma normalização do job (`[ "$LANG" != "br" ] && LANG=es`): qualquer valor
  // inesperado vira espanhol, nunca um idioma inventado.
  const inputs: Record<string, string> = { run: String(run), lang: lang === "br" ? "br" : "es" };
  if (file !== WORKFLOWS.posts) inputs.publish = "yes";
  return { file, inputs };
}
