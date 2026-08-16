// ─── IA DE TEXTO — uma porta só: DeepSeek quando há chave, Claude de reserva ──
// POR QUE EXISTE (ordem do dono, 2026-08-16: "faça um levantamento de que ainda usa a
// API do claude e migra para a do deepseek"): as 5 chamadas de TEXTO do site (copy do
// post, ensaio da newsletter, engajamento, revisor editorial, curador de imagem) falavam
// cada uma direto com a Anthropic. Este módulo é a única ponte: o chamador continua
// montando o corpo no formato Anthropic e lendo `dados.content[0].text` /
// `dados.usage.input_tokens` — a tradução para o formato OpenAI do DeepSeek (e de volta)
// acontece aqui dentro. Espelha a ponte que JÁ RODA em produção nas esteiras:
// D:\Claude\.claude\lib\esteira\escritor.mjs (converterCorpoParaDeepSeek /
// normalizarRespostaDeepSeek). Mudou a conversão lá? Confira aqui.
//
// REGRA DE OURO: sem DEEPSEEK_API_KEY no ambiente, NADA muda — a chamada sai para a
// Anthropic como sempre saiu. O site nunca fica mudo por causa desta migração.
//
// ⚠️ SÓ TEXTO. Quem manda IMAGEM (illustration.ts qa-judge, footage-qa.ts) NÃO passa
// por aqui: o deepseek-chat não enxerga imagem.
//
// P3: a chave sai de process.env e nunca aparece em log, erro ou resposta.

import { anthropicCost, deepseekCost } from "@/lib/spend";

export type ProvedorIA = "deepseek" | "anthropic";

const ENDPOINT_ANTHROPIC = "https://api.anthropic.com/v1/messages";
const ENDPOINT_DEEPSEEK = "https://api.deepseek.com/chat/completions";

/** O modelo que o DeepSeek de fato roda — ele não tem nomes por tarefa. */
export const MODELO_DEEPSEEK = "deepseek-chat";

export interface MensagemTexto {
  role: "user" | "assistant" | "system";
  content: string;
}

/** Corpo no formato Anthropic — o que os chamadores do site já montavam antes. */
export interface CorpoAnthropic {
  model: string;
  max_tokens?: number;
  system?: string | { type?: string; text?: string }[];
  messages: MensagemTexto[];
  output_config?: { format?: { schema?: unknown } };
}

export interface UsoIA {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

/** Resposta no formato Anthropic — o que os chamadores do site já liam antes. */
export interface RespostaAnthropic {
  content?: { type?: string; text?: string }[];
  stop_reason?: string | null;
  usage?: UsoIA;
  error?: { message?: string };
}

interface CorpoDeepSeek {
  model: string;
  messages: { role: string; content: string }[];
  max_tokens?: number;
  response_format?: { type: "json_object" };
}

/** Corpo Anthropic → corpo DeepSeek (formato OpenAI). Força o modelo e injeta o schema no prompt. */
export function converterCorpoParaDeepSeek(corpo: CorpoAnthropic): CorpoDeepSeek {
  const system = Array.isArray(corpo.system)
    ? corpo.system.map((b) => b?.text || "").filter(Boolean).join("\n\n")
    : String(corpo.system || "");
  const messages: { role: string; content: string }[] = [];
  if (system) messages.push({ role: "system", content: system });
  const schema = corpo.output_config?.format?.schema ?? null;
  const user = (corpo.messages || []).map((m) => ({ ...m }));
  if (schema && user.length) {
    const last = user[user.length - 1];
    if (last && last.content) {
      last.content = `${last.content}\n\n⚠️ Responda APENAS com um objeto JSON válido, sem texto fora dele, seguindo EXATAMENTE este schema:\n${JSON.stringify(schema)}`;
    }
  }
  messages.push(...user);
  const out: CorpoDeepSeek = { model: MODELO_DEEPSEEK, messages };
  if (corpo.max_tokens) out.max_tokens = corpo.max_tokens;
  if (schema) out.response_format = { type: "json_object" };
  return out;
}

interface RespostaDeepSeek {
  choices?: { message?: { content?: unknown }; finish_reason?: string | null }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_cache_miss_tokens?: number;
    prompt_cache_hit_tokens?: number;
  };
}

