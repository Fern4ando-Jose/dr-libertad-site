// ─── Motor de engajamento (auto-resposta a comentários + DM do funil) ─────────
// Gera respostas na VOZ da marca para os comentários nos NOSSOS posts e, quando o
// comentário contém a palavra-chave de uma campanha, dispara 1 DM (funil comment→DM,
// mecanismo oficial "private reply" do Instagram).
//
// O que mora aqui:
//   • DECISÕES PURAS (testáveis, sem rede): se devemos responder, detecção de
//     palavra-chave, normalização. São o coração das travas (anti-loop, anti-tóxico).
//   • PROMPT BUILDERS puros (voz + contexto do post + comentário → string).
//   • generateText(): a ÚNICA parte com I/O — chama o haiku (mesmo padrão do
//     generateContent) e registra o gasto no balde `ig-engagement`.
//
// Régua de sobrevivência da conta: NUNCA produzimos ódio (a guarda está na voz) e
// NÃO engajamos veneno (comentário tóxico → SKIP, não revidamos). Ver `voice.ts`.

import { logSpend, anthropicCost } from "./spend";

const ENGAGEMENT_MODEL = "claude-haiku-4-5-20251001";

// ── Normalização (lowercase + sem acento) p/ detecção robusta de palavra-chave ──
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacríticos (combining marks)
    .trim();
}

// ── Detecção da palavra-chave do funil (case/acento-insensível, palavra inteira) ─
export function detectKeyword(text: string, keyword: string): boolean {
  if (!keyword) return false;
  const t = normalizeText(text);
  const k = normalizeText(keyword);
  if (!k) return false;
  // limite de palavra: evita casar "guialibre" quando a chave é "guia"
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(k)}([^\\p{L}\\p{N}]|$)`, "u");
  return re.test(t);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Heurística anti-tóxico: NÃO engajamos veneno (fail-toward-SKIP) ─────────────
// Conservadora de propósito: não é moderação de conteúdo, é só evitar que a marca
// responda automaticamente a insulto/spam. Na dúvida, NÃO responde (mais seguro do
// que responder algo que vire briga). A guarda anti-ódio da NOSSA fala está na voz.
const TOXIC_HINTS = [
  // insultos/ataques pessoais comuns ES/PT (núcleo enxuto; ampliar conforme aparecer)
  "idiota", "imbecil", "imbécil", "burro", "estupido", "estúpido", "lixo", "basura",
  "merda", "mierda", "fdp", "vsf", "vtnc", "puto", "puta", "retardado", "otario", "otário",
];
// Só sinais claros de spam/divulgação externa (links). "seguidores" sozinho NÃO
// entra — é palavra legítima na comunidade; pegaria comentário real.
const SPAM_HINTS = ["http://", "https://", "www.", "t.me/", "bit.ly", "wa.me/"];

export function looksToxicOrSpam(text: string): boolean {
  const t = normalizeText(text);
  if (TOXIC_HINTS.some((w) => t.includes(w))) return true;
  if (SPAM_HINTS.some((w) => t.includes(normalizeText(w)))) return true;
  return false;
}

// ── Decisão central: devemos auto-responder este comentário? (PURA) ─────────────
export interface CommentInput {
  /** id do comentário (na Graph API). */
  commentId: string;
  /** texto do comentário. */
  text: string;
  /** id (IGSID) de quem comentou. */
  fromId: string;
  /** id da NOSSA conta que recebeu o evento (entry.id do webhook). */
  selfId: string;
  /** ids de comentários que NÓS mesmos criamos (respostas) — anti-loop forte. */
  authoredIds?: Set<string>;
}

export type SkipReason =
  | "own-account"      // comentário da própria conta (anti-loop)
  | "authored-by-us"   // é uma resposta que nós criamos (anti-loop)
  | "empty"            // sem texto útil
  | "toxic-or-spam";   // veneno/spam → não engajamos

export interface Decision {
  reply: boolean;
  reason?: SkipReason;
}

export function decideComment(input: CommentInput): Decision {
  const { commentId, text, fromId, selfId, authoredIds } = input;
  // Anti-loop (rede dupla): a própria conta OU um comentário que nós autoramos.
  if (fromId && selfId && fromId === selfId) return { reply: false, reason: "own-account" };
  if (authoredIds && authoredIds.has(commentId)) return { reply: false, reason: "authored-by-us" };
  const clean = (text ?? "").trim();
  if (clean.length < 2) return { reply: false, reason: "empty" };
  if (looksToxicOrSpam(clean)) return { reply: false, reason: "toxic-or-spam" };
  return { reply: true };
}

// ── Prompt builders (PUROS) ─────────────────────────────────────────────────────

export interface PostContext {
  /** tema/título do post onde veio o comentário (dá contexto à resposta). */
  topic?: string | null;
  title?: string | null;
  /** idioma do destino, p/ instruir a resposta. */
  langName: string;
}

export function buildReplyPrompt(voiceDirective: string, comment: string, ctx: PostContext): string {
  const postRef = [ctx.title && `Título: "${ctx.title}"`, ctx.topic && `Tema: "${ctx.topic}"`]
    .filter(Boolean)
    .join(" · ");
  return `${voiceDirective}

