// ─── ia-texto: a ponte Anthropic⇄DeepSeek não pode mentir em nenhum sentido ───
// A migração de 2026-08-16 (ordem do dono: texto sai do Claude, vai ao DeepSeek) só é
// segura se: (1) o corpo Anthropic vira corpo OpenAI SEM perder system/schema/max_tokens;
// (2) a resposta DeepSeek volta EXATAMENTE no formato que os 5 chamadores já liam
// (content[0].text, usage.input_tokens); (3) sem a chave DeepSeek, a chamada sai para a
// Anthropic byte a byte como antes (o site nunca fica mudo); (4) o custo é calculado na
// tabela do provedor que respondeu (o registro de gasto não pode mentir — P2).
// Tudo SEM rede: fetch é dublê. Espelha a ponte das esteiras (escritor.mjs).
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  chamarIATexto,
  converterCorpoParaDeepSeek,
  custoIATexto,
  normalizarRespostaDeepSeek,
  temChaveIATexto,
  MODELO_DEEPSEEK,
} from "@/lib/ia-texto";
import { anthropicCost, deepseekCost } from "@/lib/spend";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

// ─── IDA: corpo Anthropic → corpo DeepSeek (formato OpenAI) ───────────────────
describe("converterCorpoParaDeepSeek", () => {
  it("força o modelo deepseek-chat, vira system em message e preserva max_tokens", () => {
    const out = converterCorpoParaDeepSeek({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: "Você é o editor.",
      messages: [{ role: "user", content: "Escreva a peça." }],
    });
    expect(out.model).toBe(MODELO_DEEPSEEK);
    expect(out.max_tokens).toBe(512);
    expect(out.messages[0]).toEqual({ role: "system", content: "Você é o editor." });
    expect(out.messages[1]).toEqual({ role: "user", content: "Escreva a peça." });
    expect(out.response_format).toBeUndefined(); // sem schema, sem json_object
  });

  it("system em BLOCOS (formato Anthropic) vira um texto só, na ordem", () => {
    const out = converterCorpoParaDeepSeek({
      model: "m",
      system: [
        { type: "text", text: "bloco 1" },
        { type: "text", text: "bloco 2" },
      ],
      messages: [{ role: "user", content: "oi" }],
    });
    expect(out.messages[0]).toEqual({ role: "system", content: "bloco 1\n\nbloco 2" });
  });

  it("schema do output_config é INJETADO no último prompt + response_format json_object", () => {
    const schema = { type: "object", properties: { versoes: { type: "array" } } };
    const out = converterCorpoParaDeepSeek({
      model: "m",
      messages: [{ role: "user", content: "Escreva 3 versões." }],
      output_config: { format: { schema } },
    });
    const user = out.messages.find((m) => m.role === "user")!;
    expect(user.content).toContain("Escreva 3 versões."); // o pedido original não some
    expect(user.content).toContain(JSON.stringify(schema)); // o schema vai no prompt
    expect(out.response_format).toEqual({ type: "json_object" });
  });

  it("não MUTA o corpo original (o chamador pode reusar em retry)", () => {
    const corpo = {
      model: "m",
      messages: [{ role: "user" as const, content: "original" }],
      output_config: { format: { schema: { type: "object" } } },
    };
    converterCorpoParaDeepSeek(corpo);
    expect(corpo.messages[0].content).toBe("original");
  });
});

// ─── VOLTA: resposta DeepSeek (OpenAI) → formato Anthropic ────────────────────
describe("normalizarRespostaDeepSeek", () => {
  it("choices → content[0].text; usage mapeia cache miss/hit como o ledger cobra", () => {
    const r = normalizarRespostaDeepSeek({
      choices: [{ message: { content: '{"ok":true}' }, finish_reason: "stop" }],
      usage: {
        prompt_tokens: 1000,
        prompt_cache_miss_tokens: 700,
        prompt_cache_hit_tokens: 300,
        completion_tokens: 50,
      },
    });
    expect(r.content?.[0]).toEqual({ type: "text", text: '{"ok":true}' });
    expect(r.stop_reason).toBe("stop");
    expect(r.usage).toEqual({
      input_tokens: 700, // só o cache-MISS (preço cheio)
      output_tokens: 50,
      cache_read_input_tokens: 300, // o cache-HIT (0.1x)
      cache_creation_input_tokens: 0,
    });
  });

  it("content_filter vira stop_reason 'refusal' (o vocabulário que os chamadores conhecem)", () => {
    const r = normalizarRespostaDeepSeek({
      choices: [{ message: { content: "" }, finish_reason: "content_filter" }],
    });
    expect(r.stop_reason).toBe("refusal");
  });

  it("resposta SEM choices (dublê/já-Anthropic) passa como veio — nunca quebra", () => {
    const jaAnthropic = { content: [{ type: "text", text: "oi" }], usage: { input_tokens: 1 } };
    expect(normalizarRespostaDeepSeek(jaAnthropic)).toBe(jaAnthropic);
    expect(normalizarRespostaDeepSeek(null)).toEqual({});
  });
});

