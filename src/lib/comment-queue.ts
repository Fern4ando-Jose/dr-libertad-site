// ─── Esteira de comentário: lógica PURA (testável) ────────────────────────────
// Decisões sem rede: o que é "post fresco" (comentar cedo é o que faz a mega pagar),
// ranqueamento por engajamento AO VIVO, e o prompt do comentário outbound na voz.
// A geração (paga) e o business_discovery (rede) ficam na rota; aqui só o miolo.

export interface DiscoveredPost {
  id: string;
  permalink?: string;
  caption?: string;
  like_count?: number;
  comments_count?: number;
  /** timestamp ISO do post (vem do business_discovery). */
  timestamp?: string;
  media_type?: string;
}

// Quão "fresco" é o post, em minutos. Comentar cedo (topo, antes da enxurrada) é o
// que dá visibilidade numa mega. `nowMs` é injetado p/ testabilidade.
export function postAgeMinutes(timestampIso: string | undefined, nowMs: number): number {
  if (!timestampIso) return Infinity;
  const t = Date.parse(timestampIso);
  if (Number.isNaN(t)) return Infinity;
  return Math.max(0, (nowMs - t) / 60000);
}

// Post "comentável agora": publicado dentro da janela fresca (default 180min). Acima
// disso, numa mega, o comentário afunda → não vale a ficha.
export function isFreshPost(post: DiscoveredPost, nowMs: number, maxAgeMin = 180): boolean {
  return postAgeMinutes(post.timestamp, nowMs) <= maxAgeMin;
}

export interface RankedItem {
  target: string;
  post: DiscoveredPost;
  ageMin: number;
  engagement: number; // curtidas + comentários (proxy de tração ao vivo)
  score: number;
}

// Ranqueia os posts frescos: prioriza FRESCOR (poder comentar cedo) e engajamento.
// score = engajamento / (idade+1) → posts novos e quentes no topo.
export function rankFreshPosts(
  byTarget: Array<{ target: string; posts: DiscoveredPost[] }>,
  nowMs: number,
  maxAgeMin = 180,
): RankedItem[] {
  const items: RankedItem[] = [];
  for (const { target, posts } of byTarget) {
    for (const post of posts) {
      if (!isFreshPost(post, nowMs, maxAgeMin)) continue;
      const ageMin = postAgeMinutes(post.timestamp, nowMs);
      const engagement = (post.like_count ?? 0) + (post.comments_count ?? 0);
      const score = engagement / (ageMin + 1);
      items.push({ target, post, ageMin, engagement, score });
    }
  }
  return items.sort((a, b) => b.score - a.score);
}

// Aplica o teto de cadência (nunca enfileira mais que X/dia por conta) e remove os
// já enfileirados (dedup por id de post).
export function applyCapAndDedup(items: RankedItem[], cap: number, seenIds: Set<string>): RankedItem[] {
  const out: RankedItem[] = [];
  for (const it of items) {
    if (out.length >= cap) break;
    if (seenIds.has(it.post.id)) continue;
    out.push(it);
  }
  return out;
}

// Prompt do comentário OUTBOUND (Fase 2): comentar no post de OUTRA conta, na nossa
// voz, de um jeito que faça a galera querer clicar no nosso perfil — sem puxar saco,
// sem spam, sem citar a marca. A guarda anti-ódio vem na `voiceDirective`.
export function buildCommentPrompt(voiceDirective: string, post: DiscoveredPost, langName: string): string {
  const caption = (post.caption ?? "").slice(0, 600);
  return `${voiceDirective}

Estás comentando en el post de OTRA cuenta de tu nicho (no es tuyo). Objetivo: que la gente que lea tu comentario quiera entrar a TU perfil — por la fuerza de la idea, no por halago.

POST AJENO (no lo cites literal, reacciona a su tema):
"""${caption}"""

Escribe UN comentario en ${langName}, con tu VOZ:
- 1 frase, MÁXIMO ~150 caracteres. Afilado, concreto, una verdad incómoda o un giro que aporte al tema del post.
- NADA de "gran contenido", "totalmente de acuerdo", halago genérico ni emojis de relleno.
- NO menciones tu marca, tu @ ni enlaces (eso es spam y hunde la cuenta). El gancho es la IDEA.
- Suma al debate; si discrepas, hazlo con altura, jamás con desprecio.
Devuelve SOLO el texto del comentario, sin comillas ni prefijos.`;
}
