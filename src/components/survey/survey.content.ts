// ─── Pesquisa "Redes Sociais e Relacionamentos" — TEXTOS PT/ES (FUNIL v2) ────
// Fonte: FUNIL-PERGUNTAS.md **v2** (2026-07-11, reestruturado sob ordem do dono:
// camada EMBALAGEM = títulos/subtítulos/botões narrativos/micro-copy; camada
// MEDIÇÃO = itens neutros) + TERMO-CONSENTIMENTO.md (§1). Os textos seguem o
// arquivo À RISCA; a ESTRUTURA (ids/tipos/valores) mora em src/lib/survey-schema.ts.
// Micro-copy "entre os primeiros": condicionada à env NEXT_PUBLIC_SURVEY_LAUNCH_WINDOW
// (ver SurveyExperience — default LIGADA; "0" desliga quando deixar de ser verdade).

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
    titlePre: string;
    titleEm: string;
    lede: string;
    /** Micro-copy de pioneirismo — só aparece na janela de lançamento (flag). */
    launchNote: string;
  };
  consent: {
    label: string;
    termLink: string;
    start: string; // botão da tela 0 (v2: "Começar — 3 minutos")
  };
  progressLabel: (current: number, total: number) => string;
  nav: {
    back: string;
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
    note: string;
    /** Botão narrativo de progresso da tela (v2 — endowed progress/goal-gradient). */
    nextLabel: string;
    questions: Record<
      string,
      { text: string; options?: OptionLabels; placeholder?: string; extraLabel?: string }
    >;
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
    "Todo mundo tem uma opinião. Quase ninguém tem dado. Estudo sério — 3 minutos, anônimo — sobre o que as redes estão fazendo com os relacionamentos. As respostas viram um livro.",
  brand: "Dr. Liberdade",
  handle: "@dr.liberdade.br",
  instagramUrl: "https://www.instagram.com/dr.liberdade.br",
  basePath: "/pesquisa",
  termoPath: "/pesquisa/termo",
  thanksPath: "/pesquisa/obrigado",
  hero: {
    kicker: "Estudo editorial · Dr. Liberdade",
    titlePre: "Você dá match, posta, rola o feed.",
    titleEm: "E o amor — ficou melhor ou pior?",
    lede: "Todo mundo tem uma opinião. Quase ninguém tem dado. Este é um estudo de verdade — 3 minutos, anônimo — sobre o que as redes estão fazendo com os relacionamentos. As respostas viram um livro. A sua entra na conta.",
    launchNote: "Você está entre os primeiros a responder.",
  },
  consent: {
    label: "Li e aceito o uso anônimo das minhas respostas nesta pesquisa.",
    termLink: "Ler o termo completo",
    start: "Começar — 3 minutos",
  },
  progressLabel: (c, t) => `Parte ${c} de ${t}`,
  nav: {
    back: "Voltar",
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
      title: "Primeiro, o fácil.",
      note: "Seis toques. Nada para digitar.",
      nextLabel: "Pronto, o retrato está feito →",
      questions: {
        q1: {
          text: "Idade",
          options: { "18-24": "18–24", "25-34": "25–34", "35-44": "35–44", "45-54": "45–54", "55+": "55+" },
        },
        q2: {
          text: "Gênero",
          // Três opções, nesta ordem — decisão do dono (2026-07-29). "Outro" saiu.
          options: {
            masculino: "Masculino",
            feminino: "Feminino",
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
      title: "Agora, você e as redes.",
      note: "Sem julgamento. Responda pelo que você faz, não pelo que acha bonito dizer.",
      nextLabel: "A partir daqui, as perguntas que deram origem ao livro →",
      questions: {
        q7: { text: "Acompanho a vida amorosa de outras pessoas pelas redes." },
        q8: { text: "Já conversei nas redes com pessoas que não conheço pessoalmente." },
        q9: { text: "As redes me aproximaram das pessoas de quem eu gosto." },
      },
    },
    {
      title: "O que você vê × o que você vive.",
      note: "Não existe resposta certa — existe a sua.",
      nextLabel: "Metade feita →",
      questions: {
        q10: { text: "Comparo meu relacionamento (ou minha vida amorosa) com o que vejo nas redes." },
        q11: { text: "Ver a vida amorosa dos outros nas redes me deixa mais insatisfeito(a) com a minha." },
        q12: { text: "As redes elevaram o que eu exijo de um(a) parceiro(a) para além do que encontro na vida real." },
        q13: {
          text: "Já me decepcionei ao conhecer pessoalmente alguém que parecia diferente no perfil.",
          extraLabel: "Nunca conheci alguém que vi primeiro online",
        },
      },
    },
    {
      title: "Opções e presença.",
      note: "Duas telas e acabou. Estas quatro valem o estudo inteiro.",
      nextLabel: "Falta 1 tela de perguntas →",
      questions: {
        q14: { text: "Sinto que sempre há alguém “melhor” a um clique de distância." },
        q15: { text: "O excesso de opções dificulta eu me comprometer com uma só pessoa." },
        q16: { text: "Passo mais tempo na tela do que presencialmente com quem me importo." },
        q17: { text: "O celular já foi motivo de reclamação ou discussão no meu relacionamento." },
      },
    },
    {
      title: "A parte que ninguém conta em voz alta.",
      note: "Anônimo de verdade: nem a gente sabe quem você é. E toda pergunta aqui aceita “prefiro não responder”.",
      nextLabel: "Última tela →",
      questions: {
        q18: { text: "Já chequei o perfil ou a atividade do meu parceiro(a) por desconfiança." },
        q19: { text: "As redes aumentaram o ciúme ou a desconfiança no meu relacionamento." },
        q20: { text: "Já mantive flerte ou conversa nas redes que meu parceiro(a) não sabia." },
        q21: { text: "Na minha visão, apps e redes facilitam traições e conversas paralelas." },
        q22: { text: "Já vi um relacionamento (meu ou próximo) terminar por causa das redes sociais." },
      },
    },
    {
      title: "Sua história vale mais que o número.",
      note: "O número diz quanto; só a história diz por quê. Se quiser, conte. Se não, só envie — o que você já respondeu já conta.",
      nextLabel: "", // última tela: o botão é o de envio (nav.submit)
      questions: {
        q23: {
          text: "Como as redes mudaram seus relacionamentos — para melhor ou para pior? Conte um caso.",
          placeholder: "Escreva aqui, do seu jeito…",
        },
        q24: {
          text: "Se pudesse mudar uma coisa no seu uso de redes para proteger seus relacionamentos, o que seria?",
          placeholder: "Escreva aqui…",
        },
      },
    },
  ],
  email: {
    label:
      "Toparia contar sua história numa conversa de 30 min (Google Meet, confidencial)? É desse material que o livro é feito. Deixe seu e-mail.",
    note: "Único dado identificável — usado só para agendar a conversa.",
    placeholder: "seu@email.com",
    invalid: "E-mail inválido — corrija ou deixe em branco.",
  },
  thanks: {
    metaTitle: "Obrigado — Pesquisa Redes Sociais e Relacionamentos",
    title: "Obrigado.",
    body: "Suas respostas entram na conta. Os resultados saem primeiro em @dr.liberdade.br — siga para ver o que os números vão dizer. Inclusive se disserem que a tese está errada.",
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
    "Todo el mundo tiene una opinión. Casi nadie tiene datos. Estudio en serio — 3 minutos, anónimo — sobre lo que las redes están haciendo con las relaciones. Las respuestas se convierten en un libro.",
  brand: "Dr. Libertad",
  handle: "@dr.libertad",
  instagramUrl: "https://www.instagram.com/dr.libertad",
  basePath: "/investigacion",
  termoPath: "/investigacion/termino",
  thanksPath: "/investigacion/gracias",
  hero: {
    kicker: "Estudio editorial · Dr. Libertad",
    titlePre: "Das match, publicas, haces scroll.",
    titleEm: "¿Y el amor — está mejor o peor?",
    lede: "Todo el mundo tiene una opinión. Casi nadie tiene datos. Este es un estudio en serio — 3 minutos, anónimo — sobre lo que las redes están haciendo con las relaciones. Las respuestas se convierten en un libro. La tuya entra en la cuenta.",
    launchNote: "Estás entre los primeros en responder.",
  },
  consent: {
    label: "Leí y acepto el uso anónimo de mis respuestas en esta investigación.",
    termLink: "Leer el término completo",
    start: "Empezar — 3 minutos",
  },
  progressLabel: (c, t) => `Parte ${c} de ${t}`,
  nav: {
    back: "Volver",
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
      title: "Primero, lo fácil.",
      note: "Seis toques. Nada que escribir.",
      nextLabel: "Listo, el retrato está hecho →",
      questions: {
        q1: {
          text: "Edad",
          options: { "18-24": "18–24", "25-34": "25–34", "35-44": "35–44", "45-54": "45–54", "55+": "55+" },
        },
        q2: {
          text: "Género",
          // Mesma decisão do dono (2026-07-29): três opções, "Otro" saiu.
          options: {
            masculino: "Masculino",
            feminino: "Femenino",
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
      title: "Ahora, tú y las redes.",
      note: "Sin juicio. Responde por lo que haces, no por lo que queda bien decir.",
      nextLabel: "A partir de aquí, las preguntas que dieron origen al libro →",
      questions: {
        q7: { text: "Sigo la vida amorosa de otras personas por las redes." },
        q8: { text: "He conversado en redes con personas que no conozco en persona." },
        q9: { text: "Las redes me acercaron a las personas que quiero." },
      },
    },
    {
      title: "Lo que ves × lo que vives.",
      note: "No hay respuesta correcta — hay la tuya.",
      nextLabel: "Mitad hecha →",
      questions: {
        q10: { text: "Comparo mi relación (o mi vida amorosa) con lo que veo en las redes." },
        q11: { text: "Ver la vida amorosa de otros en las redes me deja más insatisfecho(a) con la mía." },
        q12: { text: "Las redes elevaron lo que exijo de una pareja por encima de lo que encuentro en la vida real." },
        q13: {
          text: "Me he decepcionado al conocer en persona a alguien que parecía diferente en su perfil.",
          extraLabel: "Nunca conocí a alguien que vi primero online",
        },
      },
    },
    {
      title: "Opciones y presencia.",
      note: "Dos pantallas y terminas. Estas cuatro valen el estudio entero.",
      nextLabel: "Falta 1 pantalla de preguntas →",
      questions: {
        q14: { text: "Siento que siempre hay alguien “mejor” a un clic de distancia." },
        q15: { text: "El exceso de opciones me dificulta comprometerme con una sola persona." },
        q16: { text: "Paso más tiempo en la pantalla que en persona con quienes me importan." },
        q17: { text: "El celular ya fue motivo de reclamos o discusiones en mi relación." },
      },
    },
    {
      title: "La parte que nadie cuenta en voz alta.",
      note: "Anónimo de verdad: ni nosotros sabemos quién eres. Y toda pregunta aquí acepta “prefiero no responder”.",
      nextLabel: "Última pantalla →",
      questions: {
        q18: { text: "He revisado el perfil o la actividad de mi pareja por desconfianza." },
        q19: { text: "Las redes aumentaron los celos o la desconfianza en mi relación." },
        q20: { text: "He mantenido coqueteo o conversaciones en redes que mi pareja no conocía." },
        q21: { text: "En mi opinión, las apps y redes facilitan infidelidades y conversaciones paralelas." },
        q22: { text: "He visto una relación (mía o cercana) terminar por causa de las redes sociales." },
      },
    },
    {
      title: "Tu historia vale más que el número.",
      note: "El número dice cuánto; solo la historia dice por qué. Si quieres, cuenta. Si no, solo envía — lo que ya respondiste ya cuenta.",
      nextLabel: "",
      questions: {
        q23: {
          text: "¿Cómo cambiaron las redes tus relaciones — para bien o para mal? Cuéntanos un caso.",
          placeholder: "Escribe aquí, a tu manera…",
        },
        q24: {
          text: "Si pudieras cambiar una cosa en tu uso de redes para proteger tus relaciones, ¿qué sería?",
          placeholder: "Escribe aquí…",
        },
      },
    },
  ],
  email: {
    label:
      "¿Aceptarías contar tu historia en una charla de 30 min (Google Meet, confidencial)? De ese material está hecho el libro. Deja tu e-mail.",
    note: "Único dato identificable — usado solo para agendar la charla.",
    placeholder: "tu@email.com",
    invalid: "E-mail inválido — corrígelo o déjalo en blanco.",
  },
  thanks: {
    metaTitle: "Gracias — Investigación Redes Sociales y Relaciones",
    title: "Gracias.",
    body: "Tus respuestas entran en la cuenta. Los resultados salen primero en @dr.libertad — síguenos para ver qué van a decir los números. Incluso si dicen que la tesis está equivocada.",
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
