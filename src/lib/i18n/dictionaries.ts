// Dicionários PT/ES — fonte única de todos os textos do site.
// O EDITORIAL (posts) é sempre exibido em espanhol, pois vem do Instagram real.

export type Lang = "pt" | "es";

export const LANGS: Lang[] = ["pt", "es"];

type Dict = typeof pt;

export const pt = {
  nav: {
    items: [
      { id: "manifesto", label: "Manifesto" },
      { id: "topics", label: "Temas" },
      { id: "gallery", label: "Editorial" },
      { id: "quotes", label: "Citações" },
      { id: "newsletter", label: "Newsletter" },
    ],
    cta: "Entrar na lista",
  },
  hero: {
    chips: ["filosofia aplicada", "psicologia", "atenção"],
    title: "A liberdade começa quando você entende",
    titleAccent: "quem controla sua mente.",
    lead: "Um estúdio editorial de ideias: desintoxicação digital, ansiedade moderna e inteligência emocional — com estética cinematográfica e prática diária.",
    ctaPrimary: "Entrar no manifesto",
    ctaSecondary: "Ver editorial",
    deckEyebrow: "Ritual Diário",
    deckTitle: "90 segundos de silêncio antes da reação automática.",
    deckLead: "Entre o impulso e a resposta existe um espaço. É ali que a liberdade começa.",
    deckTag: "foco",
    deckSteps: ["Nomeie a emoção", "Observe o impulso", "Escolha conscientemente"],
  },
  marquee: [
    "CINEMATOGRÁFICO",
    "EDITORIAL",
    "FILOSOFIA",
    "PSICOLOGIA",
    "DESINTOXICAÇÃO DIGITAL",
    "ATENÇÃO",
    "LIBERDADE",
    "MASCULINIDADE",
    "INTELIGÊNCIA EMOCIONAL",
  ],
  manifesto: {
    eyebrow: "MANIFESTO",
    title: "Um manifesto de ritmo emocional: menos estímulo, mais escolha.",
    principlesLabel: "princípios",
    principles: [
      {
        t: "Você não tem falta de disciplina. Você tem falta de contexto.",
        d: "Tecnologia e ambiente foram projetados para capturar atenção. Seu trabalho é recuperar a arquitetura interna.",
      },
      {
        t: "A mente escolhe — mesmo quando parece automática.",
        d: "Impulsos são sinais. Você pode observar antes de agir.",
      },
      {
        t: "Ansiedade não é destino. É informação.",
        d: "Nomear a sensação reduz a força do ruído e aumenta a precisão da decisão.",
      },
      {
        t: "Masculinidade é presença emocional, não performance.",
        d: "Inteligência afetiva constrói liberdade real.",
      },
    ],
    promiseLabel: "uma promessa",
    promiseTitle: "Menos estímulo. Mais clareza. Decisões com alma.",
    promiseLead:
      "A estética é silenciosa — mas a mudança é radical. Você vai aprender a reconhecer gatilhos, reduzir compulsão e fortalecer a relação com o próprio pensamento.",
    rhythmLabel: "ritmo",
    rhythmValue: "Ciclos curtos. Transformação contínua.",
    stats: [
      { k: "atenção", v: "projetada" },
      { k: "emoção", v: "nomeada" },
      { k: "impulso", v: "observado" },
      { k: "ação", v: "escolhida" },
    ],
  },
  topics: {
    eyebrow: "TEMAS",
    title: "Pilares editoriais com ritmo de estúdio.",
    label: "tema",
    items: [
      { title: "Desintoxicação digital", desc: "Redesenhe seus incentivos para recuperar desejo e presença." },
      { title: "Psicologia do hábito", desc: "Compreenda o ciclo de gatilho, rotina e recompensa." },
      { title: "Ansiedade moderna", desc: "Ruído social + previsão excessiva = tensão constante." },
      { title: "Vício em redes", desc: "Quando o scroll vira regulação emocional." },
      { title: "Masculinidade consciente", desc: "Força, vulnerabilidade e disciplina com inteligência afetiva." },
      { title: "Liberdade", desc: "Escolha deliberada sobre impulsos e recompensas rápidas." },
      { title: "Inteligência emocional", desc: "Nomeie, processe e transforme emoção em ação." },
      { title: "Comportamento humano", desc: "Biologia + aprendizado + contexto. Sem moralismo." },
    ],
  },
  gallery: {
    eyebrow: "EDITORIAL",
    title: "Cartazes filosóficos, capas de luxo, psicologia em alto contraste.",
    live: "ao vivo do Instagram",
    loading: "Carregando o editorial mais recente…",
    empty: "Em breve: os posts mais recentes aparecem aqui automaticamente.",
    openLabel: "Abrir",
    readMore: "Ler artigo completo",
    viewInstagram: "Ver no Instagram",
    close: "Fechar",
    issue: "edição",
  },
  quotes: {
    eyebrow: "CITAÇÕES",
    title: "Ideias curtas. Impacto longo.",
    noteLabel: "nota",
    items: [
      {
        quote: "Você não precisa vencer o mundo. Precisa parar de ser vencido pelo seu próprio feed.",
        meta: "DR. LIBERTAD · nota editorial 01",
      },
      {
        quote: "A mente é um palco. Se ninguém entra, você finalmente ouve o que sempre esteve lá.",
        meta: "DR. LIBERTAD · nota editorial 02",
      },
      {
        quote: "Liberdade não é ausência de estímulo; é habilidade de escolher a resposta.",
        meta: "DR. LIBERTAD · nota editorial 03",
      },
    ],
  },
  newsletter: {
    eyebrow: "NEWSLETTER",
    title: "Cartas curtas. Verdades longas.",
    lead: "Receba ensaios editoriais sobre atenção, desintoxicação digital, psicologia e liberdade interna. Sem ruído. Só direção.",
    placeholder: "Seu e-mail",
    submit: "Inscrever",
    submitting: "Enviando…",
    success: "Inscrito ✓",
    errorInvalid: "Digite um e-mail válido.",
    errorGeneric: "Algo deu errado. Tente novamente.",
    disclaimer: "Ao se inscrever, você recebe conteúdo editorial. Sem spam.",
    benefitsLabel: "o que você recebe",
    benefits: [
      { t: "Reflexões curtas", d: "Para quebrar o ciclo de reação e reacender a escolha." },
      { t: "Rituais práticos", d: "Micro-hábitos para reduzir compulsão e recuperar desejo." },
      { t: "Psicologia aplicada", d: "Entenda o porquê antes do como." },
    ],
  },
  footer: {
    tagline: "Filosofia aplicada à atenção e ao comportamento.",
    links: [
      { label: "Manifesto", id: "manifesto" },
      { label: "Tópicos", id: "topics" },
      { label: "Galeria", id: "gallery" },
      { label: "Newsletter", id: "newsletter" },
    ],
  },
};

