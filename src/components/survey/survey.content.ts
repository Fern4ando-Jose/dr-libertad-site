// ─── Pesquisa "Redes Sociais e Relacionamentos" — TEXTOS PT/ES ───────────────
// Fonte: FUNIL-PERGUNTAS.md + TERMO-CONSENTIMENTO.md (§1) + herói aprovado pelo
// dono em 2026-07-11. As perguntas seguem o funil À RISCA (25 itens, 7 telas);
// a ESTRUTURA (ids/tipos/valores) mora em src/lib/survey-schema.ts (fonte única).

import type { Lang } from "@/lib/i18n/dictionaries";

type OptionLabels = Record<string, string>;

export type SurveyCopy = {
  metaTitle: string;
  metaDescription: string;
  brand: string;
  handle: string;
  instagramUrl: string;
  basePath: string; // "/pesquisa" | "/investigacion"
  termoPath: string;
  thanksPath: string;
  hero: {
    kicker: string;
    titlePre: string; // "As redes sociais estão mudando o amor."
    titleEm: string; //  "A pergunta é: quanto?"
    lede: string;
    chips: string[];
  };
  consent: {
    label: string;
    termLink: string;
    start: string;
  };
  progressLabel: (current: number, total: number) => string;
  nav: {
    back: string;
    next: string;
    submit: string;
    submitting: string;
    incompleteHint: string;
    optionalHint: string;
    error: string;
  };
  freqLabels: OptionLabels; // nunca..sempre
  pnrLabel: string;
  yesnoLabels: OptionLabels; // sim/nao
  scaleAnchors: { low: string; high: string };
  screens: {
    title: string;
    note?: string;
    questions: Record<string, { text: string; options?: OptionLabels; placeholder?: string }>;
  }[];
  email: {
    label: string;
    note: string;
    placeholder: string;
    invalid: string;
  };
  thanks: {
    metaTitle: string;
    title: string;
    body: string;
    cta: string;
    backToSite: string;
  };
  termo: {
    metaTitle: string;
    backLabel: string;
    title: string;
    intro: string;
    items: { heading: string; body: string }[];
    accept: string;
  };
  footerNote: string;
};

