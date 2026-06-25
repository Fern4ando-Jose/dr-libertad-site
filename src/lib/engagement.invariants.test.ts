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
  looksToxicOrSpam,
  decideComment,
  decideDm,
  buildReplyPrompt,
  buildDmPrompt,
  buildDmReplyPrompt,
} from "./engagement";

const base = { commentId: "c1", selfId: "ACC", fromId: "user1" };

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
  const v = buildVoiceDirective(accountFor("pt"));
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
    const v = buildVoiceDirective(accountFor("pt"));
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

describe("buildDmPrompt — funil entrega o lead OU abre conversa (sem inventar link)", () => {
  const v = buildVoiceDirective(accountFor("pt"));
  const ctx = { langName: "português do Brasil", topic: "t", title: "T" };

  it("com lead magnet: inclui nome e link", () => {
    const p = buildDmPrompt(v, "quero", ctx, { name: "Guia X", url: "https://ex.com/g" });
    expect(p).toContain("Guia X");
    expect(p).toContain("https://ex.com/g");
  });

  it("sem lead magnet: NÃO inventa link nem promessa", () => {
    const p = buildDmPrompt(v, "quero", ctx, null);
    expect(p).toMatch(/NO inventes enlaces/);
  });
});
