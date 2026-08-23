// Conteúdo do funil "Guia de 7 dias" (lead magnet do funil comment→DM, Reel C).
// FONTE do texto = editor-chefe: src/content/temas-livros/guia-7-dias.md (Parte A).
// PT nativo + ES nativo (regenerado, não traduzido). A página ENTREGA o guia inteiro
// (delivery imediato, on-page); o e-mail Brevo é reforço opcional (opt-in).
//
// HONESTIDADE P4 (trava desta peça): "resetar o piso da dopamina" é METÁFORA, não
// neurociência literal — bloco de honestidade visível na página. Recalibração
// comportamental, não pseudociência. Ver o .md do editor-chefe.
//
// DESBLOQUEIO PROGRESSIVO (delta 2026-08-23, briefing do estrategista de atenção —
// desbloqueio por AÇÃO, não por tempo passivo): o Dia 1 continua sempre aberto; os
// Dias 2–7 nascem TRANCADOS (título visível, ação/porquê escondidos) e só abrem
// quando a pessoa marca "fiz o Dia N" — com piso de 1 dia-calendário real entre
// desbloqueios (mecanismo 100% client-side, `localStorage` — ver Guia7Funnel.tsx).
//
// ⛔ SEM ATALHO (correção do dono, mesmo dia): existiu um atalho por e-mail que
// destrancava os 7 de uma vez — REMOVIDO. Ordem do dono: "não de opção de
// destravar os 7 não, o interessante é que a pessoa espere um a cada dia". A
// espera É o produto; o e-mail vira só o lembrete diário (não pula fila).
//
// FECHO QUE VENDE (mesmo delta): ao completar o Dia 7, aparece um card de
// conclusão levando à pré-venda de I Love Dopamina (`finalHref` + "#pre-venda") —
// "ao final dos 7 dias leve ao link para a compra do livro ou ofereça o livro".

export type Lang = "br" | "es";

export interface Step {
  /** Rótulo do dia, ex.: "Dia 1" / "Día 1". */
  dia: string;
  /** Título do passo. */
  titulo: string;
  /** A ação do dia. */
  acao: string;
  /** O "por quê" (renderizado com o rótulo próprio do idioma). */
  porque: string;
}

export interface Guia7Content {
  metaTitle: string;
  metaDescription: string;
  badge: string;
  /** Título em duas partes: "7 dias para" + destaque "retomar sua atenção". */
  titlePre: string;
  titleEm: string;
  subtitle: string;
  lead: string;
  chips: string[];
  honestyHeading: string;
  honestyBody: string;
  stepsHeading: string;
  /** Subtítulo logo abaixo do heading dos passos — explica a mecânica de desbloqueio. */
  stepsSubheading: string;
  porqueLabel: string;
  steps: Step[];
  /** Badge do card trancado (Dias 2–7 antes de abrir). */
  lockedBadge: string;
  /** Teaser do card trancado — template com o marcador literal "{N-1}". */
  lockedTeaser: string;
  /** Botão de desbloqueio dos dias 1–6 — template com "{N}" e "{N+1}". */
  unlockButtonLabel: string;
  /** Botão de desbloqueio do Dia 7 (não tem próximo dia). */
  unlockButtonLabelFinal: string;
  /** Botão desabilitado (piso de 1 dia já usado hoje) — template com "{N+1}". */
  unlockButtonDisabledLabel: string;
  /** Rodapé de honestidade da seção de passos: o progresso é só deste navegador. */
  progressFooterNote: string;
  /** Selo do card de conclusão (mostrado só quando o Dia 7 está feito). */
  completionEyebrow: string;
  completionTitle: string;
  completionBody: string;
  completionCta: string;
  /** Registro do Consentimento (delta 2026-08-23): convite pra escrever 1 frase
   * por dia — opcional, vira a "Carta da Chave" no Dia 7. Pesquisa dupla
   * (neurociência + mercado) validou este mecanismo como o diferencial real. */
  registroLabel: string;
  registroPlaceholder: string;
  /** Frase-fallback por dia (índice 0 = Dia 1) — usada na carta se a pessoa não escreveu nada naquele dia. */
  diaFallback: string[];
  carta: {
    heading: string;
    subheading: string;
    closing: string;
    shareInvite: string;
  };
  form: {
    heading: string;
    body: string;
    label: string;
    placeholder: string;
    cta: string;
    success: string;
    note: string;
    error: string;
  };
  finalTitle: string;
  finalLead: string;
  finalCta: string;
  finalHref: string;
  disclaimer: string;
  footerSignature: string;
}