// ─── A CHAMADA inteira, ida-e-volta, com dublê de fetch (zero rede, zero gasto) ──
describe("chamarIATexto — o roteamento por chave", () => {
  const respostaDeepSeek = {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: "texto do deepseek" }, finish_reason: "stop" }],
      usage: { prompt_cache_miss_tokens: 10, prompt_cache_hit_tokens: 5, completion_tokens: 3 },
    }),
  } as unknown as Response;

  const respostaAnthropic = {
    ok: true,
    status: 200,
    json: async () => ({
      content: [{ type: "text", text: "texto do claude" }],
      usage: { input_tokens: 10, output_tokens: 3 },
    }),
  } as unknown as Response;

  it("COM DEEPSEEK_API_KEY: vai ao DeepSeek com Bearer, corpo convertido, e volta em formato Anthropic", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "chave-deep-fake");
    vi.stubEnv("ANTHROPIC_API_KEY", "chave-claude-fake");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(respostaDeepSeek);

    const r = await chamarIATexto({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [{ role: "user", content: "oi" }],
    });

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer chave-deep-fake");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe(MODELO_DEEPSEEK); // nunca o nome Claude no corpo DeepSeek

    // o chamador lê EXATAMENTE como lia a Anthropic — é isso que torna a troca segura
    expect(r.ok).toBe(true);
    expect(r.provedor).toBe("deepseek");
    expect(r.modelo).toBe(MODELO_DEEPSEEK);
    expect(r.dados.content?.[0]?.text).toBe("texto do deepseek");
    expect(r.dados.usage?.input_tokens).toBe(10);
    expect(r.dados.usage?.cache_read_input_tokens).toBe(5);
  });

  it("SEM DEEPSEEK_API_KEY: vai à Anthropic com x-api-key e o corpo INTACTO (fallback = o de sempre)", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "chave-claude-fake");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(respostaAnthropic);

    const corpo = {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [{ role: "user" as const, content: "oi" }],
    };
    const r = await chamarIATexto(corpo);

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("chave-claude-fake");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(JSON.parse(String(init.body))).toEqual(corpo); // nada convertido no caminho antigo

    expect(r.provedor).toBe("anthropic");
    expect(r.modelo).toBe("claude-haiku-4-5-20251001"); // o modelo pedido, não o do DeepSeek
    expect(r.dados.content?.[0]?.text).toBe("texto do claude");
  });

  it("HTTP !ok volta ok:false com o status — o chamador decide (throw ou fail-open)", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "chave-deep-fake");
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({ error: { message: "Insufficient Balance" } }),
    } as unknown as Response);
    const r = await chamarIATexto({ model: "m", messages: [{ role: "user", content: "oi" }] });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(402);
  });

  it("temChaveIATexto: qualquer uma das duas chaves basta; nenhuma = false", () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(temChaveIATexto()).toBe(false);
    vi.stubEnv("DEEPSEEK_API_KEY", "x");
    expect(temChaveIATexto()).toBe(true);
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "y");
    expect(temChaveIATexto()).toBe(true);
  });
});

// ─── O CUSTO segue a tabela do provedor que respondeu (P2: o registro não mente) ──
describe("custoIATexto / deepseekCost", () => {
  it("deepseek-chat: entrada 0.28, cache-hit 0.028, saída 0.42 por 1M (mesmos números da casa)", () => {
    // 1M de cada classe, para o preço ser legível a olho nu
    const usage = { input_tokens: 1_000_000, cache_read_input_tokens: 1_000_000, output_tokens: 1_000_000 };
    expect(deepseekCost("deepseek-chat", usage)).toBeCloseTo(0.28 + 0.028 + 0.42, 10);
    expect(custoIATexto("deepseek", "deepseek-chat", usage)).toBeCloseTo(0.728, 10);
  });

  it("modelo desconhecido no DeepSeek ou usage ausente → 0 (não inventa preço)", () => {
    expect(deepseekCost("deepseek-reasoner", { input_tokens: 1000 })).toBe(0);
    expect(deepseekCost("deepseek-chat", undefined)).toBe(0);
  });

  it("provedor anthropic delega à tabela Anthropic de sempre (haiku $1/$5 por 1M)", () => {
    const usage = { input_tokens: 1_000_000, output_tokens: 1_000_000 };
    expect(custoIATexto("anthropic", "claude-haiku-4-5-20251001", usage)).toBe(
      anthropicCost("claude-haiku-4-5-20251001", usage)
    );
    expect(custoIATexto("anthropic", "claude-haiku-4-5-20251001", usage)).toBeCloseTo(6, 10);
  });
});