/** Resposta DeepSeek (OpenAI) → o formato que os chamadores leem (Anthropic). */
export function normalizarRespostaDeepSeek(dados: unknown): RespostaAnthropic {
  // Dublê de teste / resposta que já venha no formato Anthropic (sem `choices`): passa
  // como veio — quem chama lê `content[0].text`. O DeepSeek real SEMPRE devolve `choices`.
  const d = dados as RespostaDeepSeek | null;
  if (!d || !Array.isArray(d.choices)) return (dados ?? {}) as RespostaAnthropic;
  const choice = d.choices[0] || {};
  const usage = d.usage || {};
  return {
    content: [{ type: "text", text: String(choice?.message?.content ?? "") }],
    stop_reason:
      choice?.finish_reason === "content_filter" ? "refusal" : (choice?.finish_reason || null),
    usage: {
      // DeepSeek separa cache hit/miss no próprio nome; a tabela de preços cobra miss no
      // preço cheio e hit a 0.1x — mapear assim faz a conta fechar (ver deepseekCost).
      input_tokens: usage.prompt_cache_miss_tokens ?? usage.prompt_tokens ?? 0,
      output_tokens: usage.completion_tokens ?? 0,
      cache_read_input_tokens: usage.prompt_cache_hit_tokens ?? 0,
      cache_creation_input_tokens: 0,
    },
  };
}

/**
 * Há chave para gerar texto? (qualquer um dos dois provedores.)
 * Os chamadores fail-open (revisor, curador) checavam só ANTHROPIC_API_KEY — com a chave
 * do DeepSeek presente, a ausência da Anthropic não pode mais desligar o passo.
 */
export function temChaveIATexto(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY || process.env.ANTHROPIC_API_KEY);
}

export interface RespostaIATexto {
  ok: boolean;
  status: number;
  /** Sempre no formato Anthropic, venha de onde vier. */
  dados: RespostaAnthropic;
  /** Quem respondeu — é o que vai em `platform` no logSpend (o registro não pode mentir, P2). */
  provedor: ProvedorIA;
  /** O modelo que DE FATO rodou ("deepseek-chat" no DeepSeek) — é o que vai em `model` no logSpend. */
  modelo: string;
}

/**
 * A chamada de texto do site. Recebe o corpo no formato Anthropic e:
 *   • com DEEPSEEK_API_KEY  → DeepSeek (corpo convertido, resposta normalizada);
 *   • sem ela               → Anthropic, exatamente como antes (fallback intacto).
 * Não engole erro: HTTP !ok volta em `ok:false` e exceção de rede/timeout sobe ao
 * chamador — cada um dos 5 pontos já tinha o seu tratamento (throw ou fail-open).
 */
export async function chamarIATexto(
  corpo: CorpoAnthropic,
  opts: { timeoutMs?: number } = {}
): Promise<RespostaIATexto> {
  const chaveDeep = process.env.DEEPSEEK_API_KEY;
  const signal = opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined;

  const res = chaveDeep
    ? await fetch(ENDPOINT_DEEPSEEK, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${chaveDeep}`,
        },
        body: JSON.stringify(converterCorpoParaDeepSeek(corpo)),
        signal,
      })
    : await fetch(ENDPOINT_ANTHROPIC, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(corpo),
        signal,
      });

  const provedor: ProvedorIA = chaveDeep ? "deepseek" : "anthropic";
  const modelo = chaveDeep ? MODELO_DEEPSEEK : corpo.model;

  let dados: RespostaAnthropic = {};
  try {
    const bruto: unknown = await res.json();
    dados = chaveDeep ? normalizarRespostaDeepSeek(bruto) : ((bruto ?? {}) as RespostaAnthropic);
  } catch {
    // corpo ilegível: quem chama decide pelo `ok`/`status` — nunca ecoamos o corpo cru (P3)
  }
  return { ok: res.ok, status: res.status, dados, provedor, modelo };
}

/** O custo da chamada, na tabela do provedor que respondeu — para o logSpend não mentir. */
export function custoIATexto(provedor: ProvedorIA, modelo: string, usage: UsoIA | undefined): number {
  return provedor === "deepseek" ? deepseekCost(modelo, usage) : anthropicCost(modelo, usage);
}