export const guia7Content: Record<Lang, Guia7Content> = {
  br: {
    metaTitle: "7 dias para retomar sua atenção — Guia grátis | Dr. Liberdade",
    metaDescription:
      "Um protocolo curto e honesto para sair do automático do feed: 7 movimentos pequenos, um por dia. Sem detox milagroso, sem fórmula mágica.",
    badge: "Guia grátis · 7 dias",
    titlePre: "7 dias para",
    titleEm: "retomar sua atenção",
    subtitle:
      "Um protocolo curto e honesto para sair do automático do feed — um passo por dia, um só.",
    lead:
      "Sequestraram a sua atenção em silêncio — dose por dose, toque por toque. Este guia é o caminho de volta: 7 movimentos pequenos, um por dia, para você reparar quem está com a chave. Não é detox milagroso nem promessa de “resetar o cérebro” — isso é conversa de vendedor. É o contrário: parar de alimentar o fácil e reaprender a querer o que vale.",
    chips: ["7 passos · 7 dias", "1 por dia, cabe no bolso", "Edição PT · ES", "Sem fórmula mágica"],
    honestyHeading: "A verdade que o guia assume",
    honestyBody:
      "“Resetar o piso da dopamina” é uma imagem, não um botão no seu cérebro. Ninguém zera nada em uma semana. O que dá para fazer — e funciona — é recalibrar o comportamento: mudar o ambiente, aguentar o tédio, trocar o prazer barato pelo prazer lento. Sem pseudociência, sem culpa. Só 7 passos.",
    stepsHeading: "Os 7 passos — um abre por dia.",
    stepsSubheading:
      "O Dia 1 já está aberto pra você começar agora. Os outros seis destravam um de cada vez, conforme você for cumprindo.",
    porqueLabel: "Por quê",
    steps: [
      {
        dia: "Dia 1",
        titulo: "Os 10 primeiros minutos.",
        acao:
          "Amanhã, ao acordar: 10 minutos sem tela. Antes do celular, antes da primeira notificação. Não é para meditar nem render nada — é para ficar. Deixe o tédio bater.",
        porque: "é nesse tédio que o cérebro lembra que existe mundo fora da tela.",
      },
      {
        dia: "Dia 2",
        titulo: "Conte as doses.",
        acao:
          "Hoje você não muda nada. Só repara. Toda vez que a mão for ao celular sem motivo — tédio, fila, farol vermelho — dê um nome a isso: dose. Não brigue. Só conte.",
        porque: "ninguém muda o que não enxerga. Hoje você passa a enxergar.",
      },
      {
        dia: "Dia 3",
        titulo: "Tire uma isca do caminho.",
        acao:
          "Escolha o app que mais te rouba. Aquele. E dificulte: tire da tela inicial, desligue as notificações dele, ou deixe a tela do celular em preto e branco. Um app.",
        porque: "não é força de vontade, é ambiente. Você não resiste à isca — tira a isca do anzol.",
      },
      {
        dia: "Dia 4",
        titulo: "Deixe o tédio ganhar.",
        acao:
          "Uma espera hoje, sem celular: a fila, o elevador, o banheiro, o farol. Escolha uma. Fique lá, entediado, olhando para o nada. Vai coçar a mão. Aguente.",
        porque: "o tédio é a academia da atenção — chato no começo, e é ali que ela volta a crescer.",
      },
      {
        dia: "Dia 5",
        titulo: "Troque uma dose barata por uma lenta.",
        acao:
          "Pegue um pedaço do scroll de hoje — 20 minutos — e gaste em algo que custa esforço e paga devagar: uma caminhada, 10 páginas de um livro, uma conversa de verdade.",
        porque: "vai parecer sem graça porque você se acostumou com o rápido. O que vale sempre foi mais lento.",
      },
      {
        dia: "Dia 6",
        titulo: "Uma hora com gente de verdade.",
        acao:
          "Uma refeição ou uma hora com uma pessoa real — e o celular em outro cômodo. Não no bolso: em outro cômodo. Repare a aflição que dá no começo.",
        porque: "essa aflição é a conta do prazer fácil. Presença é a dopamina que não vem em dose — vem inteira.",
      },
      {
        dia: "Dia 7",
        titulo: "A chave é sua.",
        acao:
          "Sete dias. Você viu que dava para escolher — toda vez. Você não é viciado: viciado não escolhe. Você é escravo voluntário do próprio bolso. E o escravo voluntário pode o que o viciado não pode: retirar o consentimento. Escolha um dos seis passos e leve para a vida. Só um, para sempre.",
        porque: "não o escravo do bolso — o que está com a chave.",
      },
    ],
    lockedBadge: "🔒 Trancado — ainda não é a vez dele.",
    lockedTeaser: "O passo e o porquê ficam escondidos até você fechar o Dia {N-1} — de propósito.",
    unlockButtonLabel: "Fiz o Dia {N}. Destranco o Dia {N+1} →",
    unlockButtonLabelFinal: "Fiz os 7. A chave é sua.",
    unlockButtonDisabledLabel: "Volta amanhã pro Dia {N+1}.",
    progressFooterNote:
      "Seu progresso mora neste navegador, não numa conta. Trocou de aparelho ou limpou o cache? Volta pro Dia 1 — aqui ninguém pede login, e isso é de propósito.",
    completionEyebrow: "OS 7 DIAS ACABARAM",
    completionTitle: "Você tem a chave. A ciência por trás dela está aqui.",
    completionBody:
      "Você provou, na prática, que dava pra escolher — os 7 dias inteiros, um de cada vez. O porquê disso, a ciência real da dopamina e do vício, é o assunto de I Love Dopamina. Garanta seu exemplar agora, no preço da pré-venda.",
    completionCta: "Garantir meu exemplar",
    registroLabel: "Numa frase: o que você notou ou escolheu hoje?",
    registroPlaceholder: "Ex.: reparei que a mão foi sozinha ao bolso.",
    diaFallback: [
      "Aguentei dez minutos sem tela. O tédio bateu — e o mundo continuava ali, do mesmo jeito.",
      "Contei quantas vezes a mão foi sozinha ao bolso. Não julguei — só contei.",
      "Tirei a isca da tela inicial. Hoje o anzol ficou vazio.",
      "Fiquei na fila de mãos vazias. Doeu um pouco — e eu aguentei.",
      "Troquei vinte minutos de scroll por dez páginas de um livro. Não morri de tédio.",
      "Deixei o celular em outro cômodo por uma hora. A presença bastou — inteira, sem dose.",
      "Escolhi um dos seis passos pra levar pra vida. A chave, agora, é minha.",
    ],
    carta: {
      heading: "Sua Carta da Chave",
      subheading:
        "As suas sete frases, uma por dia, viradas em carta. Não é certificado de nada — é o registro de que a escolha foi sua, um dia de cada vez.",
      closing:
        "Sete frases, sete dias. Não é resumo do que você leu — é o registro de que retirou o consentimento, uma linha por vez. A chave sempre foi sua.",
      shareInvite:
        "Se quiser, printa — pra guardar, ou pra mandar a alguém que precisa ler isso. É sua carta. Eu não peço marcação nem hashtag: você decide se ela sai daqui.",
    },
    form: {
      heading: "Quer o reforço diário?",
      body:
        "Deixe seu e-mail e receba o lembrete curto do passo do dia — um por dia, na voz do Dr. Liberdade, pra não perder o ritmo. Não pula fila: os passos continuam abrindo um por dia, no seu tempo.",
      label: "Seu melhor e-mail",
      placeholder: "voce@email.com",
      cta: "Quero o reforço",
      success:
        "Pronto — teu e-mail está guardado. O reforço diário chega a partir de amanhã, um lembrete por dia. Os passos aqui em cima continuam abrindo no seu ritmo — um a cada dia.",
      note: "Sem spam. Um e-mail por dia, 7 dias. Cancela com um clique.",
      error: "Confere o e-mail — parece que faltou algo.",
    },
    finalTitle: "Isto foi o começo.",
    finalLead:
      "Estes 7 passos são a saída. O porquê — como a sua atenção foi sequestrada e o que a ciência de fato mostra sobre a dopamina — é o tema do livro I Love Dopamina. A prévia é grátis.",
    finalCta: "Ler a prévia de I Love Dopamina",
    finalHref: "/br/livros/i-love-dopamina",
    disclaimer:
      "Conteúdo estritamente educativo. Não substitui acompanhamento de um profissional de saúde e não promete cura nem tratamento de transtornos.",
    footerSignature: "Dr. Liberdade",
  },
  es: {
    metaTitle: "7 días para recuperar tu atención — Guía gratis | Dr. Libertad",
    metaDescription:
      "Un protocolo corto y honesto para salir del automático del feed: 7 movimientos pequeños, uno por día. Sin detox milagroso, sin fórmula mágica.",
    badge: "Guía gratis · 7 días",
    titlePre: "7 días para",
    titleEm: "recuperar tu atención",
    subtitle:
      "Un protocolo corto y honesto para salir del automático del feed — un paso por día, uno solo.",
    lead:
      "Te secuestraron la atención en silencio — dosis a dosis, toque a toque. Esta guía es el camino de vuelta: 7 movimientos pequeños, uno por día, para que veas quién tiene la llave. No es un detox milagroso ni la promesa de “resetear el cerebro” — eso es cuento de vendedor. Es lo contrario: dejar de alimentar lo fácil y reaprender a querer lo que vale.",
    chips: ["7 pasos · 7 días", "1 por día, cabe en el bolsillo", "Edición PT · ES", "Sin fórmula mágica"],
    honestyHeading: "La verdad que la guía asume",
    honestyBody:
      "“Resetear el piso de la dopamina” es una imagen, no un botón en tu cerebro. Nadie pone nada a cero en una semana. Lo que sí se puede — y funciona — es recalibrar la conducta: cambiar el entorno, aguantar el aburrimiento, cambiar el placer barato por el placer lento. Sin pseudociencia, sin culpa. Solo 7 pasos.",
    stepsHeading: "Los 7 pasos — uno se abre por día.",
    stepsSubheading:
      "Empieza ahora con el Día 1. Los otros seis se destraban de a uno, a medida que los vayas cumpliendo.",
    porqueLabel: "Por qué",
    steps: [
      {
        dia: "Día 1",
        titulo: "Los primeros 10 minutos.",
        acao:
          "Mañana, al despertar: 10 minutos sin pantalla. Antes del móvil, antes de la primera notificación. No es para meditar ni rendir nada — es para quedarte. Deja que el aburrimiento llegue.",
        porque: "es en ese aburrimiento donde el cerebro recuerda que hay mundo fuera de la pantalla.",
      },
      {
        dia: "Día 2",
        titulo: "Cuenta las dosis.",
        acao:
          "Hoy no cambias nada. Solo te das cuenta. Cada vez que la mano vaya al móvil sin motivo — aburrimiento, cola, semáforo en rojo — ponle nombre: dosis. No pelees. Solo cuenta.",
        porque: "nadie cambia lo que no ve. Hoy empiezas a verlo.",
      },
      {
        dia: "Día 3",
        titulo: "Saca un cebo del camino.",
        acao:
          "Elige la app que más te roba. Esa. Y ponla difícil: quítala de la pantalla de inicio, apaga sus notificaciones, o deja la pantalla en blanco y negro. Una app.",
        porque: "no es fuerza de voluntad, es entorno. No resistes el cebo — sacas el cebo del anzuelo.",
      },
      {
        dia: "Día 4",
        titulo: "Deja que el aburrimiento gane.",
        acao:
          "Una espera hoy, sin móvil: la cola, el ascensor, el baño, el semáforo. Elige una. Quédate ahí, aburrido, mirando a la nada. Te va a picar la mano. Aguanta.",
        porque: "el aburrimiento es el gimnasio de la atención — incómodo al principio, y ahí es donde vuelve a crecer.",
      },
      {
        dia: "Día 5",
        titulo: "Cambia una dosis barata por una lenta.",
        acao:
          "Agarra un trozo del scroll de hoy — 20 minutos — y gástalo en algo que cuesta esfuerzo y paga despacio: una caminata, 10 páginas de un libro, una conversación de verdad.",
        porque: "va a parecer soso porque te acostumbraste a lo rápido. Lo que vale siempre fue más lento.",
      },
      {
        dia: "Día 6",
        titulo: "Una hora con gente de verdad.",
        acao:
          "Una comida o una hora con una persona real — y el móvil en otra habitación. No en el bolsillo: en otra habitación. Fíjate en la desazón que da al principio.",
        porque: "esa desazón es la cuenta del placer fácil. La presencia es la dopamina que no viene en dosis — viene entera.",
      },
      {
        dia: "Día 7",
        titulo: "La llave es tuya.",
        acao:
          "Siete días. Viste que se podía elegir — cada vez. No eres un adicto: el adicto no elige. Eres esclavo voluntario de tu propio bolsillo. Y el esclavo voluntario puede lo que el adicto no puede: retirar el consentimiento. Elige uno de los seis pasos y llévalo a tu vida. Solo uno, para siempre.",
        porque: "no el esclavo del bolsillo — el que tiene la llave.",
      },
    ],
    lockedBadge: "🔒 Bloqueado — todavía no le toca.",
    lockedTeaser: "El paso y el porqué quedan ocultos hasta que cierres el Día {N-1} — a propósito.",
    unlockButtonLabel: "Hice el Día {N}. Destrabo el Día {N+1} →",
    unlockButtonLabelFinal: "Hice los 7. La llave es tuya.",
    unlockButtonDisabledLabel: "Vuelve mañana por el Día {N+1}.",
    progressFooterNote:
      "Tu progreso vive en este navegador, no en una cuenta. ¿Cambiaste de aparato o borraste el caché? Vuelves al Día 1 — aquí nadie pide login, y eso es a propósito.",
    completionEyebrow: "LOS 7 DÍAS TERMINARON",
    completionTitle: "Tienes la llave. La ciencia detrás de ella está aquí.",
    completionBody:
      "Probaste, en la práctica, que se podía elegir — los 7 días enteros, uno a la vez. El porqué de eso, la ciencia real de la dopamina y la adicción, es el tema de I Love Dopamina. Asegura tu ejemplar ahora, al precio de la preventa.",
    completionCta: "Asegurar mi ejemplar",
    registroLabel: "En una frase: ¿qué notaste o elegiste hoy?",
    registroPlaceholder: "Ej.: noté que la mano fue sola al bolsillo.",
    diaFallback: [
      "Aguanté diez minutos sin pantalla. El aburrimiento llegó — y el mundo seguía ahí, igual que siempre.",
      "Conté cuántas veces la mano fue sola al bolsillo. No me juzgué — solo conté.",
      "Saqué el cebo de la pantalla de inicio. Hoy el anzuelo quedó vacío.",
      "Me quedé en la cola con las manos vacías. Dolió un poco — y aguanté.",
      "Cambié veinte minutos de scroll por diez páginas de un libro. No me morí de aburrimiento.",
      "Dejé el móvil en otra habitación por una hora. La presencia alcanzó — entera, sin dosis.",
      "Elegí uno de los seis pasos para llevarlo a mi vida. La llave, ahora, es mía.",
    ],
    carta: {
      heading: "Tu Carta de la Llave",
      subheading:
        "Tus siete frases, un día a la vez, convertidas en carta. No es ningún certificado — es el registro de que la elección fue tuya, un día tras otro.",
      closing:
        "Siete frases, siete días. No es un resumen de lo que leíste — es el registro de que retiraste el consentimiento, una línea a la vez. La llave siempre fue tuya.",
      shareInvite:
        "Si quieres, haz captura — para guardarla, o para mandársela a alguien que necesita leer esto. Es tu carta. No pido que me etiquetes ni ningún hashtag: tú decides si sale de aquí.",
    },
    form: {
      heading: "¿Quieres el refuerzo diario?",
      body:
        "Deja tu correo y recibe el recordatorio corto del paso del día — uno por día, en la voz del Dr. Libertad, para no perder el ritmo. No te saltas la fila: los pasos siguen abriéndose uno por día, a tu ritmo.",
      label: "Tu mejor correo",
      placeholder: "tu@email.com",
      cta: "Quiero el refuerzo",
      success:
        "Listo — tu correo quedó guardado. El refuerzo diario llega a partir de mañana, un recordatorio por día. Los pasos aquí arriba siguen abriéndose a tu ritmo — uno cada día.",
      note: "Sin spam. Un correo por día, 7 días. Cancela con un clic.",
      error: "Revisa el correo — parece que faltó algo.",
    },
    finalTitle: "Esto fue el comienzo.",
    finalLead:
      "Estos 7 pasos son la salida. El porqué — cómo te secuestraron la atención y qué muestra de verdad la ciencia sobre la dopamina — es el tema del libro I Love Dopamina. El adelanto es gratis.",
    finalCta: "Leer el adelanto de I Love Dopamina",
    finalHref: "/es/livros/i-love-dopamina",
    disclaimer:
      "Contenido estrictamente educativo. No sustituye el acompañamiento de un profesional de la salud y no promete cura ni tratamiento de trastornos.",
    footerSignature: "Dr. Libertad",
  },
};
