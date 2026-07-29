// Invariantes do motor de engajamento. São as travas que NÃO podem regredir:
//   • anti-loop: nunca responder a própria conta nem a uma resposta que nós criamos;
//   • não engajar veneno: comentário tóxico/spam → SKIP (não revidamos);
//   • idempotência de decisão: comentário vazio → SKIP;
//   • guarda anti-ódio SEMPRE presente na voz (sobrevivência da conta);
//   • detecção da palavra-chave do funil robusta (acento/caixa, palavra inteira);
//   • o prompt de resposta carrega a voz + pede texto curto, sem virar ensaio/bot.
import { describe, it, expect } from "vitest";
import { accountFor } from "./accounts";
import { buildVoiceDirective } from "./voice";
import {
  normalizeText,
  detectKeyword,
  mediaAllowedForFunnel,
  looksToxicOrSpam,
  decideComment,
  decideDm,
  buildReplyPrompt,
  buildDmReplyPrompt,
  normalizeReply,
  isDuplicateReply,
  buildAntiRepeatDirective,
  generateDistinctText,
  FUNNEL_DM_VARIATIONS,
  pickFunnelDm,
  renderFunnelDm,
} from "./engagement";

const base = { commentId: "c1", selfId: "ACC", fromId: "user1" };

describe("mediaAllowedForFunnel — escopo opcional do funil por Reel", () => {
  it("env vazia/ausente → dispara em qualquer post (sem regressão)", () => {
    expect(mediaAllowedForFunnel(undefined, "111")).toBe(true);
    expect(mediaAllowedForFunnel("", "111")).toBe(true);
    expect(mediaAllowedForFunnel("   ", null)).toBe(true);
  });
  it("lista setada → só dispara nos media_id listados", () => {
    expect(mediaAllowedForFunnel("111,222", "222")).toBe(true);
    expect(mediaAllowedForFunnel("111,222", "333")).toBe(false);
  });
  it("aceita espaços na lista (ES + PT numa env só)", () => {
    expect(mediaAllowedForFunnel(" 111 , 222 ", "111")).toBe(true);
  });
  it("lista setada mas media_id ausente → NÃO dispara (fail-closed no escopo)", () => {
    expect(mediaAllowedForFunnel("111", null)).toBe(false);
  });
});

describe("decideComment — travas de quem responder", () => {
  it("anti-loop: NÃO responde comentário da própria conta", () => {
    const d = decideComment({ ...base, fromId: "ACC", text: "qualquer coisa" });
    expect(d.reply).toBe(false);
    expect(d.reason).toBe("own-account");
  });

  it("anti-loop: NÃO responde uma resposta que nós mesmos criamos", () => {
    const d = decideComment({ ...base, text: "olá", authoredIds: new Set(["c1"]) });
    expect(d.reply).toBe(false);
    expect(d.reason).toBe("authored-by-us");
  });

  it("NÃO responde comentário vazio/trivial", () => {
    expect(decideComment({ ...base, text: "" }).reply).toBe(false);
    expect(decideComment({ ...base, text: " " }).reply).toBe(false);
    expect(decideComment({ ...base, text: "a" }).reason).toBe("empty");
  });

  it("NÃO engaja veneno: comentário tóxico → skip (não revidamos)", () => {
    const d = decideComment({ ...base, text: "você é um idiota" });
    expect(d.reply).toBe(false);
    expect(d.reason).toBe("toxic-or-spam");
  });

  it("NÃO engaja spam com link externo", () => {
    const d = decideComment({ ...base, text: "compre em https://spam.example" });
    expect(d.reply).toBe(false);
    expect(d.reason).toBe("toxic-or-spam");
  });

  it("responde comentário legítimo", () => {
    const d = decideComment({ ...base, text: "isso mudou minha forma de ver o celular" });
    expect(d.reply).toBe(true);
    expect(d.reason).toBeUndefined();
  });
});

describe("decideDm — auto-resposta a DM do Direct (inbound)", () => {
  const b = { messageId: "m1", selfId: "ACC", senderId: "user1" };

  it("anti-loop: NUNCA responde eco da nossa própria mensagem (is_echo)", () => {
    const d = decideDm({ ...b, text: "oi", isEcho: true });
    expect(d.reply).toBe(false);
    expect(d.reason).toBe("echo");
  });

  it("anti-loop: NÃO responde DM enviado pela própria conta", () => {
    const d = decideDm({ ...b, senderId: "ACC", text: "oi" });
    expect(d.reply).toBe(false);
    expect(d.reason).toBe("own-account");
  });

  it("NÃO responde DM vazio e NÃO engaja veneno", () => {
    expect(decideDm({ ...b, text: "" }).reason).toBe("empty");
    expect(decideDm({ ...b, text: "seu lixo" }).reason).toBe("toxic-or-spam");
  });

  it("responde DM legítimo", () => {
    const d = decideDm({ ...b, text: "como faço o detox de 7 dias?" });
    expect(d.reply).toBe(true);
  });
});