CONTEXTO DEL POST (para que tu respuesta tenga sentido, no lo cites literal):
${postRef || "(sin contexto adicional)"}

UN SEGUIDOR COMENTÓ:
"""${comment.trim()}"""

Responde a ese comentario en ${ctx.langName}, con la VOZ de la marca:
- 1 o 2 frases, MÁXIMO ~280 caracteres. Es un comentario de Instagram, no un ensayo.
- Habla a "tú", concreto y con alma. Suma una idea o un giro — no un "gracias" genérico.
- Si el comentario aporta, profundiza; si rebate, sostén la idea con altura (sin insultar).
- Sin hashtags, sin emojis de relleno, sin sonar bot ni coach.
Devuelve SOLO el texto de la respuesta, sin comillas ni prefijos.`;
}

export function buildDmPrompt(
  voiceDirective: string,
  comment: string,
  ctx: PostContext,
  leadMagnet: { name: string; url?: string | null } | null,
): string {
  const deliver = leadMagnet
    ? `Entrega esto en el mensaje: "${leadMagnet.name}"${leadMagnet.url ? ` — enlace: ${leadMagnet.url}` : ""}. Preséntalo con la voz de la marca, no como spam.`
    : `Aún no hay material que entregar: abre conversación con la voz de la marca, invita a contarte más sobre lo que comentó. NO inventes enlaces ni promesas.`;
  return `${voiceDirective}

CONTEXTO: alguien comentó "${comment.trim()}" en un post (${ctx.title ?? ctx.topic ?? ""}) y pidió el material. Le escribes un DM privado en ${ctx.langName}.
${deliver}
Reglas: 2-4 frases, cálido pero con alma de marca, a "tú", sin sonar plantilla ni bot. Devuelve SOLO el texto del mensaje, sin comillas.`;
}

// ── Geração via haiku (ÚNICA parte com I/O) ─────────────────────────────────────
// Mesmo contrato do generateContent: chama a API da Anthropic e registra o gasto no
// balde `ig-engagement`. Devolve o texto limpo. Lança em erro de rede (o chamador
// trata best-effort — webhook nunca deixa de devolver 200).
export async function generateText(prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ENGAGEMENT_MODEL,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  const data = await res.json();
  await logSpend({
    automation: "ig-engagement",
    platform: "anthropic",
    operation: "engagement",
    model: ENGAGEMENT_MODEL,
    units: (data?.usage?.input_tokens ?? 0) + (data?.usage?.output_tokens ?? 0),
    costUsd: anthropicCost(ENGAGEMENT_MODEL, data?.usage),
  });
  const raw: string = data?.content?.[0]?.text ?? "";
  return raw.trim().replace(/^["']|["']$/g, "").trim();
}
