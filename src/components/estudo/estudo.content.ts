// ─── Página institucional "O Estudo" / "El Estudio" — TEXTOS PT/ES ───────────
// Explica o projeto de pesquisa "Redes Sociais e Relacionamentos" e liga ao
// funil (/pesquisa · /investigacion). Portada do protótipo HTML aprovado em
// Livros-Escrevendo/…/Pesquisa-Funil/Pagina-Institucional/index.html.
// A camada de VOZ segue a linha editorial do dono; conteúdo factual que falta
// (bio/credenciais/referências) vem marcado com `placeholder: true` para o dono
// preencher — NUNCA inventado (P4).

import { ACCOUNTS, instagramUrlDe } from "@/lib/accounts";
import type { Lang } from "@/lib/i18n/dictionaries";

export type EstudoCopy = {
  metaTitle: string;
  metaDescription: string;
  brand: string;
  surveyPath: string; // "/pesquisa" | "/investigacion"
  termoPath: string;
  otherLang: { code: Lang; path: string; label: string };
  instagramHandle: string;
  instagramUrl: string;
  nav: { respond: string; respondLong: string };
  hero: {
    kicker: string;
    titlePre: string;
    titleEm: string;
    titlePost: string;
    lede: string; // usa <strong> via marcadores **…**
    chips: string[];
    ctaPrimary: string;
    ctaSecondary: string;
  };
  live: {
    eyebrow: string;
    counterOf: string;
    counterLabel: string;
    firstFraming: string; // enquadramento quando a contagem é baixa (honesto)
    goalNote: string;
    goalMetaLeft: string;
    /** Recebe a fração JÁ formatada no idioma ("0,4" / "12") — meta de 10 mil
     *  passa muito tempo em casa decimal, e "0.4" com ponto é inglês. */
    goalMetaRight: (pct: string) => string;
    cta: string;
  };
  proposito: {
    eyebrow: string;
    titlePre: string;
    titleEm: string;
    titlePost: string;
    paras: string[];
  };
  estudo: {
    eyebrow: string;
    titlePre: string;
    titleEm: string;
    titlePost: string;
    lede: string;
    steps: { num: string; title: string; body: string }[];
  };
  hipoteses: {
    eyebrow: string;
    titlePre: string;
    titleEm: string;
    titlePost: string;
    lede: string;
    items: { tag: string; title: string; body: string }[];
  };
  rigor: {
    eyebrow: string;
    titlePre: string;
    titleEm: string;
    titlePost: string;
    items: { ic: string; title: string; body: string; placeholder?: boolean }[];
  };
  autor: {
    eyebrow: string;
    title: string;
    name: string;
    role: string;
    // bioLead = trecho a preencher com o dono; bioSafe = já verdadeiro no site (autor page).
    bioPlaceholder: string;
    bioSafe: string;
    para2: string;
    follow: string;
  };
  cta: {
    eyebrow: string;
    titlePre: string;
    titleEm: string;
    lede: string;
    button: string;
  };
  footer: { note: string; respond: string; termo: string; instagram: string };
};

