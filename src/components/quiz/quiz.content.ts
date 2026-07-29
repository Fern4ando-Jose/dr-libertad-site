// Conteúdo do quiz "Que tamanho tem o seu inimigo?" — porta do funil "100 dias
// para a Liberdade". Fonte da voz aprovada (PT-BR): Curso-Anti-Vicio/Quiz-Nivel-
// Dependencia.md + a prévia-fiel aprovada (Provas/PREVIA-FIEL_Quiz-e-Guia_2026-07-05.html).
//
// ⚠️ ES = TRADUÇÃO do agente, ainda PENDENTE do OK de voz do dono (§1.13). A voz da
// @dr.liberdad tem tom próprio; validar antes de considerar "aprovado".
//
// A "faixa" (verde/amarelo/vermelho/critico) é a TAG de segmentação enviada ao Brevo
// (interna) — NÃO é exibida ao usuário como jargão de funil. O usuário vê só o
// veredito da própria faixa.

import type { Lang } from "@/lib/i18n/dictionaries";

export type Faixa = "verde" | "amarelo" | "vermelho" | "critico";

export interface Band {
  key: Faixa;
  min: number; // pontuação mínima da faixa (inclusiva)
  max: number; // pontuação máxima da faixa (inclusiva)
  emoji: string;
  color: string;
  name: string;
  verdict: string;
  means: string;
  /** Só a faixa crítica traz o encaminhamento profissional em destaque (§4 do Quiz.md). */
  referral?: string;
}

export interface QuizContent {
  metaTitle: string;
  kicker: string;
  titlePre: string; // "Que tamanho tem o seu"
  titleEm: string; // "inimigo?"
  subtitle: string;
  scrollHint: string;
  opening: string;
  questionsLabel: string;
  questions: { axis: string; text: string }[]; // 8
  options: { label: string; value: number }[]; // 4 (0..3)
  gate: {
    heading: string;
    body: string;
    placeholder: string;
    cta: string;
    hintLocked: string; // "Responda as 8 perguntas para liberar."
    emailNote: string; // privacidade curta sob o campo
  };
  result: {
    scoreSuffix: string; // "/24 pontos"
    meansLabel: string; // "Significa:"
    guidePromise: string; // linha do funil (o que chega no e-mail)
  };
  disclaimer: string;
  footer: string;
  bands: Band[];
}

const BAND_META: Record<Faixa, { min: number; max: number; emoji: string; color: string }> = {
  verde: { min: 0, max: 5, emoji: "🟢", color: "#5a9c6b" },
  amarelo: { min: 6, max: 12, emoji: "🟡", color: "#d8b53a" },
  vermelho: { min: 13, max: 18, emoji: "🟠", color: "#dd8a43" },
  critico: { min: 19, max: 24, emoji: "🔴", color: "#CE7266" },
};

