// ─── Contas-alvo da esteira de comentário (outbound assistido, 1 clique) ──────
// Lista-guia de contas 1M+ por idioma (decisão do dono: rodar 1 mês só com megas e
// reavaliar; se não render, voltar pras mid/micro). A esteira NÃO comenta sozinha —
// a Graph API não permite comentar em terceiros. Ela só PREPARA (acha o post fresco +
// escreve o comentário na voz) e o dono posta. Fonte estratégica: contas-guia.md (offline).
//
// ⚠️ O ganho em mega vem de comentar nos PRIMEIROS MINUTOS (post fresco) — senão afunda.
// Por isso a esteira prioriza posts recém-publicados.

import type { Lang } from "./accounts";

export interface CommentTarget {
  /** @handle SEM o "@" (como o business_discovery espera). */
  username: string;
  /** seguidores aprox. (proxy; o business_discovery traz o número ao vivo). */
  followersApprox: string;
  /** foco do conteúdo (ajuda a decidir em qual post comentar). */
  focus: string;
  /** pilares da marca que os posts tocam (1-5). */
  pillars: number[];
  /** prioridade: "core" (começar por estas) ou "reach" (alcance puro). */
  tier: "core" | "reach";
}

export const COMMENT_TARGETS: Record<Lang, CommentTarget[]> = {
  es: [
    { username: "walter_riso", followersApprox: "~4M", focus: "Dependencia emocional, autoestima, relaciones tóxicas", pillars: [2, 4, 5], tier: "core" },
    { username: "jorgelozanoh", followersApprox: "~5M", focus: "Relaciones, frases secas/irónicas (tono = el nuestro)", pillars: [2, 3, 4], tier: "core" },
    { username: "marianrojasestape", followersApprox: "~5M", focus: "Psiquiatría: dopamina, ansiedad, hábitos", pillars: [1, 4], tier: "core" },
    { username: "psicologiaparanadie", followersApprox: "~3M", focus: "TCC, hábitos, salud mental (Reels)", pillars: [1, 2, 4], tier: "core" },
    { username: "drcesarlozano", followersApprox: "~3M", focus: "Motivación + relaciones humanas (LatAm)", pillars: [2, 3, 4], tier: "core" },
    { username: "danielhabif", followersApprox: "~10M", focus: "Motivación, disciplina, mentalidad", pillars: [4, 5], tier: "core" },
    { username: "enric_corbera", followersApprox: "~1M", focus: "Bioneuroemoción, mente/cuerpo", pillars: [4, 5], tier: "reach" },
    { username: "ismaelcala", followersApprox: "~2-4M", focus: "Mindfulness, mentalidad, bienestar", pillars: [1, 4, 5], tier: "reach" },
    { username: "culturapositiva", followersApprox: "~10M", focus: "Frases inspiracionales (ER bajo)", pillars: [4, 5], tier: "reach" },
    { username: "mundopsicologos", followersApprox: "~1M", focus: "Divulgación de psicología", pillars: [2, 4], tier: "reach" },
  ],
  pt: [
    { username: "rossandroklinjey", followersApprox: "~3M", focus: "Psicólogo: comportamento/família, tom provocativo", pillars: [2, 3, 4], tier: "core" },
    { username: "anabeatriz11", followersApprox: "~7M", focus: "Psiquiatra: ansiedade, verdades duras de saúde mental", pillars: [1, 3, 4], tier: "core" },
    { username: "joeljota", followersApprox: "~6M", focus: "Disciplina, alta performance, autorresponsabilidade", pillars: [4, 5], tier: "core" },
    { username: "myllamurta", followersApprox: "~1M", focus: "Psicanálise: término, solidão, descarte afetivo", pillars: [2, 4], tier: "core" },
    { username: "augustocury", followersApprox: "~8M", focus: "Psiquiatra: emoção, ser humano na era das telas", pillars: [1, 4, 5], tier: "core" },
    { username: "caiocarneiro", followersApprox: "~3M", focus: "Mentalidade, disciplina, atitude", pillars: [5], tier: "core" },
    { username: "thiago.nigro", followersApprox: "~10M", focus: "Consistência/disciplina (tese = mindset)", pillars: [5], tier: "reach" },
    { username: "paulovcoach", followersApprox: "~6M", focus: "Mentalidade, autorresponsabilidade, disciplina", pillars: [4, 5], tier: "reach" },
    { username: "tiagobrunet", followersApprox: "~7M", focus: "Desenvolvimento pessoal/emocional, decisões", pillars: [4, 5], tier: "reach" },
    { username: "pefabiodemelo", followersApprox: "~26M", focus: "Reflexão, solidão, dor emocional", pillars: [3, 4], tier: "reach" },
  ],
};

// Cadência diária por conta (freio de segurança). ES (conta antiga) mais agressiva;
// PT (conta nova, já bloqueada uma vez) conservadora. Sempre MUITO abaixo do teto.
export const DAILY_COMMENT_CAP: Record<Lang, number> = { es: 10, pt: 5 };
