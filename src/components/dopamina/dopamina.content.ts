// Conteúdo do funil próprio do livro "I Love Dopamina": LANDING (PARTE 2) + QUIZ
// (PARTE 1) — porta de captura da lista Brevo EXCLUSIVA "I Love Dopamina".
//
// Fonte da voz aprovada (PT-BR): a copy da frente de marketing em
// `Livros-Escrevendo/I love Dopamina/Marketing/FUNIL-QUIZ-E-LANDING.md` (PARTE 1 = quiz
// "Quão sequestrado está o seu sistema de recompensa?", 8 perguntas + 4 faixas;
// PARTE 2 = a landing). PT-BR é verbatim da copy.
//
// ⚠️ ES = TRADUÇÃO do agente, ainda PENDENTE do OK de voz do dono / guardião-editorial
// (P4). A voz da @dr.liberdad tem tom próprio; validar antes de considerar "aprovado".
// (Mesmo padrão do quiz do 100 dias — quiz.content.ts.)
//
// A "faixa" (verde/amarelo/vermelho/critico) é a TAG de segmentação enviada ao Brevo
// (interna) — NÃO é exibida ao usuário como jargão de funil. O usuário vê só o
// veredito da própria faixa. Mapa de trilha (interno, do doc de marketing):
//   verde → Cap 3 (cassino) · amarelo → Cap 5+6 (supernormal/tolerância)
//   vermelho → Cap 8+10 (detox é mito / dopamina lenta) · critico → Cap 11+8.

import type { Lang } from "@/lib/i18n/dictionaries";

export type Faixa = "verde" | "amarelo" | "vermelho" | "critico";

export interface Band {
  key: Faixa;
  min: number; // pontuação mínima (inclusiva)
  max: number; // pontuação máxima (inclusiva)
  emoji: string;
  color: string;
  name: string;
  verdict: string;
}

export interface Question {
  axis: string;
  text: string;
  options: string[]; // 4 alternativas; índice = peso (0..3)
}

export interface DopaminaContent {
  metaTitle: string;
  metaDescription: string;

  // ── LANDING (PARTE 2) ──────────────────────────────────────────────
  hero: {
    badge: string;
    title: string;
    sub: string;
    ctaQuiz: string;
    ctaPrevia: string;
  };
  identify: {
    heading: string;
    items: string[];
    punch: string;
    cta: string;
  };
  previa: {
    heading: string;
    lead: string;
    items: string[];
    closer: string;
    ctaQuiz: string;
    ctaQuizNote: string;
    formLabel: string;
    formPlaceholder: string;
    formCta: string;
    formNote: string;
    formSuccess: string;
    formError: string;
  };
  proof: {
    heading: string;
    body: string;
    honesty: string;
  };
  faq: {
    heading: string;
    items: { q: string; a: string }[];
  };
  footRepeatCta: string;
  footerDisclaimer: string;
  footerSignature: string;

  // ── QUIZ (PARTE 1) ─────────────────────────────────────────────────
  quiz: {
    kicker: string;
    titlePre: string;
    titleEm: string;
    subtitle: string;
    opening: string;
    questionsLabel: string;
    questions: Question[]; // 8
    gate: {
      heading: string;
      body: string;
      placeholder: string;
      cta: string;
      hintLocked: string;
      emailNote: string;
    };
    result: {
      scoreSuffix: string;
      guidePromise: string;
    };
    disclaimer: string;
  };

  bands: Band[];
}

const BAND_META: Record<Faixa, { min: number; max: number; emoji: string; color: string }> = {
  verde: { min: 0, max: 5, emoji: "🟢", color: "#5a9c6b" },
  amarelo: { min: 6, max: 12, emoji: "🟡", color: "#d8b53a" },
  vermelho: { min: 13, max: 18, emoji: "🟠", color: "#dd8a43" },
  critico: { min: 19, max: 24, emoji: "🔴", color: "#A45A5A" }, // muted-red do site
};