const br: EstudoCopy = {
  metaTitle: "O Estudo — Redes Sociais e Relacionamentos",
  metaDescription:
    "Todo mundo tem uma opinião. Quase ninguém tem dado. Um estudo editorial — anônimo, com método — sobre o que as redes estão fazendo com os relacionamentos. As respostas viram um livro.",
  brand: "Dr. Liberdade",
  surveyPath: "/pesquisa",
  termoPath: "/pesquisa/termo",
  otherLang: { code: "es", path: "/el-estudio", label: "ES" },
  instagramHandle: ACCOUNTS.br.handle,
  instagramUrl: instagramUrlDe("br"),
  nav: { respond: "Responder", respondLong: " a pesquisa" },
  hero: {
    kicker: "Estudo editorial · Dr. Liberdade",
    titlePre: "As redes sociais estão destruindo os ",
    titleEm: "relacionamentos?",
    titlePost: "",
    lede: "Todo mundo tem uma opinião. Quase ninguém tem dado. Este é um estudo de verdade — com método, anônimo — sobre o que as redes estão fazendo com o amor. **As respostas viram um livro.** E o livro só defende a tese **se — e como — os números sustentarem.** Inclusive se disserem que ela está errada.",
    chips: ["3 minutos", "Anônimo", "Vira livro", "PT · ES"],
    ctaPrimary: "Responder a pesquisa",
    ctaSecondary: "Ver como o estudo funciona",
  },
  live: {
    eyebrow: "A pesquisa está aberta",
    counterOf: "/ ~10.000 por idioma",
    counterLabel: "respostas até agora",
    firstFraming: "Você pode estar entre os primeiros a responder. Cada resposta aproxima o livro.",
    goalNote:
      "Não há data de lançamento — há um **marco**: o livro sai quando o campo fechar, por volta de **10 mil respostas** em cada idioma. O contador é a barra de progresso. Cada resposta aproxima o livro.",
    goalMetaLeft: "Coleta em andamento",
    goalMetaRight: (pct) => `${pct}% da meta`,
    cta: "Somar a minha resposta",
  },
  proposito: {
    eyebrow: "Por que este estudo existe",
    titlePre: "Uma tese que se ",
    titleEm: "testa",
    titlePost: " — não que se decreta.",
    paras: [
      "A hipótese de partida é dura: a rede social está corroendo a forma como as pessoas se relacionam — a comparação, a expectativa inflada, o excesso de opções, o ciúme, a presença trocada pela tela. Mas hipótese não é conclusão.",
      "Por isso a pergunta virou **pesquisa**, com perguntas neutras e método declarado antes da coleta. É o dado que decide o rumo do livro — e é isso que torna a defesa honesta, e difícil de derrubar. Você não está respondendo a um formulário; está entrando na conta que vai escrever a próxima página.",
    ],
  },
  estudo: {
    eyebrow: "O método, sem letras miúdas",
    titlePre: "Como o estudo ",
    titleEm: "funciona",
    titlePost: ".",
    lede: "Duas frentes que se completam: o **número** diz o quanto; a **história** diz o porquê. Uma sem a outra não fecha um livro.",
    steps: [
      {
        num: "01 · quantitativo",
        title: "O survey anônimo",
        body: "Um questionário de ~3 minutos, sem nome nem identificador. Muitas respostas viram estatística — a base que sustenta (ou refuta) cada hipótese.",
      },
      {
        num: "02 · qualitativo",
        title: "As entrevistas",
        body: "Conversas de 30 minutos, confidenciais, com quem topa contar. É desse material vivo que saem as histórias que dão rosto aos números. A primeira já foi gravada.",
      },
      {
        num: "03 · o livro",
        title: "A síntese",
        body: "Cada hipótese vira um eixo do livro: o número do survey, a fala das entrevistas e a leitura crítica — juntos. O livro sai quando o campo fecha, não numa data de calendário.",
      },
    ],
  },
  hipoteses: {
    eyebrow: "O que a pesquisa mede",
    titlePre: "Seis hipóteses, fixadas ",
    titleEm: "antes",
    titlePost: " da coleta.",
    lede: "Definir o que se vai medir antes de olhar o dado é o que separa pesquisa de opinião confirmada depois. Estas são as seis — e o survey testa cada uma com itens neutros.",
    items: [
      { tag: "H1 — comparação", title: "O feed dos outros", body: "Ver a vida amorosa alheia nas redes aumenta a insatisfação com a própria." },
      { tag: "H2 — expectativa", title: "O padrão inalcançável", body: "Perfis e filtros elevam a exigência de parceiro acima do que a vida real entrega." },
      { tag: "H3 — excesso de escolha", title: "Sempre há o próximo", body: "“Alguém melhor a um swipe de distância” corrói o compromisso." },
      { tag: "H4 — vigilância", title: "O ciúme monitorado", body: "As redes aumentam a checagem, a desconfiança e o ciúme dentro da relação." },
      { tag: "H5 — infidelidade", title: "A conversa paralela", body: "Apps e DMs facilitam o flerte à parte e a traição." },
      { tag: "H6 — substituição", title: "A presença trocada", body: "O tempo de tela rouba atenção e presença do relacionamento real." },
    ],
  },
  rigor: {
    eyebrow: "Por que você pode confiar no resultado",
    titlePre: "Rigor e ",
    titleEm: "respeito",
    titlePost: " pelos seus dados.",
    items: [
      { ic: "i.", title: "Anônimo por construção", body: "O questionário não coleta nome, telefone nem qualquer identificador. As respostas são analisadas em conjunto, nunca uma a uma." },
      { ic: "ii.", title: "Perguntas neutras", body: "Nenhum item induz a resposta “certa”. Pergunta enviesada contamina o dado — e é isso que um crítico usaria para derrubar o livro." },
      { ic: "iii.", title: "Consentimento LGPD", body: "Participação voluntária, com base legal no consentimento (art. 7º, I, LGPD). O consentimento de pesquisa é separado do de imagem." },
      { ic: "iv.", title: "Você no controle", body: "Pode parar a qualquer momento e pular as perguntas sensíveis — todas aceitam “prefiro não responder”." },
      { ic: "v.", title: "Margem reportada", body: "A amostra e a margem de erro entram na metodologia do livro. Onde o dado não sustentar a tese, o livro dirá isso." },
      { ic: "vi.", title: "Base acadêmica", body: "O instrumento dialoga com a literatura sobre relações e tecnologia.", placeholder: true },
    ],
  },
  autor: {
    eyebrow: "Quem está por trás",
    title: "O investigador.",
    name: "Dr. Liberdade",
    role: "Investigador principal · Estudo editorial",
    bioPlaceholder: "Biografia/credenciais a confirmar com o dono.",
    bioSafe:
      "Autor por trás do projeto Dr. Liberdade, um estúdio editorial que fala, sem rodeios, sobre atenção, vínculos e liberdade mental. Aqui a provocação vem da ideia — e a ideia, neste projeto, se submete ao dado.",
    para2:
      "As entrevistas do estudo já começaram. As próximas saem das respostas que chegam por aqui — e os resultados aparecem primeiro no Instagram, antes do livro.",
    follow: `Seguir ${ACCOUNTS.br.handle}`,
  },
  cta: {
    eyebrow: "Sua vez",
    titlePre: "A sua resposta ",
    titleEm: "entra na conta.",
    lede: "Três minutos, anônimo. O que você responder ajuda a decidir o que o livro vai dizer — e você fica sabendo do resultado antes de todo mundo.",
    button: "Responder a pesquisa",
  },
  footer: {
    note: "Pesquisa anônima · Estudo editorial Dr. Liberdade",
    respond: "Responder",
    termo: "Termo de participação",
    instagram: "Instagram",
  },
};

