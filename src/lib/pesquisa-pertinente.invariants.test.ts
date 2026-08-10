// Trava da PENEIRA DE PERTINÊNCIA — a pesquisa não escolhe o assunto da peça.
//
// Os casos abaixo são REAIS: saíram de `reel_shared_cache`, a mesma tabela que alimentou
// o prompt. O primeiro é o que o dono ouviu em 10/08 e reprovou ("não faz nem 1 sentido"):
// tema sobre incerteza, Reel inteiro sobre prostituição — em ES e em BR.
import { describe, it, expect } from "vitest";
import { pertinenteAoTema, filtrarPesquisa, radicaisDoAssunto } from "./pesquisa-pertinente";

/** Pesquisas que REALMENTE foram entregues ao redator, com o tema da vaga ao lado. */
const FORA_DO_TEMA = [
  {
    topic: "La incertidumbre es lo que engancha",
    title: "Impacto de la prostitución en la salud mental",
    content:
      "El Impacto de la prostitución en la salud mental se refiere a las consecuencias psicológicas, cognitivas y emocionales que experimentan las personas involucradas en la prostitución.",
  },
  {
    topic: "El ambiente te influye, no te absuelve: quien responde por ti eres tú",
    title: "Testigos de Jehová",
    content: "Los Testigos de Jehová son una confesión cristiana milenarista restauracionista.",
  },
  {
    topic: "Gratificación instantánea vs esfuerzo real",
    title: "Racismo institucional",
    content: "El racismo institucional es una forma de racismo expresada en la práctica de instituciones sociales.",
  },
  {
    topic: "Entrenados para elegir, nunca para mantener",
    title: "Ra's al Ghul",
    content: "Ra's al Ghul es un personaje ficticio que aparece en los cómics estadounidenses publicados por DC Comics.",
  },
  {
    topic: "Un desliz no es una recaída",
    title: "Críticas conservadoras al marxismo",
    content: "Las críticas conservadoras al marxismo abarcan objeciones filosóficas, económicas y políticas.",
  },
];

/** Pesquisa que FALA do tema — a peneira não pode comer estas. */
const NO_TEMA = [
  {
    topic: "Adicción a las redes sociales",
    title: "Adicción a redes sociales",
    content: "La adicción a las redes sociales es un uso compulsivo de plataformas digitales.",
  },
  {
    topic: "La incertidumbre es lo que engancha",
    title: "Refuerzo intermitente",
    content: "La recompensa impredecible mantiene la conducta: la incertidumbre sostiene el enganche.",
  },
  {
    // casa por RADICAL, não por palavra inteira: "incertidumbre" ↔ "incertidumbres"
    topic: "La tiranía de la espera",
    title: "Espera y ansiedad",
    content: "Las esperas prolongadas producen ansiedad anticipatoria.",
  },
];

describe("peneira — o que fez o Reel falar de outra coisa fica DE FORA", () => {
  for (const c of FORA_DO_TEMA) {
    it(`«${c.topic.slice(0, 38)}…» não aceita «${c.title}»`, () => {
      expect(pertinenteAoTema(c.topic, c)).toBe(false);
    });
  }
});

describe("peneira — o que fala do tema PASSA (falso positivo custaria a vaga)", () => {
  for (const c of NO_TEMA) {
    it(`«${c.topic.slice(0, 38)}…» aceita «${c.title}»`, () => {
      expect(pertinenteAoTema(c.topic, c)).toBe(true);
    });
  }
});

describe("peneira — o contrato de quem chama", () => {
  it("separa mantidos e descartados sem perder nem inventar item", () => {
    const topic = "La incertidumbre es lo que engancha";
    const entrada = [FORA_DO_TEMA[0], NO_TEMA[1]];
    const { mantidos, descartados } = filtrarPesquisa(topic, entrada);
    expect(mantidos).toHaveLength(1);
    expect(descartados).toHaveLength(1);
    expect(mantidos.length + descartados.length).toBe(entrada.length);
    expect(descartados[0].title).toContain("prostitución");
  });

  it("lista vazia, nula ou indefinida devolve vazio — nunca estoura", () => {
    for (const v of [[], null, undefined]) {
      expect(filtrarPesquisa("tema qualquer", v).mantidos).toHaveLength(0);
    }
  });

  it("tema só com palavras vazias mantém tudo (sem régua, não se barra às cegas)", () => {
    expect(pertinenteAoTema("de lo que es", { title: "Qualquer coisa", content: "texto" })).toBe(true);
  });

  it("palavras vazias não servem de ponte entre tema e resultado", () => {
    const r = radicaisDoAssunto("La incertidumbre es lo que engancha");
    for (const vazia of ["la", "es", "lo", "que"]) expect(r.has(vazia)).toBe(false);
    expect(r.has("incer")).toBe(true);
    expect(r.has("engan")).toBe(true);
  });

  it("só o COMEÇO do texto conta — verbete comprido não aprova por encostar no fim", () => {
    const enchimento = "palabra ".repeat(200);
    const r = { title: "Tema alheio", content: `${enchimento} incertidumbre` };
    expect(pertinenteAoTema("La incertidumbre es lo que engancha", r)).toBe(false);
  });
});