describe("buildDmReplyPrompt — conversa 1:1, curta, com voz", () => {
  const v = buildVoiceDirective(accountFor("br"));
  it("carrega a voz, a mensagem e pede só o texto curto", () => {
    const p = buildDmReplyPrompt(v, "vi seu post, faz sentido", { langName: "português do Brasil", topic: null, title: null });
    expect(p).toContain("JAMÁS del odio");
    expect(p).toContain("vi seu post, faz sentido");
    expect(p).toMatch(/SOLO el texto/);
    expect(p).toMatch(/1 a 3 frases/);
  });
});

describe("detectKeyword — gatilho do funil comment→DM", () => {
  it("casa palavra inteira, insensível a caixa e acento", () => {
    expect(detectKeyword("quero o GUIA", "guia")).toBe(true);
    expect(detectKeyword("me manda o guía por favor", "guia")).toBe(true);
    expect(detectKeyword("LIBERTAD", "libertad")).toBe(true);
  });

  it("NÃO casa substring de outra palavra", () => {
    expect(detectKeyword("guialibre nao conta", "guia")).toBe(false);
  });

  it("keyword vazia nunca dispara", () => {
    expect(detectKeyword("guia", "")).toBe(false);
  });
});

describe("looksToxicOrSpam / normalizeText", () => {
  it("normaliza caixa e acento", () => {
    expect(normalizeText("Atenção À TELA")).toBe("atencao a tela");
  });
  it("texto saudável não é tóxico", () => {
    expect(looksToxicOrSpam("ótimo ponto, vou repensar isso")).toBe(false);
  });
});

describe("buildVoiceDirective — alma + guarda anti-ódio (INVIOLÁVEL)", () => {
  it("ES: traz a marca, a freedom e a guarda anti-ódio; sem marketBrief", () => {
    const v = buildVoiceDirective(accountFor("es"));
    expect(v).toContain("Dr. Libertad");
    expect(v).toContain("libertad");
    expect(v).toMatch(/JAMÁS del odio/);
    expect(v).not.toContain("MERCADO / VOZ NATIVA");
  });

  it("PT: injeta o marketBrief nativo (regenera, não traduz) e mantém a guarda", () => {
    const v = buildVoiceDirective(accountFor("br"));
    expect(v).toContain("Dr. Liberdade");
    expect(v).toContain("MERCADO / VOZ NATIVA");
    expect(v).toMatch(/JAMÁS del odio/);
  });
});

describe("buildReplyPrompt — resposta curta, com voz, sem virar ensaio", () => {
  const v = buildVoiceDirective(accountFor("es"));
  const ctx = { langName: "español", topic: "dopamina", title: "Revisas el móvil 144 veces al día" };

  it("carrega a voz, o comentário e o contexto do post", () => {
    const p = buildReplyPrompt(v, "esto me describe", ctx);
    expect(p).toContain("JAMÁS del odio");
    expect(p).toContain("esto me describe");
    expect(p).toContain("español");
    expect(p).toContain("Revisas el móvil 144 veces al día");
  });

  it("pede resposta curta e só o texto (sem aspas/prefixo)", () => {
    const p = buildReplyPrompt(v, "x", ctx);
    expect(p).toMatch(/MÁXIMO ~280/);
    expect(p).toMatch(/SOLO el texto/);
  });
});

// ── Funil comment→DM: ROTAÇÃO de copy APROVADA (substituiu o buildDmPrompt/haiku) ──
// Invariante: DM do funil sai de copy APROVADA (8 variações), com {LINK} preenchido pela
// env do lead no envio, anti-repetição por miolo, e NUNCA vaza "{LINK}" cru nem outro idioma.
describe("funil comment→DM — rotação de copy aprovada (sem custo de API)", () => {
  it("4 variações por idioma; toda variação tem {LINK} e a assinatura certa", () => {
    for (const lang of ["es", "br"] as const) {
      const pool = FUNNEL_DM_VARIATIONS[lang];
      expect(pool.length).toBe(4);
      for (const v of pool) {
        expect(v).toContain("{LINK}");
        expect(v).toMatch(lang === "es" ? /Dr\. Libertad/ : /Dr\. Liberdade/);
      }
    }
  });

  it("renderFunnelDm troca {LINK} pela URL do lead (nunca hardcodada)", () => {
    const out = renderFunnelDm("olha isto\nadelanto: {LINK}\nabraço", "https://x.com/y");
    expect(out).toContain("https://x.com/y");
    expect(out).not.toContain("{LINK}");
  });

  it("renderFunnelDm SEM URL remove a linha do link (não deixa {LINK} cru nem link quebrado)", () => {
    const out = renderFunnelDm("olha isto\nadelanto: {LINK}\nabraço", null);
    expect(out).not.toContain("{LINK}");
    expect(out).toContain("olha isto");
    expect(out).toContain("abraço");
  });

  it("pickFunnelDm sorteia do pool do idioma — nunca devolve outro idioma", () => {
    expect(FUNNEL_DM_VARIATIONS.es).toContain(pickFunnelDm("es", [], { rand: () => 0 }));
    expect(FUNNEL_DM_VARIATIONS.br).toContain(pickFunnelDm("br", [], { rand: () => 0.99 }));
  });

  it("anti-repetição: evita a variação já enviada (compara o miolo, ignora o link)", () => {
    const pool = FUNNEL_DM_VARIATIONS.br;
    const jaEnviada = renderFunnelDm(pool[0], "https://www.drlibertad.com/br/livros/i-love-dopamina");
    // rand=0 escolheria o índice 0; como foi filtrado por já-enviado, cai em outra
    const pick = pickFunnelDm("br", [jaEnviada], { rand: () => 0 });
    expect(pick).not.toBe(pool[0]);
    expect(pool).toContain(pick);
  });

  it("todas já enviadas → recomeça do pool (não trava, sempre entrega o lead)", () => {
    const pool = FUNNEL_DM_VARIATIONS.es;
    expect(pool).toContain(pickFunnelDm("es", pool, { rand: () => 0 }));
  });

  it("idioma sem pool → null (chamador não envia)", () => {
    expect(pickFunnelDm("xx", [])).toBe(null);
  });
});

