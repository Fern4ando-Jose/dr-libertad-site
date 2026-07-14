// Conteúdo do funil "Guia de 7 dias" (lead magnet do funil comment→DM, Reel C).
// FONTE do texto = editor-chefe: src/content/temas-livros/guia-7-dias.md (Parte A).
// PT nativo + ES nativo (regenerado, não traduzido). A página ENTREGA o guia inteiro
// (delivery imediato, on-page); o e-mail Brevo é reforço opcional (opt-in).
//
// HONESTIDADE P4 (trava desta peça): "resetar o piso da dopamina" é METÁFORA, não
// neurociência literal — bloco de honestidade visível na página. Recalibração
// comportamental, não pseudociência. Ver o .md do editor-chefe.

export type Lang = "pt" | "es";

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
  porqueLabel: string;
  steps: Step[];
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
  pt: {
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
    stepsHeading: "Os 7 passos",
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
    form: {
      heading: "Quer o reforço diário?",
      body:
        "Deixe seu e-mail e receba, por 7 dias, um lembrete curto do passo do dia — um por dia, na voz do Dr. Liberdade. Opcional: o guia inteiro já está aqui em cima.",
      label: "Seu melhor e-mail",
      placeholder: "voce@email.com",
      cta: "Quero o reforço",
      success:
        "Pronto — teu e-mail está guardado. 👊 O guia inteiro está logo aqui em cima; o reforço diário chega quando você começar.",
      note: "Sem spam. Um e-mail por dia, 7 dias. Cancela com um clique.",
      error: "Confere o e-mail — parece que faltou algo.",
    },
    finalTitle: "Isto foi o começo.",
    finalLead:
      "Estes 7 passos são a saída. O porquê — como a sua atenção foi sequestrada e o que a ciência de fato mostra sobre a dopamina — é o tema do livro I Love Dopamina. A prévia é grátis.",
    finalCta: "Ler a prévia de I Love Dopamina",
    finalHref: "/pt/livros/i-love-dopamina",
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
    stepsHeading: "Los 7 pasos",
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
    form: {
      heading: "¿Quieres el refuerzo diario?",
      body:
        "Deja tu correo y recibe, durante 7 días, un recordatorio corto del paso del día — uno por día, en la voz del Dr. Libertad. Opcional: la guía entera ya está aquí arriba.",
      label: "Tu mejor correo",
      placeholder: "tu@email.com",
      cta: "Quiero el refuerzo",
      success:
        "Listo — tu correo quedó guardado. 👊 La guía entera está aquí arriba; el refuerzo diario llega cuando empieces.",
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