const br: QuizContent = {
  metaTitle: "Teste: que tamanho tem o seu inimigo?",
  kicker: "100 dias para a Liberdade",
  titlePre: "Que tamanho tem o seu",
  titleEm: "inimigo?",
  subtitle: "8 perguntas. Um minuto. A verdade que você evita há anos.",
  scrollHint: "Role para começar",
  opening:
    "Você não vai ser julgado aqui. Ninguém está olhando. Mas você sabe — lá no fundo, você sabe — que perdeu a conta de quantas vezes prometeu que era a última. Este teste não te xinga e não te salva. Ele só mede. O primeiro passo para vencer um inimigo é parar de fingir que ele não existe.",
  questionsLabel: "As 8 perguntas",
  questions: [
    { axis: "Saliência", text: "Você pensa em pornografia (ou em quando vai poder ver) mesmo quando deveria estar fazendo outra coisa?" },
    { axis: "Perda de controle", text: "Você assiste por mais tempo do que pretendia, ou volta logo depois de ter dito “chega”?" },
    { axis: "Tentativa fracassada", text: "Você já tentou parar ou diminuir e não conseguiu manter?" },
    { axis: "Fuga", text: "Você recorre à pornografia para anestesiar tédio, estresse, solidão ou ansiedade?" },
    { axis: "Tolerância / escalada", text: "Você precisa de mais tempo, mais conteúdo ou conteúdo mais pesado para sentir o mesmo que antes?" },
    { axis: "Consequência", text: "O hábito já te custou sono, foco, dinheiro, tempo, ou atrapalhou sua vida sexual ou afetiva real?" },
    { axis: "Compulsão automática", text: "Você se pega já com o conteúdo aberto, quase sem decidir, no “piloto automático”?" },
    { axis: "Sofrimento", text: "Depois, você sente culpa, vergonha ou vazio — e mesmo assim repete?" },
  ],
  options: [
    { label: "Nunca", value: 0 },
    { label: "Às vezes", value: 1 },
    { label: "Frequentemente", value: 2 },
    { label: "Quase sempre", value: 3 },
  ],
  gate: {
    heading: "Quase lá.",
    body: "Deixe seu e-mail para receber o resultado + o primeiro dia do guia grátis.",
    placeholder: "seu@email.com",
    cta: "Ver meu resultado",
    hintLocked: "Responda as 8 perguntas para liberar.",
    emailNote: "Sem spam. Você pode sair da lista quando quiser.",
  },
  result: {
    scoreSuffix: "/24 pontos",
    meansLabel: "Significa:",
    guidePromise: "O primeiro dia do guia grátis de 100 dias chega no seu e-mail.",
  },
  disclaimer:
    "Este teste é uma ferramenta de autorreflexão, não um diagnóstico. “Vício em pornografia” é uma expressão popular; o quadro clínico relacionado (Transtorno do Comportamento Sexual Compulsivo) só pode ser avaliado por um profissional de saúde. Se você sente sofrimento intenso, pensamentos de se machucar, ou prejuízo grave na sua vida, procure um psicólogo ou psiquiatra. Pedir ajuda é de homem forte.",
  footer: "100 dias para a Liberdade · um projeto Dr. Liberdade",
  bands: [
    {
      key: "verde",
      ...BAND_META.verde,
      name: "O inimigo ainda é pequeno",
      verdict:
        "Você ainda manda. A pornografia entra na sua vida, mas não dá as ordens. Isso é uma vantagem — e vantagem se perde por descuido.",
      means: "Uso ocasional, sem sinais fortes de perda de controle.",
    },
    {
      key: "amarelo",
      ...BAND_META.amarelo,
      name: "Sinal amarelo",
      verdict:
        "Ainda não é o fundo do poço; é a ladeira. Você já mente pequenas mentiras para si mesmo — “só hoje”, “eu paro quando quiser”. Quem para quando quer não precisaria querer tanto.",
      means: "Uso problemático leve a moderado; gatilhos e fuga já aparecem.",
    },
    {
      key: "vermelho",
      ...BAND_META.vermelho,
      name: "Sinal vermelho",
      verdict:
        "Isso aqui não é mais um hábito — é uma coleira. Você já tentou parar e voltou. A boa notícia é dura: não é falta de caráter — é um automatismo que o hábito gravou fundo. A má notícia é que ninguém vai tirar a coleira por você.",
      means: "Padrão compulsivo instalado; tentativas fracassadas e consequências reais.",
    },
    {
      key: "critico",
      ...BAND_META.critico,
      name: "Guerra aberta",
      verdict:
        "Você não está lendo isto por acaso. Faz tempo que isso domina partes da sua vida que você nem admite. Escuta com respeito: o guia ajuda, mas talvez você precise de mais do que um guia.",
      means: "Sinais de uso severo, com sofrimento e prejuízo importantes.",
      referral:
        "Entra no guia grátis hoje — e considera procurar um psicólogo ou psiquiatra. Não é fraqueza; é estratégia.",
    },
  ],
};

