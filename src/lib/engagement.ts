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

// Escopo OPCIONAL do funil comment→DM por POST (media_id). `raw` = a env
// ENGAGEMENT_FUNNEL_MEDIA_IDS (lista de media_id separada por vírgula). Vazio (default)
// → o funil dispara em QUALQUER post nosso (comportamento atual, sem regressão). Setada
// → o funil só dispara nos posts listados (ex.: só o Reel C da campanha, para a isca
// "comenta LIBERDADE/LIBERTAD" não disparar em menção casual à palavra de marca). Os
// media_id das 2 contas (ES + PT) entram na MESMA lista; a checagem é por inclusão.
// Lista setada mas media_id ausente no evento → NÃO dispara (fail-closed no escopo).
export function mediaAllowedForFunnel(raw: string | undefined, mediaId: string | null): boolean {
  const list = (raw ?? "").trim();
  if (!list) return true;
  if (!mediaId) return false;
  return list
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(mediaId);
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
  | "own-account"      // comentário/DM da própria conta (anti-loop)
  | "authored-by-us"   // é uma resposta que nós criamos (anti-loop)
  | "echo"             // eco da NOSSA própria mensagem enviada (anti-loop de DM)
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

// ── Decisão p/ DM do Direct (inbound): devemos auto-responder? (PURA) ───────────
export interface DmInput {
  /** id da mensagem (mid) na Graph API. */
  messageId: string;
  /** texto da mensagem. */
  text: string;
  /** IGSID de quem enviou. */
  senderId: string;
  /** id da NOSSA conta (recipient.id do evento). */
  selfId: string;
  /** echo da nossa própria mensagem (message.is_echo) → NUNCA responder. */
  isEcho?: boolean;
}

export function decideDm(input: DmInput): Decision {
  const { text, senderId, selfId, isEcho } = input;
  // Anti-loop (rede dupla): eco da nossa mensagem OU mensagem cujo remetente é a conta.
  if (isEcho) return { reply: false, reason: "echo" };
  if (senderId && selfId && senderId === selfId) return { reply: false, reason: "own-account" };
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

// Resposta a um DM inbound (alguém te mandou mensagem no Direct). Conversa privada
// 1:1 — mais próxima e direta que a resposta pública de um comentário.
export function buildDmReplyPrompt(voiceDirective: string, message: string, ctx: PostContext): string {
  return `${voiceDirective}

ALGUIEN TE ESCRIBIÓ POR MENSAJE PRIVADO (Direct):
"""${message.trim()}"""

Respóndele en ${ctx.langName}, con la VOZ de la marca, en conversación 1:1:
- 1 a 3 frases. Es un chat, no un ensayo. Cercano pero con alma de marca, a "tú".
- Responde lo que preguntó o aporta una idea con filo; nada de respuesta de bot ni de soporte.
- Si te ataca, sostén la idea con altura, sin insultar; si es spam/veneno, no entres.
- Sin hashtags, sin enlaces inventados.
Devuelve SOLO el texto del mensaje, sin comillas ni prefijos.`;
}

// ── Funil comment→DM: ROTAÇÃO de copy APROVADA (sem custo de API por DM) ─────────
// Antes o DM do funil era GERADO por haiku a cada interação (custo + risco de a IA
// fugir da voz e repetir). Agora sorteamos entre 8 variações APROVADAS pelo guardião-
// editorial (4 por idioma; fonte: `Divulgacao/funil-dm-variacoes.md`) com anti-repetição
// (reusa normalizeReply/isDuplicateReply). Copy fixa e aprovada → custo ZERO por DM.
// O placeholder {LINK} é trocado pela URL do lead (env ENGAGEMENT_LEAD_URL_<LANG>) só no
// ENVIO (renderFunnelDm) — a URL NUNCA é hardcodada aqui (fica na config/env).
export const FUNNEL_DM_VARIATIONS: Record<string, string[]> = {
  es: [
    `Lo pediste, así que acá está. 👊 "I Love Dopamina" no es un manual para "resetear el cerebro" — es entender por qué querés mil cosas y ninguna te alcanza.\n\nLa dopamina no es placer: es ganas. Y las ganas, la pantalla te las vende infinitas.\n\nEl adelanto está acá: {LINK}\n\nLeelo sin prisa. — Dr. Libertad`,
    `Comentaste, y cumplo. Te dejo el adelanto de "I Love Dopamina".\n\nLa pregunta del libro incomoda: ¿por qué con más estímulo que nunca sentís cada vez menos? La culpa no es tuya — qué hacés con eso, sí.\n\nAcá lo tenés: {LINK}\n\nNos leemos. — Dr. Libertad`,
    `Acá va, como pediste: el adelanto de "I Love Dopamina".\n\nNo vine a decirte que sos un adicto. El adicto no elige; vos elegís, cada vez que agarrás el teléfono. El libro es para que veas quién tiene la llave.\n\nEmpezá por acá: {LINK}\n\nCon calma. — Dr. Libertad`,
    `Lo pediste y te lo mando: adelanto de "I Love Dopamina", gratis.\n\nEl problema nunca fue el placer — fue lo fácil que se volvió. Scrolleás horas, te dormís insatisfecho, y al otro día igual. El libro explica el mecanismo, sin sermón.\n\nEstá acá: {LINK}\n\nQue lo disfrutes. — Dr. Libertad`,
  ],
  pt: [
    `Você pediu, então tá aqui. 👊 "I Love Dopamina" não é manual pra "resetar o cérebro" — é entender por que você quer mil coisas e nenhuma satisfaz.\n\nDopamina não é prazer: é vontade. E vontade a tela te vende infinita.\n\nA prévia está aqui: {LINK}\n\nLê sem pressa. — Dr. Liberdade`,
    `Você comentou, e eu cumpro. Te deixo a prévia de "I Love Dopamina".\n\nA pergunta do livro incomoda: por que, com mais estímulo do que nunca, você sente cada vez menos? A culpa não é sua — o que você faz com isso, é.\n\nTá aqui: {LINK}\n\nA gente se lê. — Dr. Liberdade`,
    `Aqui está, como você pediu: a prévia de "I Love Dopamina".\n\nNão vim te chamar de viciado. Viciado não escolhe; você escolhe, toda vez que pega o celular. O livro é pra você ver quem está com a chave.\n\nComeça por aqui: {LINK}\n\nCom calma. — Dr. Liberdade`,
    `Você pediu, tô mandando: prévia de "I Love Dopamina", de graça.\n\nO problema nunca foi o prazer — foi como ele ficou fácil. Você rola por horas, dorme insatisfeito, e no dia seguinte de novo. O livro mostra o mecanismo, sem sermão.\n\nEstá aqui: {LINK}\n\nAproveita. — Dr. Liberdade`,
  ],
};

// Remove o link (o token {LINK} E URLs já renderizadas) para a anti-repetição comparar só
// o MIOLO — o link é igual em todas as variações; só o texto distingue uma da outra.
function funnelBody(s: string): string {
  return (s ?? "").replace(/\{LINK\}/g, " ").replace(/https?:\/\/\S+/g, " ");
}

// Sorteia UMA variação do funil para `lang`, evitando as recém-enviadas (reusa
// normalizeReply/isDuplicateReply, comparando só o miolo). PURA — `rand` injetável p/
// teste. null se não há pool para o idioma (o chamador então não envia DM automática).
export function pickFunnelDm(
  lang: string,
  recent: string[],
  opts?: { rand?: () => number },
): string | null {
  const pool = FUNNEL_DM_VARIATIONS[lang] ?? FUNNEL_DM_VARIATIONS[normalizeText(lang)];
  if (!pool || !pool.length) return null;
  const rand = opts?.rand ?? Math.random;
  const recentBodies = recent.map(funnelBody);
  const fresh = pool.filter((v) => !isDuplicateReply(funnelBody(v), recentBodies));
  const bag = fresh.length ? fresh : pool; // todas já usadas nesta janela → recomeça do pool
  return bag[Math.floor(rand() * bag.length)] ?? bag[0];
}

// Troca {LINK} pela URL do lead no ENVIO. Sem URL → remove a linha inteira do link (nunca
// deixa "{LINK}" cru nem link quebrado no DM) e normaliza as quebras de linha.
export function renderFunnelDm(template: string, leadUrl?: string | null): string {
  if (leadUrl) return template.split("{LINK}").join(leadUrl);
  return template
    .split("\n")
    .filter((l) => !l.includes("{LINK}"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Anti-repetição (NUNCA enviar a MESMA resposta 2x no mesmo post/janela) ───────
// Bug do funil (25/06, @dr.liberdade.br): a MESMA frase saía em comentários
// DIFERENTES. Causa: o haiku colapsa quando o input é quase-constante (comentário
// curto/genérico ou só a palavra-chave do funil + lead magnet fixo) e a idempotência
// só olhava o `comment_id` (impede responder 2x o MESMO comentário, não o mesmo TEXTO
// em comentários distintos). A blindagem é uma trava de TEXTO: normaliza a resposta e
// recusa enviar uma que já mandamos nesta janela/post. Funções puras (testáveis); o
// loop de regeneração (I/O) usa `generateText`.

// Forma canônica p/ comparar respostas: minúsculas, sem acento, só letras/números
// (descarta pontuação, emoji e espaços). Duas respostas que diferem só em pontuação/
// emoji são "a mesma" — é exatamente o colapso que queremos pegar.
export function normalizeReply(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

// true se `candidate` é, em essência, IGUAL a alguma resposta já enviada (`recent`).
// Candidato que normaliza p/ vazio (ex.: só emoji) NÃO bloqueia aqui (tratado fora).
export function isDuplicateReply(candidate: string, recent: string[]): boolean {
  const c = normalizeReply(candidate);
  if (!c) return false;
  return recent.some((r) => normalizeReply(r) === c);
}

// Diretiva injetada no prompt listando as frases JÁ usadas, para o haiku NÃO repeti-las
// (proativo: diversifica já na 1ª geração, não só no retry). Idioma-neutra: é instrução;
// a língua da saída vem da voz/marketBrief da conta. "" se não há histórico.
export function buildAntiRepeatDirective(recent: string[]): string {
  const list = recent.filter((t) => (t ?? "").trim().length > 0).slice(0, 8);
  if (!list.length) return "";
  const bullets = list.map((t) => `— "${t.trim()}"`).join("\n");
  return `

YA RESPONDISTE ANTES (EVITA repetir o parafrasear estas frases; di algo CLARAMENTE DISTINTO, otro ángulo, otras palabras):
${bullets}`;
}

// Gera uma resposta DISTINTA das recentes. `makePrompt(avoid)` recebe a lista a evitar
// (injetada via buildAntiRepeatDirective pelo chamador) e devolve o prompt. Tenta até
// `tries` vezes; se ainda colidir, devolve `duplicate:true` com a última tentativa em
// `text` — o CHAMADOR decide: resposta PÚBLICA de comentário pula (não repete no feed);
// DM 1:1/funil pode enviar mesmo assim (entregar o lead importa e não é visível lado a
// lado). Cada tentativa é uma chamada haiku do balde. `gen` é injetável p/ teste.
export async function generateDistinctText(
  makePrompt: (avoid: string[]) => string,
  recent: string[],
  opts?: { tries?: number; gen?: (prompt: string) => Promise<string> },
): Promise<{ text: string; duplicate: boolean }> {
  const tries = Math.max(1, opts?.tries ?? 3);
  const gen = opts?.gen ?? generateText;
  let avoid = [...recent];
  let last = "";
  for (let i = 0; i < tries; i++) {
    const txt = await gen(makePrompt(avoid));
    if (!txt) return { text: "", duplicate: false }; // geração vazia: trata como skip:empty-gen
    if (!isDuplicateReply(txt, avoid)) return { text: txt, duplicate: false };
    last = txt;
    avoid = [...avoid, txt]; // a próxima tentativa também evita esta
  }
  return { text: last, duplicate: true };
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