const es: EstudoCopy = {
  metaTitle: "El Estudio — Redes Sociales y Relaciones",
  metaDescription:
    "Todo el mundo tiene una opinión. Casi nadie tiene datos. Un estudio editorial — anónimo, con método — sobre lo que las redes están haciendo con las relaciones. Las respuestas se convierten en un libro.",
  brand: "Dr. Libertad",
  surveyPath: "/investigacion",
  termoPath: "/investigacion/termino",
  otherLang: { code: "br", path: "/o-estudo", label: "PT" },
  instagramHandle: ACCOUNTS.es.handle,
  instagramUrl: instagramUrlDe("es"),
  nav: { respond: "Responder", respondLong: " la investigación" },
  hero: {
    kicker: "Estudio editorial · Dr. Libertad",
    titlePre: "¿Las redes sociales están destruyendo las ",
    titleEm: "relaciones?",
    titlePost: "",
    lede: "Todo el mundo tiene una opinión. Casi nadie tiene datos. Este es un estudio de verdad — con método, anónimo — sobre lo que las redes están haciendo con el amor. **Las respuestas se convierten en un libro.** Y el libro solo defiende la tesis **si — y como — los números la sostienen.** Incluso si dicen que está equivocada.",
    chips: ["3 minutos", "Anónimo", "Se vuelve libro", "PT · ES"],
    ctaPrimary: "Responder la investigación",
    ctaSecondary: "Ver cómo funciona el estudio",
  },
  live: {
    eyebrow: "La investigación está abierta",
    counterOf: "/ ~10.000 por idioma",
    counterLabel: "respuestas hasta ahora",
    firstFraming: "Puedes estar entre los primeros en responder. Cada respuesta acerca el libro.",
    goalNote:
      "No hay fecha de lanzamiento — hay un **hito**: el libro sale cuando el campo cierre, alrededor de **10 mil respuestas** en cada idioma. El contador es la barra de progreso. Cada respuesta acerca el libro.",
    goalMetaLeft: "Recolección en curso",
    goalMetaRight: (pct) => `${pct}% de la meta`,
    cta: "Sumar mi respuesta",
  },
  proposito: {
    eyebrow: "Por qué existe este estudio",
    titlePre: "Una tesis que se ",
    titleEm: "pone a prueba",
    titlePost: " — no que se decreta.",
    paras: [
      "La hipótesis de partida es dura: la red social está corroyendo la forma en que las personas se relacionan — la comparación, la expectativa inflada, el exceso de opciones, los celos, la presencia cambiada por la pantalla. Pero una hipótesis no es una conclusión.",
      "Por eso la pregunta se volvió **investigación**, con preguntas neutras y método declarado antes de la recolección. Es el dato el que decide el rumbo del libro — y eso es lo que hace la defensa honesta, y difícil de derribar. No estás respondiendo un formulario; estás entrando en la cuenta que va a escribir la próxima página.",
    ],
  },
  estudo: {
    eyebrow: "El método, sin letra pequeña",
    titlePre: "Cómo ",
    titleEm: "funciona",
    titlePost: " el estudio.",
    lede: "Dos frentes que se completan: el **número** dice cuánto; la **historia** dice por qué. Una sin la otra no cierra un libro.",
    steps: [
      {
        num: "01 · cuantitativo",
        title: "El survey anónimo",
        body: "Un cuestionario de ~3 minutos, sin nombre ni identificador. Muchas respuestas se vuelven estadística — la base que sostiene (o refuta) cada hipótesis.",
      },
      {
        num: "02 · cualitativo",
        title: "Las entrevistas",
        body: "Conversaciones de 30 minutos, confidenciales, con quien acepte contar. De ese material vivo salen las historias que dan rostro a los números. La primera ya fue grabada.",
      },
      {
        num: "03 · el libro",
        title: "La síntesis",
        body: "Cada hipótesis se vuelve un eje del libro: el número del survey, la voz de las entrevistas y la lectura crítica — juntos. El libro sale cuando el campo cierra, no en una fecha de calendario.",
      },
    ],
  },
  hipoteses: {
    eyebrow: "Lo que mide la investigación",
    titlePre: "Seis hipótesis, fijadas ",
    titleEm: "antes",
    titlePost: " de la recolección.",
    lede: "Definir qué se va a medir antes de mirar el dato es lo que separa la investigación de la opinión confirmada después. Estas son las seis — y el survey pone a prueba cada una con ítems neutros.",
    items: [
      { tag: "H1 — comparación", title: "El feed de los demás", body: "Ver la vida amorosa ajena en las redes aumenta la insatisfacción con la propia." },
      { tag: "H2 — expectativa", title: "El estándar inalcanzable", body: "Perfiles y filtros elevan la exigencia de pareja por encima de lo que la vida real entrega." },
      { tag: "H3 — exceso de opciones", title: "Siempre hay un siguiente", body: "“Alguien mejor a un swipe de distancia” corroe el compromiso." },
      { tag: "H4 — vigilancia", title: "Los celos monitoreados", body: "Las redes aumentan el chequeo, la desconfianza y los celos dentro de la relación." },
      { tag: "H5 — infidelidad", title: "La conversación paralela", body: "Las apps y los DMs facilitan el coqueteo aparte y la traición." },
      { tag: "H6 — sustitución", title: "La presencia cambiada", body: "El tiempo de pantalla le roba atención y presencia a la relación real." },
    ],
  },
  rigor: {
    eyebrow: "Por qué puedes confiar en el resultado",
    titlePre: "Rigor y ",
    titleEm: "respeto",
    titlePost: " por tus datos.",
    items: [
      { ic: "i.", title: "Anónimo por construcción", body: "El cuestionario no recoge nombre, teléfono ni ningún identificador. Las respuestas se analizan en conjunto, nunca una a una." },
      { ic: "ii.", title: "Preguntas neutras", body: "Ningún ítem induce a la respuesta “correcta”. Una pregunta sesgada contamina el dato — y es eso lo que un crítico usaría para derribar el libro." },
      { ic: "iii.", title: "Consentimiento", body: "Participación voluntaria, con base legal en el consentimiento. El consentimiento de investigación es distinto del de imagen." },
      { ic: "iv.", title: "Tú en control", body: "Puedes parar en cualquier momento y saltar las preguntas sensibles — todas aceptan “prefiero no responder”." },
      { ic: "v.", title: "Margen reportado", body: "La muestra y el margen de error entran en la metodología del libro. Donde el dato no sostenga la tesis, el libro lo dirá." },
      { ic: "vi.", title: "Base académica", body: "El instrumento dialoga con la literatura sobre relaciones y tecnología.", placeholder: true },
    ],
  },
  autor: {
    eyebrow: "Quién está detrás",
    title: "El investigador.",
    name: "Dr. Libertad",
    role: "Investigador principal · Estudio editorial",
    bioPlaceholder: "Biografía/credenciales a confirmar con el dueño.",
    bioSafe:
      "Autor detrás del proyecto Dr. Libertad, un estudio editorial que habla, sin rodeos, sobre atención, vínculos y libertad mental. Aquí la provocación viene de la idea — y la idea, en este proyecto, se somete al dato.",
    para2:
      "Las entrevistas del estudio ya empezaron. Las próximas salen de las respuestas que llegan por aquí — y los resultados aparecen primero en Instagram, antes del libro.",
    follow: `Seguir a ${ACCOUNTS.es.handle}`,
  },
  cta: {
    eyebrow: "Tu turno",
    titlePre: "Tu respuesta ",
    titleEm: "entra en la cuenta.",
    lede: "Tres minutos, anónimo. Lo que respondas ayuda a decidir lo que el libro va a decir — y te enteras del resultado antes que nadie.",
    button: "Responder la investigación",
  },
  footer: {
    note: "Investigación anónima · Estudio editorial Dr. Libertad",
    respond: "Responder",
    termo: "Término de participación",
    instagram: "Instagram",
  },
};

export const estudoContent: Record<Lang, EstudoCopy> = { br, es };