const es: QuizContent = {
  metaTitle: "Test: ¿qué tamaño tiene tu enemigo?",
  kicker: "100 días para la Libertad",
  titlePre: "¿Qué tamaño tiene tu",
  titleEm: "enemigo?",
  subtitle: "8 preguntas. Un minuto. La verdad que evitas desde hace años.",
  scrollHint: "Desliza para empezar",
  opening:
    "No vas a ser juzgado aquí. Nadie está mirando. Pero lo sabes — en el fondo, lo sabes — que perdiste la cuenta de cuántas veces prometiste que era la última. Esta prueba no te insulta y no te salva. Solo mide. El primer paso para vencer a un enemigo es dejar de fingir que no existe.",
  questionsLabel: "Las 8 preguntas",
  questions: [
    { axis: "Saliencia", text: "¿Piensas en pornografía (o en cuándo vas a poder verla) incluso cuando deberías estar haciendo otra cosa?" },
    { axis: "Pérdida de control", text: "¿La ves durante más tiempo del que pretendías, o vuelves poco después de haber dicho “basta”?" },
    { axis: "Intento fallido", text: "¿Ya intentaste parar o reducir y no lograste mantenerlo?" },
    { axis: "Evasión", text: "¿Recurres a la pornografía para anestesiar el aburrimiento, el estrés, la soledad o la ansiedad?" },
    { axis: "Tolerancia / escalada", text: "¿Necesitas más tiempo, más contenido o contenido más fuerte para sentir lo mismo que antes?" },
    { axis: "Consecuencia", text: "¿El hábito ya te costó sueño, concentración, dinero, tiempo, o perjudicó tu vida sexual o afectiva real?" },
    { axis: "Compulsión automática", text: "¿Te descubres ya con el contenido abierto, casi sin decidirlo, en “piloto automático”?" },
    { axis: "Sufrimiento", text: "Después, ¿sientes culpa, vergüenza o vacío — y aun así lo repites?" },
  ],
  options: [
    { label: "Nunca", value: 0 },
    { label: "A veces", value: 1 },
    { label: "Con frecuencia", value: 2 },
    { label: "Casi siempre", value: 3 },
  ],
  gate: {
    heading: "Ya casi.",
    body: "Deja tu correo para recibir el resultado + el primer día de la guía gratis.",
    placeholder: "tu@correo.com",
    cta: "Ver mi resultado",
    hintLocked: "Responde las 8 preguntas para desbloquear.",
    emailNote: "Sin spam. Puedes salir de la lista cuando quieras.",
  },
  result: {
    scoreSuffix: "/24 puntos",
    meansLabel: "Significa:",
    guidePromise: "El primer día de la guía gratis de 100 días llega a tu correo.",
  },
  disclaimer:
    "Esta prueba es una herramienta de autorreflexión, no un diagnóstico. “Adicción a la pornografía” es una expresión popular; el cuadro clínico relacionado (Trastorno por Comportamiento Sexual Compulsivo) solo puede evaluarlo un profesional de salud. Si sientes sufrimiento intenso, pensamientos de hacerte daño, o un perjuicio grave en tu vida, busca a un psicólogo o psiquiatra. Pedir ayuda es de hombre fuerte.",
  footer: "100 días para la Libertad · un proyecto Dr. Libertad",
  bands: [
    {
      key: "verde",
      ...BAND_META.verde,
      name: "El enemigo aún es pequeño",
      verdict:
        "Todavía mandas tú. La pornografía entra en tu vida, pero no da las órdenes. Eso es una ventaja — y las ventajas se pierden por descuido.",
      means: "Uso ocasional, sin señales fuertes de pérdida de control.",
    },
    {
      key: "amarelo",
      ...BAND_META.amarelo,
      name: "Señal amarilla",
      verdict:
        "Todavía no es el fondo del pozo; es la cuesta. Ya te dices pequeñas mentiras — “solo hoy”, “paro cuando quiera”. Quien para cuando quiere no necesitaría quererlo tanto.",
      means: "Uso problemático leve a moderado; los detonantes y la evasión ya aparecen.",
    },
    {
      key: "vermelho",
      ...BAND_META.vermelho,
      name: "Señal roja",
      verdict:
        "Esto ya no es un hábito — es una correa. Ya intentaste parar y volviste. La buena noticia es dura: no es falta de carácter — es un automatismo que el hábito grabó hondo. La mala noticia es que nadie va a quitarte la correa por ti.",
      means: "Patrón compulsivo instalado; intentos fallidos y consecuencias reales.",
    },
    {
      key: "critico",
      ...BAND_META.critico,
      name: "Guerra abierta",
      verdict:
        "No estás leyendo esto por casualidad. Hace tiempo que esto domina partes de tu vida que ni admites. Escucha con respeto: la guía ayuda, pero quizá necesites algo más que una guía.",
      means: "Señales de uso severo, con sufrimiento y perjuicio importantes.",
      referral:
        "Entra hoy en la guía gratis — y considera buscar a un psicólogo o psiquiatra. No es debilidad; es estrategia.",
    },
  ],
};

export const quizContent: Record<Lang, QuizContent> = { pt, es };

/** Faixa a partir da pontuação total (0..24). Pura — testável. */
export function faixaForScore(total: number, bands: Band[]): Band {
  const t = Math.max(0, Math.min(24, Math.round(total)));
  return bands.find((b) => t >= b.min && t <= b.max) ?? bands[bands.length - 1];
}
