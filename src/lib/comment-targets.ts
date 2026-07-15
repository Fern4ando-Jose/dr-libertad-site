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

    // ─── CANDIDATAS (batch 2026-07-14) — expansão do banco p/ manter a fila fresca de tarde ───
    // ⚠️ NÃO VERIFICADAS AO VIVO. Handles/tamanhos vêm de pesquisa pública (WebSearch), NÃO do
    // business_discovery. Antes de ativar, a esteira (Chrome dedicado) confirma ao vivo: (1) o perfil
    // existe; (2) POSTA DIÁRIO; (3) tese LEGÍVEL no post (carrossel/imagem com texto — não só Reel de
    // fala, que a esteira pula). Tamanho com "?" = estimativa NÃO confirmada. Reprovou → apagar a linha.
    { username: "filosofia.estoica", followersApprox: "~360K?", focus: "Sabiduría estoica, reflexiones diarias (frase/carrusel)", pillars: [4, 5], tier: "core" }, // CANDIDATA — verificar ao vivo
    { username: "estoicismo_diario", followersApprox: "~204K?", focus: "Citas estoicas (M. Aurelio/Séneca/Epicteto), diario", pillars: [4, 5], tier: "core" }, // CANDIDATA — verificar ao vivo
    { username: "estoicosesp", followersApprox: "?", focus: "Frases/reflexiones estoicas diarias (autocontrol ante la adversidad)", pillars: [4, 5], tier: "reach" }, // CANDIDATA — verificar ao vivo
    { username: "silviacongost", followersApprox: "~150K?", focus: "Psicóloga: dependencia emocional, relaciones/pareja (nicho Walter Riso)", pillars: [2, 4], tier: "core" }, // CANDIDATA — verificar ao vivo
    { username: "frasesyreflexionessss", followersApprox: "~2M?", focus: "Frases/reflexiones/libros — alcance puro (ER bajo, tipo culturapositiva)", pillars: [4, 5], tier: "reach" }, // CANDIDATA — verificar ao vivo
    { username: "diariodereflexion", followersApprox: "~3M?", focus: "Frases y escritos — alcance puro (ER bajo)", pillars: [4, 5], tier: "reach" }, // CANDIDATA — verificar ao vivo
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

    // ─── CANDIDATAS (batch 2026-07-14) — mesmas regras do bloco ES acima (verificar ao vivo) ───
    { username: "estoicodiario", followersApprox: "~329K?", focus: "Estoicismo diário (frase/carrossel); tese legível", pillars: [4, 5], tier: "core" }, // CANDIDATA — verificar ao vivo
    { username: "estoicismopratico", followersApprox: "~187K?", focus: "Autocontrole, estoicismo prático diário", pillars: [4, 5], tier: "core" }, // CANDIDATA — verificar ao vivo
    { username: "andressacarazzo", followersApprox: "~297K?", focus: "Psicanálise: relacionamento, dependência emocional, vida após separação", pillars: [2, 4], tier: "core" }, // CANDIDATA — verificar ao vivo
    { username: "filosofiayreflexao", followersApprox: "~227K?", focus: "Filosofia/sabedoria/reflexão (frase/carrossel)", pillars: [4, 5], tier: "reach" }, // CANDIDATA — verificar ao vivo
    { username: "sujeitodeconduta", followersApprox: "~107K?", focus: "Desenvolvimento pessoal, autoajuda/livros, motivação", pillars: [4, 5], tier: "reach" }, // CANDIDATA — verificar ao vivo
    { username: "reflexoes_estoicas", followersApprox: "?", focus: "Citações estoicas (M. Aurélio/Sêneca/Epicteto)", pillars: [4, 5], tier: "reach" }, // CANDIDATA — verificar ao vivo
    { username: "istonaoefilosofia", followersApprox: "?", focus: "Prof. Vitor Lima, filosofia (checar: pode ser mais Reels de fala que carrossel)", pillars: [4, 5], tier: "reach" }, // CANDIDATA — verificar ao vivo
    { username: "amandafitas", followersApprox: "?", focus: "Psicóloga: autoestima e relacionamentos (checar tom — evitar indignação homem-mulher)", pillars: [2, 4], tier: "reach" }, // CANDIDATA — verificar ao vivo
    { username: "thomytalks", followersApprox: "?", focus: "Psicólogo de relacionamentos (verificar se carrossel ou só Reels)", pillars: [2, 4], tier: "reach" }, // CANDIDATA — verificar ao vivo
    { username: "renatadeazevedo.psi", followersApprox: "~65K?", focus: "Terapia de casal/relações (conta média)", pillars: [2, 4], tier: "reach" }, // CANDIDATA — verificar ao vivo
  ],
};

// Cadência diária por conta (freio de segurança). ES (conta antiga) mais agressiva;
// PT (conta nova, já bloqueada uma vez) conservadora. Sempre MUITO abaixo do teto.
export const DAILY_COMMENT_CAP: Record<Lang, number> = { es: 10, pt: 5 };