// ── Trava ANTI-REPETIÇÃO (bug do funil 25/06: mesma frase em comentários distintos) ──
// Invariante: NUNCA enviar uma resposta que normaliza-igual a uma já enviada no
// mesmo post/janela. A blindagem é de TEXTO (a idempotência por comment_id não pega).
describe("anti-repetição — normalizeReply / isDuplicateReply", () => {
  it("normaliza p/ comparar: caixa, acento, pontuação e emoji não contam", () => {
    expect(normalizeReply("Ninguém te deve nada.")).toBe(normalizeReply("ninguem te deve nada"));
    expect(normalizeReply("Ninguém te deve nada! 🔥")).toBe(normalizeReply("ninguem, te  deve nada"));
  });

  it("detecta resposta IGUAL já enviada (mesmo que difira só em pontuação/emoji)", () => {
    const recent = ["Ninguém te deve nada.", "Voar mais alto não é traição."];
    expect(isDuplicateReply("ninguem te deve nada!!! 🔥", recent)).toBe(true);
    expect(isDuplicateReply("Você decide a quem dá esse poder.", recent)).toBe(false);
  });

  it("candidato que normaliza p/ vazio (só emoji/pontuação) NÃO bloqueia", () => {
    expect(isDuplicateReply("🔥🔥🔥", ["qualquer coisa"])).toBe(false);
    expect(isDuplicateReply("...", [])).toBe(false);
  });

  it("histórico vazio nunca é duplicado", () => {
    expect(isDuplicateReply("primeira resposta do post", [])).toBe(false);
  });
});

describe("anti-repetição — buildAntiRepeatDirective", () => {
  it("lista as frases a evitar quando há histórico", () => {
    const d = buildAntiRepeatDirective(["frase A", "frase B"]);
    expect(d).toContain("frase A");
    expect(d).toContain("frase B");
    expect(d).toMatch(/EVITA repetir/);
  });
  it("vazio quando não há histórico (não polui o prompt)", () => {
    expect(buildAntiRepeatDirective([])).toBe("");
    expect(buildAntiRepeatDirective(["   ", ""])).toBe("");
  });
});

describe("anti-repetição — generateDistinctText (loop de regeneração, gerador injetável)", () => {
  it("gerador que SEMPRE devolve a mesma frase → duplicate:true (chamador público pula)", async () => {
    let calls = 0;
    const r = await generateDistinctText(() => "p", ["Ninguém te deve nada"], {
      tries: 3,
      gen: async () => { calls++; return "ninguém te deve nada!"; },
    });
    expect(r.duplicate).toBe(true);
    expect(calls).toBe(3); // tentou de novo, não desistiu na 1ª
  });

  it("regenera até sair DISTINTA e devolve a nova (duplicate:false)", async () => {
    const outs = ["Ninguém te deve nada", "Você decide a quem dá esse poder"];
    let i = 0;
    const r = await generateDistinctText(() => "p", ["ninguem te deve nada"], {
      tries: 3,
      gen: async () => outs[i++] ?? "",
    });
    expect(r.duplicate).toBe(false);
    expect(r.text).toBe("Você decide a quem dá esse poder");
  });

  it("o prompt recebe as frases a evitar (diversifica já na 1ª geração)", async () => {
    let seen = "";
    await generateDistinctText(
      (avoid) => "BASE" + buildAntiRepeatDirective(avoid),
      ["frase usada antes"],
      { tries: 1, gen: async (p) => { seen = p; return "nova"; } },
    );
    expect(seen).toContain("frase usada antes");
  });
});