const pt: SurveyCopy = {
  metaTitle: "Pesquisa — Redes Sociais e Relacionamentos",
  metaDescription:
    "Estudo sério sobre como as redes sociais afetam os relacionamentos. 3 minutos, anônimo — suas respostas viram parte de um livro.",
  brand: "Dr. Liberdade",
  handle: "@dr.liberdade.br",
  instagramUrl: "https://www.instagram.com/dr.liberdade.br",
  basePath: "/pesquisa",
  termoPath: "/pesquisa/termo",
  thanksPath: "/pesquisa/obrigado",
  hero: {
    kicker: "Estudo editorial · Dr. Liberdade",
    titlePre: "As redes sociais estão mudando o amor.",
    titleEm: "A pergunta é: quanto?",
    lede: "Estamos fazendo um estudo sério sobre como as redes afetam os relacionamentos. São 3 minutos, anônimo, e suas respostas viram parte de um livro sobre o tema.",
    chips: ["3 min", "100% anônimo", "vira livro"],
  },
  consent: {
    label: "Li e aceito o uso anônimo das minhas respostas nesta pesquisa.",
    termLink: "Ler o termo completo",
    start: "Começar a pesquisa",
  },
  progressLabel: (c, t) => `Parte ${c} de ${t}`,
  nav: {
    back: "Voltar",
    next: "Continuar",
    submit: "Enviar respostas",
    submitting: "Enviando…",
    incompleteHint: "Responda todas as perguntas desta parte para continuar.",
    optionalHint: "Tudo aqui é opcional — você pode enviar direto.",
    error: "Não foi possível enviar agora. Tente de novo em instantes.",
  },
  freqLabels: {
    nunca: "Nunca",
    raramente: "Raramente",
    as_vezes: "Às vezes",
    frequentemente: "Frequentemente",
    sempre: "Sempre",
  },
  pnrLabel: "Prefiro não responder",
  yesnoLabels: { sim: "Sim", nao: "Não" },
  scaleAnchors: { low: "1 · discordo totalmente", high: "5 · concordo totalmente" },
  screens: [
    {
      title: "Sobre você",
      questions: {
        q1: {
          text: "Idade",
          options: { "18-24": "18–24", "25-34": "25–34", "35-44": "35–44", "45-54": "45–54", "55+": "55+" },
        },
        q2: {
          text: "Gênero",
          options: {
            feminino: "Feminino",
            masculino: "Masculino",
            outro: "Outro",
            prefiro_nao_dizer: "Prefiro não dizer",
          },
        },
        q3: {
          text: "Status",
          options: {
            solteiro: "Solteiro(a)",
            namorando: "Namorando",
            casado: "Casado(a) / união estável",
            separado: "Separado(a) / divorciado(a)",
            complicado: "É complicado",
          },
        },
        q4: {
          text: "Como você conheceu seu parceiro(a) atual ou mais recente?",
          options: {
            pessoalmente: "Pessoalmente",
            app_namoro: "App de namoro",
            redes_sociais: "Redes sociais",
            amigos: "Amigos em comum",
            trabalho_estudo: "Trabalho / estudo",
            nunca_tive: "Nunca tive relacionamento",
          },
        },
        q5: {
          text: "Quanto tempo por dia você passa em redes sociais?",
          options: { menos_1h: "Menos de 1h", "1_3h": "1–3h", "3_5h": "3–5h", mais_5h: "Mais de 5h" },
        },
        q6: {
          text: "Quais você mais usa? (pode marcar várias)",
          options: {
            instagram: "Instagram",
            tiktok: "TikTok",
            whatsapp: "WhatsApp",
            facebook: "Facebook",
            x: "X",
            apps_namoro: "Apps de namoro",
          },
        },
      },
    },
    {
      title: "Você e as redes",
      questions: {
        q7: { text: "Costumo postar sobre minha vida pessoal/amorosa." },
        q8: { text: "Acompanho a vida amorosa de outras pessoas pelas redes." },
        q9: { text: "Já conversei nas redes com pessoas que não conheço pessoalmente." },
      },
    },
    {
      title: "Comparação e expectativa",
      questions: {
        q10: { text: "Comparo meu relacionamento (ou minha vida amorosa) com o que vejo nas redes." },
        q11: { text: "Ver a vida amorosa dos outros nas redes me deixa mais insatisfeito(a) com a minha." },
        q12: { text: "As redes elevaram o que eu exijo de um(a) parceiro(a) para além do que encontro na vida real." },
        q13: { text: "Já me decepcionei ao conhecer pessoalmente alguém que parecia diferente no perfil." },
      },
    },
    {
      title: "Escolha e presença",
      questions: {
        q14: { text: "Sinto que sempre há alguém “melhor” a um clique de distância." },
        q15: { text: "O excesso de opções dificulta eu me comprometer com uma só pessoa." },
        q16: { text: "Passo mais tempo na tela do que presencialmente com quem me importo." },
        q17: { text: "O tempo que eu (ou meu parceiro(a)) passamos nas redes já tirou atenção do nosso relacionamento." },
      },
    },
    {
      title: "Confiança e fidelidade",
      note: "Parte sensível — alguns itens têm a opção “prefiro não responder”.",
      questions: {
        q18: { text: "As redes aumentaram o ciúme ou a desconfiança no meu relacionamento." },
        q19: { text: "Já chequei o perfil ou a atividade do meu parceiro(a) por desconfiança." },
        q20: { text: "Na minha visão, apps e redes facilitam traições e conversas paralelas." },
        q21: { text: "Já mantive flerte ou conversa nas redes que meu parceiro(a) não sabia." },
        q22: { text: "Já vi um relacionamento (meu ou próximo) terminar por causa das redes sociais." },
      },
    },
    {
      title: "Sua história",
      note: "Opcional — mas é aqui que a pesquisa vira livro.",
      questions: {
        q23: {
          text: "Como as redes mudaram seus relacionamentos — para melhor ou para pior? Conte um caso.",
          placeholder: "Escreva aqui, do seu jeito…",
        },
        q24: {
          text: "Se pudesse mudar uma coisa no seu uso de redes para proteger seu relacionamento, o que seria?",
          placeholder: "Escreva aqui…",
        },
      },
    },
  ],
  email: {
    label: "Toparia contar sua história numa conversa de 30 min (Google Meet, confidencial)? Deixe seu e-mail.",
    note: "Único dado identificável — usado só para agendar a conversa.",
    placeholder: "seu@email.com",
    invalid: "E-mail inválido — corrija ou deixe em branco.",
  },
  thanks: {
    metaTitle: "Obrigado — Pesquisa Redes Sociais e Relacionamentos",
    title: "Obrigado.",
    body: "Suas respostas agora fazem parte do estudo. Os resultados desta pesquisa saem primeiro no Instagram.",
    cta: "Seguir @dr.liberdade.br",
    backToSite: "Conhecer o Dr. Liberdade",
  },
  termo: {
    metaTitle: "Termo de participação — Pesquisa Redes Sociais e Relacionamentos",
    backLabel: "← Voltar à pesquisa",
    title: "Termo de participação — pesquisa “Redes Sociais e Relacionamentos”",
    intro:
      "Esta pesquisa é conduzida por Doutor Liberdade para um estudo editorial (livro) sobre o impacto das redes sociais nos relacionamentos.",
    items: [
      {
        heading: "Anonimato",
        body: "O questionário não coleta nome, telefone nem qualquer identificador. O e-mail é pedido apenas se você quiser participar da entrevista, e serve só para o agendamento.",
      },
      {
        heading: "Uso dos dados",
        body: "As respostas são analisadas de forma agregada (estatísticas) e podem ser citadas no livro e em conteúdos derivados sem qualquer identificação.",
      },
      {
        heading: "Voluntariedade",
        body: "Você pode parar a qualquer momento e pular as perguntas sensíveis (“prefiro não responder”).",
      },
      {
        heading: "Base legal",
        body: "Consentimento (art. 7º, I, LGPD — Lei 13.709/2018). Para remover seus dados de entrevista ou e-mail: contato@drlibertad.com.",
      },
    ],
    accept: "Ao marcar “Li e aceito” na pesquisa, você concorda com este termo.",
  },
  footerNote: "Pesquisa anônima · Estudo editorial Dr. Liberdade",
};

