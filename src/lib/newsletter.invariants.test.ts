import { describe, it, expect } from "vitest";
import { renderEmail, buildEssayPrompt, newsletterFrom, type RenderInput } from "./newsletter";
import { ACCOUNTS } from "./accounts";

const base: RenderInput = {
  lang: "pt",
  brand: "Dr. Liberdade",
  handle: "@dr.liberdade.br",
  instagramUrl: "https://instagram.com/dr.liberdade.br",
  subject: "Você não está cansado. Está anestesiado.",
  essayParas: ["Parágrafo um.", "Parágrafo dois."],
  curadoria: [{ title: "O padre ausente" }, { title: "Sem limites, vira opção" }],
  unsubUrl: "https://www.drlibertad.com/api/unsubscribe?token=abc123",
  siteUrl: "https://www.drlibertad.com/pt",
};

describe("newsletter — invariantes", () => {
  it("TODO e-mail carrega o link de descadastro (legal + Política de Privacidade)", () => {
    const { html, text } = renderEmail(base);
    expect(html).toContain(base.unsubUrl);
    expect(text).toContain(base.unsubUrl);
  });

  it("o descadastro aparece nas duas línguas com o rótulo certo", () => {
    const pt = renderEmail({ ...base, lang: "pt" });
    expect(pt.html).toContain("Cancelar inscrição");
    const es = renderEmail({ ...base, lang: "es" });
    expect(es.html).toContain("Cancelar suscripción");
    expect(es.html).toContain(base.unsubUrl);
  });

  it("o assunto e o ensaio entram no corpo", () => {
    const { html, subject } = renderEmail(base);
    expect(subject).toBe(base.subject);
    expect(html).toContain("Parágrafo um.");
    expect(html).toContain("Parágrafo dois.");
  });

  it("HTML não vaza tags por conteúdo não-escapado", () => {
    const { html } = renderEmail({ ...base, subject: "5 < 10 & você > eu" });
    expect(html).toContain("5 &lt; 10 &amp; você &gt; eu");
    expect(html).not.toContain("5 < 10 & você > eu");
  });

  it("sem curadoria, o e-mail ainda renderiza (só o ensaio)", () => {
    const { html } = renderEmail({ ...base, curadoria: [] });
    expect(html).toContain(base.subject);
    expect(html).toContain(base.unsubUrl);
    expect(html).not.toContain("Essa semana no Instagram");
  });

  it("o prompt do ensaio injeta a guarda anti-ódio da voz", () => {
    const prompt = buildEssayPrompt(ACCOUNTS.es, ["solidão masculina"]);
    expect(prompt.toLowerCase()).toContain("jamás del odio");
    expect(prompt).toContain("JSON");
  });

  it("o remetente usa o nome da marca do idioma", () => {
    expect(newsletterFrom(ACCOUNTS.pt)).toContain("Dr. Liberdade");
    expect(newsletterFrom(ACCOUNTS.es)).toContain("Dr. Libertad");
    expect(newsletterFrom(ACCOUNTS.pt)).toContain("@drlibertad.com");
  });
});