export const es: Dict = {
  nav: {
    items: [
      { id: "manifesto", label: "Manifiesto" },
      { id: "topics", label: "Temas" },
      { id: "gallery", label: "Editorial" },
      { id: "quotes", label: "Citas" },
      { id: "newsletter", label: "Newsletter" },
    ],
    cta: "Unirme a la lista",
  },
  hero: {
    chips: ["filosofía aplicada", "psicología", "atención"],
    title: "La libertad empieza cuando entiendes",
    titleAccent: "quién controla tu mente.",
    lead: "Un estudio editorial de ideas: desintoxicación digital, ansiedad moderna e inteligencia emocional — con estética cinematográfica y práctica diaria.",
    ctaPrimary: "Entrar al manifiesto",
    ctaSecondary: "Ver editorial",
    deckEyebrow: "Ritual Diario",
    deckTitle: "90 segundos de silencio antes de la reacción automática.",
    deckLead: "Entre el impulso y la respuesta existe un espacio. Ahí empieza la libertad.",
    deckTag: "foco",
    deckSteps: ["Nombra la emoción", "Observa el impulso", "Elige conscientemente"],
  },
  marquee: [
    "CINEMATOGRÁFICO",
    "EDITORIAL",
    "FILOSOFÍA",
    "PSICOLOGÍA",
    "DESINTOXICACIÓN DIGITAL",
    "ATENCIÓN",
    "LIBERTAD",
    "MASCULINIDAD",
    "INTELIGENCIA EMOCIONAL",
  ],
  manifesto: {
    eyebrow: "MANIFIESTO",
    title: "Un manifiesto de ritmo emocional: menos estímulo, más elección.",
    principlesLabel: "principios",
    principles: [
      {
        t: "No te falta disciplina. Te falta contexto.",
        d: "La tecnología y el entorno fueron diseñados para capturar tu atención. Tu trabajo es recuperar la arquitectura interna.",
      },
      {
        t: "La mente elige — incluso cuando parece automática.",
        d: "Los impulsos son señales. Puedes observar antes de actuar.",
      },
      {
        t: "La ansiedad no es destino. Es información.",
        d: "Nombrar la sensación reduce la fuerza del ruido y aumenta la precisión de la decisión.",
      },
      {
        t: "La masculinidad es presencia emocional, no rendimiento.",
        d: "La inteligencia afectiva construye libertad real.",
      },
    ],
    promiseLabel: "una promesa",
    promiseTitle: "Menos estímulo. Más claridad. Decisiones con alma.",
    promiseLead:
      "La estética es silenciosa — pero el cambio es radical. Vas a aprender a reconocer disparadores, reducir la compulsión y fortalecer la relación con tu propio pensamiento.",
    rhythmLabel: "ritmo",
    rhythmValue: "Ciclos cortos. Transformación continua.",
    stats: [
      { k: "atención", v: "diseñada" },
      { k: "emoción", v: "nombrada" },
      { k: "impulso", v: "observado" },
      { k: "acción", v: "elegida" },
    ],
  },
  topics: {
    eyebrow: "TEMAS",
    title: "Pilares editoriales con ritmo de estudio.",
    label: "tema",
    items: [
      { title: "Desintoxicación digital", desc: "Rediseña tus incentivos para recuperar deseo y presencia." },
      { title: "Psicología del hábito", desc: "Comprende el ciclo de disparador, rutina y recompensa." },
      { title: "Ansiedad moderna", desc: "Ruido social + exceso de anticipación = tensión constante." },
      { title: "Adicción a las redes", desc: "Cuando el scroll se vuelve regulación emocional." },
      { title: "Masculinidad consciente", desc: "Fuerza, vulnerabilidad y disciplina con inteligencia afectiva." },
      { title: "Libertad", desc: "Elección deliberada sobre impulsos y recompensas rápidas." },
      { title: "Inteligencia emocional", desc: "Nombra, procesa y transforma la emoción en acción." },
      { title: "Comportamiento humano", desc: "Biología + aprendizaje + contexto. Sin moralismo." },
    ],
  },
  gallery: {
    eyebrow: "EDITORIAL",
    title: "Carteles filosóficos, portadas de lujo, psicología en alto contraste.",
    live: "en vivo desde Instagram",
    loading: "Cargando el editorial más reciente…",
    empty: "Muy pronto: los posts más recientes aparecen aquí automáticamente.",
    openLabel: "Abrir",
    readMore: "Leer artículo completo",
    viewInstagram: "Ver en Instagram",
    close: "Cerrar",
    issue: "edición",
  },
  quotes: {
    eyebrow: "CITAS",
    title: "Ideas cortas. Impacto largo.",
    noteLabel: "nota",
    items: [
      {
        quote: "No necesitas vencer al mundo. Necesitas dejar de ser vencido por tu propio feed.",
        meta: "DR. LIBERTAD · nota editorial 01",
      },
      {
        quote: "La mente es un escenario. Si nadie entra, por fin escuchas lo que siempre estuvo ahí.",
        meta: "DR. LIBERTAD · nota editorial 02",
      },
      {
        quote: "La libertad no es ausencia de estímulo; es la habilidad de elegir la respuesta.",
        meta: "DR. LIBERTAD · nota editorial 03",
      },
    ],
  },
  newsletter: {
    eyebrow: "NEWSLETTER",
    title: "Cartas cortas. Verdades largas.",
    lead: "Recibe ensayos editoriales sobre atención, desintoxicación digital, psicología y libertad interna. Sin ruido. Solo dirección.",
    placeholder: "Tu correo",
    submit: "Suscribirme",
    submitting: "Enviando…",
    success: "Suscrito ✓",
    errorInvalid: "Escribe un correo válido.",
    errorGeneric: "Algo salió mal. Inténtalo de nuevo.",
    disclaimer: "Al suscribirte, recibes contenido editorial. Sin spam.",
    benefitsLabel: "lo que recibes",
    benefits: [
      { t: "Reflexiones cortas", d: "Para romper el ciclo de reacción y reavivar la elección." },
      { t: "Rituales prácticos", d: "Micro-hábitos para reducir la compulsión y recuperar el deseo." },
      { t: "Psicología aplicada", d: "Entiende el porqué antes del cómo." },
    ],
  },
  footer: {
    tagline: "Filosofía aplicada a la atención y al comportamiento.",
    links: [
      { label: "Manifiesto", id: "manifesto" },
      { label: "Temas", id: "topics" },
      { label: "Galería", id: "gallery" },
      { label: "Newsletter", id: "newsletter" },
    ],
  },
};

export const dictionaries: Record<Lang, Dict> = { pt, es };