const es: SurveyCopy = {
  metaTitle: "Investigación — Redes Sociales y Relaciones",
  metaDescription:
    "Estudio serio sobre cómo las redes sociales afectan las relaciones. 3 minutos, anónimo — tus respuestas formarán parte de un libro.",
  brand: "Dr. Libertad",
  handle: "@dr.libertad",
  instagramUrl: "https://www.instagram.com/dr.libertad",
  basePath: "/investigacion",
  termoPath: "/investigacion/termino",
  thanksPath: "/investigacion/gracias",
  hero: {
    kicker: "Estudio editorial · Dr. Libertad",
    titlePre: "Las redes sociales están cambiando el amor.",
    titleEm: "La pregunta es: ¿cuánto?",
    lede: "Estamos haciendo un estudio serio sobre cómo las redes afectan las relaciones. Son 3 minutos, anónimo, y tus respuestas formarán parte de un libro sobre el tema.",
    chips: ["3 min", "100% anónimo", "será un libro"],
  },
  consent: {
    label: "Leí y acepto el uso anónimo de mis respuestas en esta investigación.",
    termLink: "Leer el término completo",
    start: "Empezar la investigación",
  },
  progressLabel: (c, t) => `Parte ${c} de ${t}`,
  nav: {
    back: "Volver",
    next: "Continuar",
    submit: "Enviar respuestas",
    submitting: "Enviando…",
    incompleteHint: "Responde todas las preguntas de esta parte para continuar.",
    optionalHint: "Todo aquí es opcional — puedes enviar directamente.",
    error: "No se pudo enviar ahora. Inténtalo de nuevo en unos instantes.",
  },
  freqLabels: {
    nunca: "Nunca",
    raramente: "Rara vez",
    as_vezes: "A veces",
    frequentemente: "Frecuentemente",
    sempre: "Siempre",
  },
  pnrLabel: "Prefiero no responder",
  yesnoLabels: { sim: "Sí", nao: "No" },
  scaleAnchors: { low: "1 · totalmente en desacuerdo", high: "5 · totalmente de acuerdo" },
  screens: [
    {
      title: "Sobre ti",
      questions: {
        q1: {
          text: "Edad",
          options: { "18-24": "18–24", "25-34": "25–34", "35-44": "35–44", "45-54": "45–54", "55+": "55+" },
        },
        q2: {
          text: "Género",
          options: {
            feminino: "Femenino",
            masculino: "Masculino",
            outro: "Otro",
            prefiro_nao_dizer: "Prefiero no decirlo",
          },
        },
        q3: {
          text: "Estado",
          options: {
            solteiro: "Soltero(a)",
            namorando: "De novio(a)",
            casado: "Casado(a) / unión libre",
            separado: "Separado(a) / divorciado(a)",
            complicado: "Es complicado",
          },
        },
        q4: {
          text: "¿Cómo conociste a tu pareja actual o más reciente?",
          options: {
            pessoalmente: "En persona",
            app_namoro: "App de citas",
            redes_sociais: "Redes sociales",
            amigos: "Amigos en común",
            trabalho_estudo: "Trabajo / estudio",
            nunca_tive: "Nunca tuve una relación",
          },
        },
        q5: {
          text: "¿Cuánto tiempo al día pasas en redes sociales?",
          options: { menos_1h: "Menos de 1h", "1_3h": "1–3h", "3_5h": "3–5h", mais_5h: "Más de 5h" },
        },
        q6: {
          text: "¿Cuáles usas más? (puedes marcar varias)",
          options: {
            instagram: "Instagram",
            tiktok: "TikTok",
            whatsapp: "WhatsApp",
            facebook: "Facebook",
            x: "X",
            apps_namoro: "Apps de citas",
          },
        },
      },
    },
    {
      title: "Tú y las redes",
      questions: {
        q7: { text: "Suelo publicar sobre mi vida personal/amorosa." },
        q8: { text: "Sigo la vida amorosa de otras personas por las redes." },
        q9: { text: "He conversado en redes con personas que no conozco en persona." },
      },
    },
    {
      title: "Comparación y expectativa",
      questions: {
        q10: { text: "Comparo mi relación (o mi vida amorosa) con lo que veo en las redes." },
        q11: { text: "Ver la vida amorosa de otros en las redes me deja más insatisfecho(a) con la mía." },
        q12: { text: "Las redes elevaron lo que exijo de una pareja por encima de lo que encuentro en la vida real." },
        q13: { text: "Me he decepcionado al conocer en persona a alguien que parecía diferente en su perfil." },
      },
    },
    {
      title: "Elección y presencia",
      questions: {
        q14: { text: "Siento que siempre hay alguien “mejor” a un clic de distancia." },
        q15: { text: "El exceso de opciones me dificulta comprometerme con una sola persona." },
        q16: { text: "Paso más tiempo en la pantalla que en persona con quienes me importan." },
        q17: { text: "El tiempo que yo (o mi pareja) pasamos en las redes ya le quitó atención a nuestra relación." },
      },
    },
    {
      title: "Confianza y fidelidad",
      note: "Parte sensible — algunos ítems tienen la opción “prefiero no responder”.",
      questions: {
        q18: { text: "Las redes aumentaron los celos o la desconfianza en mi relación." },
        q19: { text: "He revisado el perfil o la actividad de mi pareja por desconfianza." },
        q20: { text: "En mi opinión, las apps y redes facilitan infidelidades y conversaciones paralelas." },
        q21: { text: "He mantenido coqueteo o conversaciones en redes que mi pareja no conocía." },
        q22: { text: "He visto una relación (mía o cercana) terminar por causa de las redes sociales." },
      },
    },
    {
      title: "Tu historia",
      note: "Opcional — pero es aquí donde la investigación se convierte en libro.",
      questions: {
        q23: {
          text: "¿Cómo cambiaron las redes tus relaciones — para bien o para mal? Cuéntanos un caso.",
          placeholder: "Escribe aquí, a tu manera…",
        },
        q24: {
          text: "Si pudieras cambiar una cosa en tu uso de redes para proteger tu relación, ¿qué sería?",
          placeholder: "Escribe aquí…",
        },
      },
    },
  ],
  email: {
    label: "¿Aceptarías contar tu historia en una charla de 30 min (Google Meet, confidencial)? Deja tu e-mail.",
    note: "Único dato identificable — usado solo para agendar la charla.",
    placeholder: "tu@email.com",
    invalid: "E-mail inválido — corrígelo o déjalo en blanco.",
  },
  thanks: {
    metaTitle: "Gracias — Investigación Redes Sociales y Relaciones",
    title: "Gracias.",
    body: "Tus respuestas ahora forman parte del estudio. Los resultados de esta investigación salen primero en Instagram.",
    cta: "Seguir a @dr.libertad",
    backToSite: "Conocer a Dr. Libertad",
  },
  termo: {
    metaTitle: "Término de participación — Investigación Redes Sociales y Relaciones",
    backLabel: "← Volver a la investigación",
    title: "Término de participación — investigación “Redes Sociales y Relaciones”",
    intro:
      "Esta investigación es conducida por Dr. Libertad para un estudio editorial (libro) sobre el impacto de las redes sociales en las relaciones.",
    items: [
      {
        heading: "Anonimato",
        body: "El cuestionario no recoge nombre, teléfono ni ningún identificador. El e-mail se pide solo si quieres participar de la entrevista, y sirve únicamente para agendar.",
      },
      {
        heading: "Uso de los datos",
        body: "Las respuestas se analizan de forma agregada (estadísticas) y pueden citarse en el libro y en contenidos derivados sin ninguna identificación.",
      },
      {
        heading: "Voluntariedad",
        body: "Puedes parar en cualquier momento y saltar las preguntas sensibles (“prefiero no responder”).",
      },
      {
        heading: "Tus datos",
        body: "Para remover tus datos de entrevista o e-mail: contato@drlibertad.com.",
      },
    ],
    accept: "Al marcar “Leí y acepto” en la investigación, aceptas este término.",
  },
  footerNote: "Investigación anónima · Estudio editorial Dr. Libertad",
};

export const surveyContent: Record<Lang, SurveyCopy> = { pt, es };