// ─────────────────────────────────────────────────────────────────────
// PT-BR — verbatim da copy aprovada da frente de marketing.
// ─────────────────────────────────────────────────────────────────────
const br: DopaminaContent = {
  metaTitle: "I Love Dopamina — você não é fraco, está sendo farmado",
  metaDescription:
    "O teste de 1 minuto: quão sequestrado está o seu sistema de recompensa? Faça o teste e receba a prévia grátis de I Love Dopamina.",

  hero: {
    badge: "I LOVE DOPAMINA · PRÉVIA GRÁTIS",
    title: "Você não é fraco. Você está sendo farmado.",
    sub: "Aquele cansaço de não terminar nada. O tédio que só a tela cura. A vontade que evaporou. Você acha que é falha sua. Não é — é engenharia. E ela tem um alvo só: uma molécula de seis átomos chamada dopamina.",
    ctaQuiz: "Fazer o teste de 1 minuto",
    ctaPrevia: "Só quero a prévia grátis",
  },
  identify: {
    heading: "Reconhece algum destes?",
    items: [
      "Rola o feed “só um pouco” e perde 40 minutos sem perceber.",
      "Sente uma fisgada de ansiedade quando o celular não está por perto.",
      "Começa um vídeo de 10 minutos e já abre outra aba no meio.",
      "Termina a noite com prazer raso + vazio + culpa.",
      "Adia o que importa — mas sempre sobra energia pra mais uma tela.",
    ],
    punch:
      "Se marcou três ou mais, não é fraqueza de caráter. É o seu sistema de recompensa pedindo socorro. E tem explicação — uma que quase ninguém te contou direito.",
    cta: "Descobrir o quanto → faça o teste",
  },
  previa: {
    heading: "Antes do livro, um pedaço real dele.",
    lead: "Não é um resumo. Não é um “e-book de 5 dicas”. É a prévia de I Love Dopamina — um capítulo de verdade. Dentro dela:",
    items: [
      "Por que a dopamina NÃO é o “hormônio do prazer” — e por que esse erro te deixa vulnerável.",
      "O cassino no seu bolso — o mecanismo exato do seu feed. O mesmo da caça-níquel. Não é metáfora.",
      "A conta que ninguém mostra — por que a vida real, que sempre foi suficiente, passou a parecer insuficiente.",
      "Os quatro primeiros movimentos — o que começar a fazer hoje, sem virar um ermitão.",
    ],
    closer: "E não custa nada. Dois jeitos de começar:",
    ctaQuiz: "Faça o teste (1 min) → resultado + prévia",
    ctaQuizNote: "recomendado",
    formLabel: "Só a prévia? Deixe o seu e-mail:",
    formPlaceholder: "seu@email.com",
    formCta: "Receber a prévia grátis",
    formNote: "Sem spam. Só as ideias mais importantes do livro, uma de cada vez. Você sai quando quiser.",
    formSuccess: "Pronto ✓ A prévia está a caminho da sua caixa de entrada.",
    formError: "Digite um e-mail válido.",
  },
  proof: {
    heading: "Não é mais um vídeo de detox.",
    body: "I Love Dopamina não é mais um vídeo de “detox de dopamina em 24 horas”. É o contrário disso. É a história honesta da dopamina — da molécula que a ciência jogou no lixo por 40 anos à que a internet transformou em vilã — em português de gente, sem alarmismo. A tese, simples e incômoda: quase tudo que te venderam sobre dopamina (que ela é “prazer”, que a solução é um “detox”) está errado. Assinado por Dr. Liberdade — o mesmo trabalho de @dr.liberdade.br, para quem cansou de ser farmado.",
    honesty:
      "Honestidade primeiro: este livro ainda está sendo escrito, capítulo a capítulo. A prévia que você recebe já está pronta e é real. Ao entrar na lista, você lê o restante antes de todo mundo — e ajuda a moldar o livro final.",
  },
  faq: {
    heading: "Antes de você perguntar",
    items: [
      {
        q: "Isso é mais um vídeo de detox de dopamina?",
        a: "O oposto. O livro mostra por que “detox de dopamina” é biologicamente impossível. Você não quer zerar a dopamina; precisa dela. O ponto é recalibrar, não amputar.",
      },
      {
        q: "Vou receber spam?",
        a: "Não. A prévia agora e, depois, as ideias mais importantes do livro — uma de cada vez. Um clique cancela quando quiser.",
      },
      {
        q: "Preciso pagar?",
        a: "Não. Teste e prévia são gratuitos. O livro completo vem depois, e quem está na lista fica sabendo primeiro (e com a melhor condição de lançamento).",
      },
    ],
  },
  footRepeatCta: "Ainda dá tempo: faça o teste de 1 minuto →",
  footerDisclaimer:
    "Conteúdo educativo. “Dr. Liberdade” é persona editorial; este material e o livro não constituem diagnóstico, tratamento ou aconselhamento médico. Se você sofre com ansiedade, compulsões ou uso de telas que afetam a sua vida, procure um profissional de saúde.",
  footerSignature: "I Love Dopamina · Dr. Liberdade · @dr.liberdade.br",

  quiz: {
    kicker: "O teste de 1 minuto",
    titlePre: "Quão sequestrado está o seu",
    titleEm: "sistema de recompensa?",
    subtitle: "8 perguntas sobre o seu dia. Coisas pequenas, concretas. Um minuto. Um espelho.",
    opening:
      "Você não vai responder se é “viciado”. Ninguém é bom nesse tipo de auto-avaliação. Você vai responder 8 perguntas sobre o seu dia. Coisas pequenas, concretas. Leva um minuto. No fim, eu te digo uma coisa que quase ninguém para pra medir: o quanto o seu sistema de recompensa ainda responde a você — e o quanto ele já responde à tela. Sem julgamento. Isto não é um teste que você passa ou reprova. É um espelho.",
    questionsLabel: "As 8 perguntas",
    questions: [
      {
        axis: "A primeira coisa do dia",
        text: "Nos primeiros 10 minutos depois de acordar, o que a sua mão faz?",
        options: [
          "Levanto, começo o dia. O celular pode esperar.",
          "Dou uma olhada rápida e largo.",
          "Pego o celular ainda deitado e rolo um pouco antes de sair da cama.",
          "Já estou no feed antes de estar de pé direito. Nem decidi pegar — já peguei.",
        ],
      },
      {
        axis: "O “só um pouco”",
        text: "Você abre o feed para dar “só uma olhada”. Como isso costuma terminar?",
        options: [
          "Vejo o que queria e saio. Minutos.",
          "Às vezes escapa um pouco, mas percebo e paro.",
          "Levanto a cabeça e já se passaram uns 20, 30 minutos.",
          "“Só um pouco” vira 40 minutos, uma hora, e eu nem sei o que vi.",
        ],
      },
      {
        axis: "Longe do celular",
        text: "Quando o celular não está por perto, o que você sente?",
        options: [
          "Nada. Só percebo quando preciso dele pra algo.",
          "Uma leve falta, passa rápido.",
          "Uma inquietação, uma fisgada. Fico pensando nele.",
          "Ansiedade de verdade. Preciso ir buscar. Não relaxo sem ele à vista.",
        ],
      },
      {
        axis: "Terminar as coisas",
        text: "Você começa um vídeo, um episódio, um texto mais longo. Vai até o fim?",
        options: [
          "Se me interessa, vou até o fim, inteiro.",
          "Na maioria das vezes termino.",
          "Começo, mas no meio já abri outra aba, ou pulei pro próximo.",
          "Raramente termino. Pulo, acelero, troco. Nada segura minha atenção por muito tempo.",
        ],
      },
      {
        axis: "O gosto que sobra",
        text: "Depois de uma noite rolando tela ou jogando, como você se sente?",
        options: [
          "Bem, ou neutro. Foi um descanso.",
          "Um pouco de “podia ter feito outra coisa”, mas tudo bem.",
          "Uma mistura de prazer raso com um vazio meio estranho.",
          "Prazer no momento, vazio depois, e uma culpa que já virou rotina. E mesmo assim repito no dia seguinte.",
        ],
      },
      {
        axis: "A vida sem tela",
        text: "Um café sem celular. Uma fila. Uma conversa que se arrasta. Um livro. Como soa hoje?",
        options: [
          "Normal. Consigo estar ali, presente, sem tela.",
          "De vez em quando bate um tédio, mas dou conta.",
          "Fico inquieto rápido. A mão coça pra pegar o celular.",
          "Insuportável. Sem estímulo, tudo parece lento, chato, sem graça. O real ficou devagar demais.",
        ],
      },
      {
        axis: "O que importa × mais uma tela",
        text: "A tarefa importante que você adia, e “mais uma rolada”. Quem ganha?",
        options: [
          "Faço o que importa primeiro. A tela é depois.",
          "Enrolo um pouco, mas chego lá.",
          "Adio o importante, mas sempre sobra energia pra tela.",
          "Passo o dia dizendo “já vou fazer” — e o dia acaba com a tarefa intacta e horas de tela.",
        ],
      },
      {
        axis: "A recompensa lenta",
        text: "Treinar, ler, criar, terminar algo difícil e real. Quando foi a última vez?",
        options: [
          "Faço isso quase todo dia. Faz parte da minha vida.",
          "Essa semana, uma ou outra vez.",
          "Faz um tempo. Sei que devia, mas o esforço parece grande demais.",
          "Nem lembro. Tudo que é difícil e demorado eu troco pelo que dá prazer rápido.",
        ],
      },
    ],
    gate: {
      heading: "Seu resultado está pronto.",
      body: "Antes de mostrar, deixa eu te mandar junto uma coisa que vale mais que o resultado: a prévia de I Love Dopamina. Não é um resumo — é um pedaço real do livro. Ela explica por que o seu cérebro chegou onde chegou. E o que fazer a respeito. Deixe seu melhor e-mail. Você recebe as duas coisas agora: o seu resultado + a prévia na caixa de entrada.",
      placeholder: "seu@email.com",
      cta: "Ver meu resultado + receber a prévia",
      hintLocked: "Responda as 8 perguntas para liberar o resultado.",
      emailNote: "Sem spam. Só as ideias mais importantes do livro, uma de cada vez. Você sai quando quiser.",
    },
    result: {
      scoreSuffix: "/24",
      guidePromise: "A prévia de I Love Dopamina e o seu resultado estão a caminho da sua caixa de entrada.",
    },
    disclaimer:
      "Este resultado é educativo e reflexivo — não é diagnóstico, laudo nem avaliação clínica. “Dr. Liberdade” é uma persona editorial; o conteúdo não substitui acompanhamento profissional de saúde. Se o uso de telas, jogos ou outras compulsões está afetando o seu trabalho, seu sono ou suas relações, procure um profissional de saúde.",
  },

  bands: [
    {
      key: "verde",
      ...BAND_META.verde,
      name: "Você ainda segura o volante",
      verdict:
        "O seu sistema de recompensa responde a você — não ao algoritmo. Você usa a tela; ela não usa você. É mais raro do que parece, e vale proteger. Mas ninguém está imune: o ambiente foi desenhado pra puxar todo mundo pra baixo, um deslize de cada vez. Saber como a armadilha funciona é o que te mantém do lado de fora dela. Comece pela prévia — o capítulo do cassino no seu bolso mostra o mecanismo exato, pra você reconhecer de longe.",
    },
    {
      key: "amarelo",
      ...BAND_META.amarelo,
      name: "A conta começou a chegar",
      verdict:
        "Você não está sequestrado. Mas alguns sinais apareceram: o “só um pouco” que estica, o real que às vezes parece devagar demais, o vazio depois do prazer rápido. Isso não é falha de caráter — é tolerância, a mesma mecânica de qualquer vício. Quanto mais picos rápidos, menos sensível o cérebro fica ao que é real. Não é o mundo que ficou sem graça: é a sua régua de prazer, calibrada no caça-níquel. Dá pra recalibrar. A prévia explica como isso se instala — e o livro mostra o caminho de volta.",
    },
    {
      key: "vermelho",
      ...BAND_META.vermelho,
      name: "O algoritmo está dirigindo — mas o carro ainda é seu",
      verdict:
        "Honestidade: boa parte do seu dia hoje é decidida pela tela, não por você. A mão pega o celular antes da decisão. O importante fica pra depois. Isso não te torna fraco. Você compete contra prédios cheios de gente com doutorado, cujo trabalho é te fazer rolar mais um pouco — eles conhecem o seu cérebro melhor que você. Perder essa disputa é o resultado esperado de uma luta desigual que ninguém te avisou que existia. A saída não é o “detox” que te venderam — é recalibrar a sensibilidade, mudando o ambiente e a ordem das recompensas. A prévia começa esse caminho. O livro traz o protocolo inteiro.",
    },
    {
      key: "critico",
      ...BAND_META.critico,
      name: "Não é sobre a tela. É sobre recuperar a chave.",
      verdict:
        "O resultado diz que quase toda a sua busca por prazer hoje passa pelo estímulo rápido — e que o real, o lento, o difícil, quase sumiu. Antes de tudo: isto não é um laudo, e você não é um caso perdido. É um espelho de um momento. O que aconteceu tem nome, tem ciência, e não começou por sua causa: um cérebro exposto a estímulo rápido o tempo todo perde a sensibilidade ao que é real — é biologia, não personalidade. E biologia se recalibra, na ordem certa, um passo de cada vez. Comece pela prévia agora — ela mostra por que você chegou aqui, e que a saída existe (o livro traz o caminho completo, os passos na ordem), sem virar um ermitão que joga o celular no rio.",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────
// ES — ⚠️ tradução do agente, PENDENTE de OK de voz (guardião-editorial).
// ─────────────────────────────────────────────────────────────────────
const es: DopaminaContent = {
  metaTitle: "I Love Dopamina — no eres débil, te están farmeando",
  metaDescription:
    "El test de 1 minuto: ¿qué tan secuestrado está tu sistema de recompensa? Haz el test y recibe el adelanto gratis de I Love Dopamina.",

  hero: {
    badge: "I LOVE DOPAMINA · ADELANTO GRATIS",
    title: "No eres débil. Te están farmeando.",
    sub: "Ese cansancio de no terminar nada. El aburrimiento que solo la pantalla cura. Las ganas que se evaporaron. Crees que es culpa tuya. No lo es — es ingeniería. Y tiene un solo blanco: una molécula de seis átomos llamada dopamina.",
    ctaQuiz: "Hacer el test de 1 minuto",
    ctaPrevia: "Solo quiero el adelanto gratis",
  },
  identify: {
    heading: "¿Reconoces alguno de estos?",
    items: [
      "Deslizas el feed “solo un poco” y pierdes 40 minutos sin darte cuenta.",
      "Sientes una punzada de ansiedad cuando el celular no está cerca.",
      "Empiezas un video de 10 minutos y ya abres otra pestaña a la mitad.",
      "Terminas la noche con placer superficial + vacío + culpa.",
      "Aplazas lo que importa — pero siempre sobra energía para una pantalla más.",
    ],
    punch:
      "Si marcaste tres o más, no es debilidad de carácter. Es tu sistema de recompensa pidiendo auxilio. Y tiene explicación — una que casi nadie te contó bien.",
    cta: "Descubrir cuánto → haz el test",
  },
  previa: {
    heading: "Antes del libro, un pedazo real de él.",
    lead: "No es un resumen. No es un “e-book de 5 tips”. Es el adelanto de I Love Dopamina — un capítulo de verdad. Dentro:",
    items: [
      "Por qué la dopamina NO es la “hormona del placer” — y por qué ese error te deja vulnerable.",
      "El casino en tu bolsillo — el mecanismo exacto de tu feed. El mismo de la tragamonedas. No es metáfora.",
      "La cuenta que nadie muestra — por qué la vida real, que siempre fue suficiente, pasó a parecer insuficiente.",
      "Los cuatro primeros movimientos — qué empezar a hacer hoy, sin volverte un ermitaño.",
    ],
    closer: "Y no cuesta nada. Dos maneras de empezar:",
    ctaQuiz: "Haz el test (1 min) → resultado + adelanto",
    ctaQuizNote: "recomendado",
    formLabel: "¿Solo el adelanto? Deja tu correo:",
    formPlaceholder: "tu@correo.com",
    formCta: "Recibir el adelanto gratis",
    formNote: "Sin spam. Solo las ideas más importantes del libro, una a la vez. Sales cuando quieras.",
    formSuccess: "Listo ✓ El adelanto va camino a tu bandeja de entrada.",
    formError: "Escribe un correo válido.",
  },
  proof: {
    heading: "No es otro video de detox.",
    body: "I Love Dopamina no es otro video de “detox de dopamina en 24 horas”. Es lo contrario. Es la historia honesta de la dopamina — de la molécula que la ciencia tiró a la basura por 40 años a la que la internet convirtió en villana — en español de gente, sin alarmismo. La tesis, simple e incómoda: casi todo lo que te vendieron sobre la dopamina (que es “placer”, que la solución es un “detox”) está mal. Firmado por Dr. Libertad — el mismo trabajo de @dr.liberdad, para quien se cansó de que lo farmeen.",
    honesty:
      "Honestidad primero: este libro todavía se está escribiendo, capítulo a capítulo. El adelanto que recibes ya está listo y es real. Al entrar en la lista, lees el resto antes que todos — y ayudas a moldear el libro final.",
  },
  faq: {
    heading: "Antes de que preguntes",
    items: [
      {
        q: "¿Esto es otro video de detox de dopamina?",
        a: "Lo opuesto. El libro muestra por qué el “detox de dopamina” es biológicamente imposible. No quieres poner la dopamina en cero; la necesitas. El punto es recalibrar, no amputar.",
      },
      {
        q: "¿Voy a recibir spam?",
        a: "No. El adelanto ahora y, después, las ideas más importantes del libro — una a la vez. Un clic cancela cuando quieras.",
      },
      {
        q: "¿Tengo que pagar?",
        a: "No. El test y el adelanto son gratis. El libro completo viene después, y quien está en la lista se entera primero (y con la mejor condición de lanzamiento).",
      },
    ],
  },
  footRepeatCta: "Aún hay tiempo: haz el test de 1 minuto →",
  footerDisclaimer:
    "Contenido educativo. “Dr. Libertad” es persona editorial; este material y el libro no constituyen diagnóstico, tratamiento ni consejo médico. Si sufres de ansiedad, compulsiones o uso de pantallas que afectan tu vida, busca a un profesional de la salud.",
  footerSignature: "I Love Dopamina · Dr. Libertad · @dr.liberdad",

  quiz: {
    kicker: "El test de 1 minuto",
    titlePre: "¿Qué tan secuestrado está tu",
    titleEm: "sistema de recompensa?",
    subtitle: "8 preguntas sobre tu día. Cosas pequeñas, concretas. Un minuto. Un espejo.",
    opening:
      "No vas a responder si eres “adicto”. Nadie es bueno en ese tipo de autoevaluación. Vas a responder 8 preguntas sobre tu día. Cosas pequeñas, concretas. Toma un minuto. Al final, te digo algo que casi nadie se detiene a medir: cuánto tu sistema de recompensa todavía te responde a ti — y cuánto ya le responde a la pantalla. Sin juicio. Esto no es un test que apruebas o repruebas. Es un espejo.",
    questionsLabel: "Las 8 preguntas",
    questions: [
      {
        axis: "Lo primero del día",
        text: "En los primeros 10 minutos después de despertar, ¿qué hace tu mano?",
        options: [
          "Me levanto, empiezo el día. El celular puede esperar.",
          "Le doy un vistazo rápido y lo suelto.",
          "Agarro el celular aún acostado y deslizo un poco antes de salir de la cama.",
          "Ya estoy en el feed antes de estar de pie. Ni decidí agarrarlo — ya lo agarré.",
        ],
      },
      {
        axis: "El “solo un poco”",
        text: "Abres el feed para dar “solo un vistazo”. ¿Cómo suele terminar?",
        options: [
          "Veo lo que quería y salgo. Minutos.",
          "A veces se me va un poco, pero me doy cuenta y paro.",
          "Levanto la cabeza y ya pasaron unos 20, 30 minutos.",
          "“Solo un poco” se vuelve 40 minutos, una hora, y ni sé qué vi.",
        ],
      },
      {
        axis: "Lejos del celular",
        text: "Cuando el celular no está cerca, ¿qué sientes?",
        options: [
          "Nada. Solo lo noto cuando lo necesito para algo.",
          "Una leve falta, pasa rápido.",
          "Una inquietud, una punzada. Sigo pensando en él.",
          "Ansiedad de verdad. Necesito ir a buscarlo. No me relajo sin él a la vista.",
        ],
      },
      {
        axis: "Terminar las cosas",
        text: "Empiezas un video, un episodio, un texto más largo. ¿Llegas hasta el final?",
        options: [
          "Si me interesa, voy hasta el final, entero.",
          "La mayoría de las veces termino.",
          "Empiezo, pero a la mitad ya abrí otra pestaña, o salté al siguiente.",
          "Rara vez termino. Salto, acelero, cambio. Nada retiene mi atención mucho tiempo.",
        ],
      },
      {
        axis: "El sabor que queda",
        text: "Después de una noche deslizando pantalla o jugando, ¿cómo te sientes?",
        options: [
          "Bien, o neutro. Fue un descanso.",
          "Un poco de “podría haber hecho otra cosa”, pero está bien.",
          "Una mezcla de placer superficial con un vacío algo extraño.",
          "Placer en el momento, vacío después, y una culpa que ya es rutina. Y aun así lo repito al día siguiente.",
        ],
      },
      {
        axis: "La vida sin pantalla",
        text: "Un café sin celular. Una fila. Una conversación que se arrastra. Un libro. ¿Cómo suena hoy?",
        options: [
          "Normal. Puedo estar ahí, presente, sin pantalla.",
          "De vez en cuando me aburro, pero lo manejo.",
          "Me inquieto rápido. La mano pica por agarrar el celular.",
          "Insoportable. Sin estímulo, todo parece lento, aburrido, sin gracia. Lo real se volvió demasiado lento.",
        ],
      },
      {
        axis: "Lo que importa × una pantalla más",
        text: "La tarea importante que aplazas, y “un scroll más”. ¿Quién gana?",
        options: [
          "Hago lo que importa primero. La pantalla es después.",
          "Me demoro un poco, pero llego.",
          "Aplazo lo importante, pero siempre sobra energía para la pantalla.",
          "Paso el día diciendo “ya voy a hacerlo” — y el día acaba con la tarea intacta y horas de pantalla.",
        ],
      },
      {
        axis: "La recompensa lenta",
        text: "Entrenar, leer, crear, terminar algo difícil y real. ¿Cuándo fue la última vez?",
        options: [
          "Lo hago casi todos los días. Es parte de mi vida.",
          "Esta semana, una que otra vez.",
          "Hace un tiempo. Sé que debería, pero el esfuerzo parece demasiado grande.",
          "Ni recuerdo. Todo lo difícil y lento lo cambio por lo que da placer rápido.",
        ],
      },
    ],
    gate: {
      heading: "Tu resultado está listo.",
      body: "Antes de mostrarlo, déjame enviarte junto algo que vale más que el resultado: el adelanto de I Love Dopamina. No es un resumen — es un pedazo real del libro. Explica por qué tu cerebro llegó a donde llegó. Y qué hacer al respecto. Deja tu mejor correo. Recibes las dos cosas ahora: tu resultado + el adelanto en la bandeja de entrada.",
      placeholder: "tu@correo.com",
      cta: "Ver mi resultado + recibir el adelanto",
      hintLocked: "Responde las 8 preguntas para desbloquear el resultado.",
      emailNote: "Sin spam. Solo las ideas más importantes del libro, una a la vez. Sales cuando quieras.",
    },
    result: {
      scoreSuffix: "/24",
      guidePromise: "El adelanto de I Love Dopamina y tu resultado van camino a tu bandeja de entrada.",
    },
    disclaimer:
      "Este resultado es educativo y reflexivo — no es diagnóstico, informe ni evaluación clínica. “Dr. Libertad” es una persona editorial; el contenido no sustituye el acompañamiento profesional de la salud. Si el uso de pantallas, juegos u otras compulsiones está afectando tu trabajo, tu sueño o tus relaciones, busca a un profesional de la salud.",
  },

  bands: [
    {
      key: "verde",
      ...BAND_META.verde,
      name: "Todavía llevas el volante",
      verdict:
        "Tu sistema de recompensa te responde a ti — no al algoritmo. Tú usas la pantalla; ella no te usa a ti. Es más raro de lo que parece, y vale protegerlo. Pero nadie es inmune: el entorno fue diseñado para tirar de todos hacia abajo, un desliz a la vez. Saber cómo funciona la trampa es lo que te mantiene fuera de ella. Empieza por el adelanto — el capítulo del casino en tu bolsillo muestra el mecanismo exacto, para que lo reconozcas de lejos.",
    },
    {
      key: "amarelo",
      ...BAND_META.amarelo,
      name: "La cuenta empezó a llegar",
      verdict:
        "No estás secuestrado. Pero aparecieron algunas señales: el “solo un poco” que se estira, lo real que a veces parece demasiado lento, el vacío después del placer rápido. Eso no es falla de carácter — es tolerancia, la misma mecánica de cualquier adicción. Cuantos más picos rápidos, menos sensible se vuelve el cerebro a lo que es real. No es el mundo el que perdió la gracia: es tu regla de placer, calibrada en la tragamonedas. Se puede recalibrar. El adelanto explica cómo se instala — y el libro muestra el camino de vuelta.",
    },
    {
      key: "vermelho",
      ...BAND_META.vermelho,
      name: "El algoritmo está manejando — pero el auto aún es tuyo",
      verdict:
        "Honestidad: buena parte de tu día hoy la decide la pantalla, no tú. La mano agarra el celular antes de la decisión. Lo importante queda para después. Eso no te vuelve débil. Compites contra edificios llenos de gente con doctorado, cuyo trabajo es hacerte deslizar un poco más — conocen tu cerebro mejor que tú. Perder esa disputa es el resultado esperado de una pelea desigual que nadie te avisó que existía. La salida no es el “detox” que te vendieron — es recalibrar la sensibilidad, cambiando el entorno y el orden de las recompensas. El adelanto empieza ese camino. El libro trae el protocolo entero.",
    },
    {
      key: "critico",
      ...BAND_META.critico,
      name: "No es sobre la pantalla. Es sobre recuperar la llave.",
      verdict:
        "El resultado dice que casi toda tu búsqueda de placer hoy pasa por el estímulo rápido — y que lo real, lo lento, lo difícil, casi desapareció. Antes de todo: esto no es un informe, y no eres un caso perdido. Es un espejo de un momento. Lo que pasó tiene nombre, tiene ciencia, y no empezó por tu culpa: un cerebro expuesto a estímulo rápido todo el tiempo pierde la sensibilidad a lo que es real — es biología, no personalidad. Y la biología se recalibra, en el orden correcto, un paso a la vez. Empieza por el adelanto ahora — muestra por qué llegaste aquí, y que la salida existe (el libro trae el camino completo, los pasos en orden), sin volverte un ermitaño que tira el celular al río.",
    },
  ],
};

export const dopaminaContent: Record<Lang, DopaminaContent> = { br, es };

/** Faixa a partir da pontuação total (0..24). Pura — testável. */
export function faixaForScore(total: number, bands: Band[]): Band {
  const t = Math.max(0, Math.min(24, Math.round(total)));
  return bands.find((b) => t >= b.min && t <= b.max) ?? bands[bands.length - 1];
}
