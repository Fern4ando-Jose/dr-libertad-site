import { NextRequest, NextResponse } from "next/server";
import { generateIllustration } from "@/lib/illustration";
import { Lang, accountFor, getLang } from "@/lib/accounts";
import { type Automation, checkBudget, logSpend, anthropicCost, EST_RUN_COST } from "@/lib/spend";
import { parseContentJson } from "@/lib/content-json";
import { dayBRT, reelSharedKey, hashStr, readReelShared, writeReelShared, selectFootage } from "@/lib/reel-shared";
import { readContentCache, writeContentCache } from "@/lib/content-cache";
import { recordRun, recentTopicsAllLangs, runAlreadyPublished, getOrSetRunTopic, topicUsedInOtherVaga, publishedId, bumpAttempt, isHardPublishBlock } from "@/lib/run-ledger";
import { buildRotation, topicIndexForRun, pickFreshTopicIndexThreaded } from "@/lib/rotation";
import { editionFor } from "@/lib/edition";
import { searchDuckDuckGo } from "@/lib/ddg";
import { buildLiteralDirective } from "@/lib/literal-lock";
import { scanContentForeign, summarizeHits } from "@/lib/lang-guard";

// Aumenta o limite de execução para 60s (Vercel Hobby permite até 300s)
export const maxDuration = 300;

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SearchResult { title: string; content: string; url: string }

interface GeneratedContent {
  postTitle: string;
  postBody: string;
  slides: string[];   // 2-3 insights para slides internos
  cta: string;        // pergunta para slide final
  instagramCaption: string;
  tags: string[];
  videoQueries?: string[]; // termos EN p/ buscar footage do Reel (opcional)
}

type Slot = "manha" | "tarde" | "noite";

// ─── Temas (rotação) — FONTE ÚNICA ────────────────────────────────────────────
// Cada tema reúne topic (chave/seed em ES) + cat (cor/direção, espelha CATS de
// /api/og) + motif (desenho, espelha MOTIF_IDS de /api/og) + subject (metáfora em
// inglês p/ a ilustração da fal). TOPICS e os 3 mapas são DERIVADOS daqui → é
// impossível dessincronizar (a regra "TOPIC_CAT espelha CATS/motifs" do CLAUDE.md
// vira invariante por construção). Linha editorial: ver CLAUDE.md "Linha editorial"
// — 5 pilares (dopamina · redes/relações · guerra invisível do homem · verdades
// incômodas · liberdade de expressão). Não temer a polêmica; provocar debate.
interface Theme { topic: string; cat: string; motif: string; subject: string; literal?: boolean }
const THEMES: Theme[] = [
  // ── Pilar 1 — Dopamina e seus seguimentos ──
  { topic: "Dopamina y recompensa inmediata", cat: "dopamine", motif: "burst", subject: "a brain with only a few glowing reward receptors lit by a single bright spark" },
  { topic: "Adicción a las redes sociales", cat: "dopamine", motif: "spiral", subject: "a hand reaching into an endless downward spiral emerging from a phone screen" },
  { topic: "La validación externa como droga", cat: "dopamine", motif: "ripple", subject: "glowing heart-shaped likes dangling as bait on fishhooks in a dark void, just out of reach, no people" },
  { topic: "El doomscrolling sin fin", cat: "anxiety", motif: "spiral", subject: "a figure sinking into a dark endless newsfeed river pouring out of a phone" },
  { topic: "La pornografía y el cerebro secuestrado", cat: "dopamine", motif: "decay", subject: "a male figure entangled in glowing screen-threads slowly draining his vitality" },
  { topic: "El placer fácil que mata el deseo real", cat: "dopamine", motif: "burst", subject: "fast bright sparks swirling around a figure while a distant warm fire fades" },
  { topic: "La hiperestimulación y la incapacidad de aburrirse", cat: "dopamine", motif: "orbit", subject: "an empty quiet chair in a still room while a swarm of glowing screens orbits frantically around it, no people" },
  { topic: "El reseteo de dopamina", cat: "mind", motif: "unplug", subject: "a single glowing cable unplugged and coiling away from a dark socket, calm light returning, no people" },
  { topic: "Gratificación instantánea vs esfuerzo real", cat: "self", motif: "descent", subject: "a figure choosing a short bright staircase over a long mountain path" },
  // ── Pilar 2 — Redes sociais, fim dos relacionamentos ──
  { topic: "Redes sociales y el fin de las relaciones", cat: "network", motif: "web", subject: "two empty pillows on a dark unmade bed split by a cold central gap, two phones lying face-up glowing on each side, no people, intimacy replaced by screens" },
  { topic: "La comparación que destruye parejas", cat: "network", motif: "bars", subject: "a couple each measuring the other against rows of glowing edited portraits" },
  { topic: "La intimidad reemplazada por la pantalla", cat: "network", motif: "isolation", subject: "a double bed divided down the middle by a tall pane of cold glowing screen-glass, one side warm and one side blue-lit, no people" },
  { topic: "El mercado de citas y el descarte infinito", cat: "network", motif: "spiral", subject: "an endless conveyor belt of identical glowing portrait cards tipping off the edge into a dark discard chute, no people" },
  { topic: "La soledad en la era hiperconectada", cat: "network", motif: "isolation", subject: "a tiny solitary figure in vast empty space surrounded by distant glowing screens" },
  { topic: "La pareja actuada para las redes", cat: "dopamine", motif: "ripple", subject: "a couple performing happiness in front of a wall of watching eyes" },
  { topic: "El ghosting y el vínculo desechable", cat: "network", motif: "web", subject: "a figure holding a thread that suddenly fades into nothing" },
  { topic: "La atención como nueva moneda del amor", cat: "network", motif: "ripple", subject: "a single glowing coin engraved with an eye, balanced on a dark scale, slowly drowning under a rising tide of notification dots, no people" },
  { topic: "El amor que no resiste el aburrimiento", cat: "network", motif: "orbit", subject: "two figures drifting apart the moment the spark of novelty fades" },
  // ── (extensão Pilar 2) Filtros, padrão de beleza inexistente e excesso de escolha ──
  { topic: "El filtro que te vendió una belleza que no existe", cat: "network", motif: "masks", subject: "a figure admiring a flawless filtered reflection in a phone while the plain real face behind the glass sits alone in shadow" },
  { topic: "Cientos de likes en la foto, nadie en la vida real", cat: "network", motif: "isolation", subject: "a glowing portrait surrounded by hundreds of floating like-hearts while the real person sits alone in a dark room" },
  { topic: "En la foto haces match; en la cita aparece otra persona", literal: true, cat: "network", motif: "masks", subject: "a polished filtered portrait on a phone beside the plain real face of the same person arriving at an empty restaurant table, mismatch, no flattery" },
  { topic: "Te enamoras de una edición y cenas con la realidad", literal: true, cat: "network", motif: "mirror", subject: "a figure embracing a glowing edited portrait that dissolves into an ordinary plain reflection in a mirror" },
  { topic: "La ilusión de opciones infinitas te deja solo", literal: true, cat: "network", motif: "spiral", subject: "a figure endlessly scrolling a spiral wall of identical portrait cards, unable to choose, alone in the dark" },
  { topic: "Pasas más tiempo eligiendo que viviendo", cat: "anxiety", motif: "orbit", subject: "an infinite shelf of identical glowing jars receding into the dark, a clock melting on the floor before it, nothing chosen, no people" },
  // ── Pilar 3 — A guerra invisível do Homem (temas incômodos) ──
  { topic: "La guerra invisible del hombre", cat: "freedom", motif: "descent", subject: "a heavy iron yoke and tangled invisible chains resting on a worn uphill path at dusk, no people" },
  { topic: "El hombre al que no se le permite llorar", cat: "self", motif: "masks", subject: "a male figure pressing a stone mask over a face about to break" },
  { topic: "La soledad masculina que nadie ve", cat: "network", motif: "isolation", subject: "a man in a crowd enclosed by an invisible glass wall" },
  { topic: "El vacío del proveedor", cat: "self", motif: "decay", subject: "a male figure as a burning candle giving light to others while melting unseen" },
  { topic: "La fuerza mal entendida", cat: "freedom", motif: "boundary", subject: "a male figure mistaking a rigid iron armor for real strength" },
  { topic: "El padre ausente dentro de ti", cat: "self", motif: "mirror", subject: "a grown figure facing the faded silhouette of an absent father" },
  { topic: "La rabia que esconde tristeza", cat: "anxiety", motif: "decay", subject: "a figure whose angry shadow hides a small grieving child" },
  { topic: "El hombre tratado como desechable", cat: "freedom", motif: "descent", subject: "a worn stepping-stone shaped like a discarded medal, muddy footprints passing it by toward the light, no people" },
  { topic: "Reconstruir al hombre, no destruirlo", cat: "mind", motif: "synapse", subject: "a cracked male statue regrowing with golden kintsugi veins" },
  // ── Pilar 4 — Verdades incômodas que precisam ser ditas ──
  { topic: "El hombre no necesita ser amado: necesita cariño, respeto y admiración", literal: true, cat: "self", motif: "embrace", subject: "a tall sturdy oak bathed in warm respectful light, standing apart from grasping clinging ivy that recedes into shadow, no people" },
  { topic: "Nadie te debe nada", literal: true, cat: "freedom", motif: "boundary", subject: "cut debt-ropes and an empty open ledger dissolving into warm light on a bare wooden table, no people" },
  { topic: "Si no pones límites, te vuelves una opción", literal: true, cat: "self", motif: "boundary", subject: "one solid firmly crossed-out checkbox standing apart amid an endless grid of identical selectable boxes, no people" },
  { topic: "La comodidad te está matando lentamente", literal: true, cat: "anxiety", motif: "decay", subject: "a figure sinking comfortably into a soft chair that slowly swallows it" },
  { topic: "Te respetan por lo que toleras, no por lo que dices", literal: true, cat: "freedom", motif: "mirror", subject: "a figure whose spoken words fade while the firm line it draws glows" },
  { topic: "El victimismo es una cárcel cómoda", literal: true, cat: "anxiety", motif: "spiral", subject: "a figure locking its own cage from the inside and pocketing the key" },
  { topic: "Nadie va a venir a salvarte", literal: true, cat: "self", motif: "descent", subject: "a figure at the bottom of a well building its own ladder" },
  { topic: "Tu potencial no vale nada sin acción", literal: true, cat: "dopamine", motif: "burst", subject: "a bright seed rotting unplanted while a figure only admires it" },
  { topic: "La verdad incomoda más que la mentira amable", literal: true, cat: "freedom", motif: "mirror", subject: "a figure choosing a sharp clear mirror over a flattering blurred one" },
  // ── Pilar 5 — Liberdade (e o direito de falar) ──
  { topic: "Tú tienes derecho a hacer lo que quieras; yo a decir lo que pienso", literal: true, cat: "freedom", motif: "gateway", subject: "two figures standing in opposite open doorways, each free, a line of mutual respect between them" },
  { topic: "La libertad de expresión incómoda", cat: "freedom", motif: "gateway", subject: "a figure speaking through an open arch while soft hands try to push it closed" },
  { topic: "El miedo a la opinión ajena", cat: "anxiety", motif: "mirror", subject: "a figure shrinking before a wall of judging eyes, then rising tall" },
  { topic: "La cultura de la ofensa", cat: "freedom", motif: "squares", subject: "fragile glass figures shattering at every spoken word" },
  { topic: "Pensar diferente no es un crimen", literal: true, cat: "freedom", motif: "branches", subject: "a single tree branching the opposite way from a uniform forest" },
  { topic: "La libertad empieza donde acaba el miedo", literal: true, cat: "freedom", motif: "gateway", subject: "an open birdcage door swinging free, a single feather drifting out toward warm light, no people" },
  { topic: "Decir 'no' es un acto de libertad", literal: true, cat: "self", motif: "boundary", subject: "a single upright closed door standing calm against a swirling storm of paper demands that breaks around it, no people" },
  { topic: "La autocensura silenciosa", cat: "anxiety", motif: "masks", subject: "a sculptural human head in profile, a line of fine grey stitches sealing shut where the mouth would be, deep shadow, no hands" },
  { topic: "Ser libre incomoda a quien quiere controlarte", literal: true, cat: "freedom", motif: "branches", subject: "a fallen marionette control-cross, its strings cut and slack, abandoned in shadow as warm light breaks in, no people" },
  // ── Cânone — convicções das obras de referência (Linha editorial) ──
  { topic: "Volar más alto no es traición: es lealtad a lo que eres", literal: true, cat: "self", motif: "branches", subject: "a lone seagull soaring high into open sky, breaking upward away from a low grey flock hugging the ground, no people" },
  { topic: "Lo esencial es invisible a los ojos", literal: true, cat: "mind", motif: "iris", subject: "a figure with closed eyes before a dazzling empty surface, a faint warm rose of light glowing only in the dark behind the eyelids, no text" },
  { topic: "La servidumbre que más cuesta romper es la que eliges tú mismo", literal: true, cat: "freedom", motif: "boundary", subject: "a seated figure holding its own heavy chain, the open padlock resting in its palm and the cage door already ajar, no captor present" },
  { topic: "La felicidad solo es real cuando se comparte", literal: true, cat: "network", motif: "ripple", subject: "two figures sharing a single small warm fire in a vast cold wilderness, the firelight rippling outward in warm rings, no screens" },
  { topic: "Prefiero morir de pie a vivir de rodillas", literal: true, cat: "freedom", motif: "descent", subject: "a lone figure standing tall and unbowed at the crest of a grey hill as a vast shadow presses down, refusing to kneel, no people around" },
  // ── §4 Verdades incômodas (literais) — adições da Linha editorial ──
  { topic: "El filtro no corrige tu piel: corrige tu expectativa", literal: true, cat: "network", motif: "masks", subject: "a figure admiring a flawless filtered reflection in a phone while the plain real face behind the glass waits unseen, the gap between the promise and the skin" },
  { topic: "Nunca cambies lo que eres por nadie", literal: true, cat: "self", motif: "mirror", subject: "a single true sculpted form keeping its shape in a mirror while a ring of identical empty molds around it crack and crumble, no people" },
  { topic: "Solo cambias cuando tú quieres — y duele", literal: true, cat: "self", motif: "descent", subject: "a figure carving a faint path through thick dark brush by sheer will, the trail appearing only from passing again and again, effort before ease" },
  { topic: "La mujer elige con quién acostarse; el hombre, con quién casarse", literal: true, cat: "self", motif: "boundary", subject: "two diverging paths from a single crossroads — one a brief bright spark, the other a long steady flame — weighed in silence, symbolic, no people" },
  { topic: "El hombre puede ser feliz con cualquier mujer, mientras no la ame", literal: true, cat: "self", motif: "embrace", subject: "a serene figure holding a small calm flame at arm's length untroubled, while the same flame pressed to the chest scorches — detachment versus attachment, symbolic, no people" },
];

const TOPICS = THEMES.map((t) => t.topic);
const TOPIC_CAT: Record<string, string> = Object.fromEntries(THEMES.map((t) => [t.topic, t.cat]));
const TOPIC_MOTIF: Record<string, string> = Object.fromEntries(THEMES.map((t) => [t.topic, t.motif]));
const TOPIC_SUBJECT: Record<string, string> = Object.fromEntries(THEMES.map((t) => [t.topic, t.subject]));
// Temas-convicção (frase-verdade do dono): título/slide preservam a frase, NUNCA viram
// "libertad". Derivado do flag `literal` (fonte única THEMES). Trava em src/lib/literal-lock.ts.
const TOPIC_LITERAL: Record<string, boolean> = Object.fromEntries(THEMES.filter((t) => t.literal).map((t) => [t.topic, true]));

// ─── Extrai keyword curta do tópico ──────────────────────────────────────────

function extractKeyword(topic: string): string {
  const STOP = new Set(["y","e","o","de","del","la","el","los","las","a","en","con","por","un","una","sus","su","al","se","lo"]);
  const word = topic.split(/\s+/).find(w => !STOP.has(w.toLowerCase())) ?? topic.split(" ")[0];
  return word.toUpperCase().replace(/[^A-ZÁÉÍÓÚÜÑ]/g, "");
}

// runIndex 0..5 → um dos 6 horários do dia. Garante 6 tópicos DISTINTOS por dia
// (o esquema antigo, por dia-da-semana+slot, repetia o tópico nos 2 crons do mesmo
//  slot e o 2º era barrado pela checagem de duplicata → só 3 posts/dia de fato).
// Rotação determinística SEM repetição (cada tema 1× por ciclo de N posts ≈ 8,5
// dias > trava anti-dup de 7d) e com categorias INTERCALADAS. Substitui o
// reembaralho semanal antigo, que fazia o mesmo tema voltar em 1–3 dias e a
// anti-dup bloquear o post. Lógica em src/lib/rotation.ts (com teste invariante).
const ROTATION = buildRotation(THEMES.map((t) => t.cat));
function getTopicForRun(date: Date, runIndex: number): string {
  return TOPICS[topicIndexForRun(ROTATION, date, runIndex)];
}

// tópico → índice no array original (p/ a trava anti-dup mapear recentes p/ índices).
const TOPIC_INDEX = new Map(TOPICS.map((t, i) => [t, i] as const));

// Tópico do (data, run) com TRAVA ANTI-DUP CROSS-FORMATO: pula os temas já
// publicados na conta nos últimos 7d em QUALQUER formato (reel ∪ carrossel).
// É a trava REAL — robusta a mudanças de rotação e a repetição reel↔carrossel
// (o bug em que "padre ausente" saiu Reel num dia e carrossel no outro). A
// rotação determinística sozinha não bastava: trocar o algoritmo (ou o reel não
// gravar tópico) reintroduzia repetições. Fail-open: erro de banco → tema-base.
async function getFreshTopicForRun(date: Date, runIndex: number, _lang: Lang): Promise<string> {
  try {
    // `recent` INCLUI hoje → impede repetir o MESMO tema no dia entre formatos/runs/idiomas
    // (era o bug: reel de manhã + carrossel à tarde com o mesmo tema). O descasamento ES/PT
    // (mesmo vídeo) é resolvido pelo LIVRO-RAZÃO (dia,run)→tema — NÃO tirando hoje do recent.
    const recent = await recentTopicsAllLangs(7);
    const recentIdx = new Set<number>();
    for (const t of recent) {
      const i = TOPIC_INDEX.get(t);
      if (i !== undefined) recentIdx.add(i);
    }
    const candidate = TOPICS[pickFreshTopicIndexThreaded(ROTATION, date, runIndex, recentIdx)];
    // Livro-razão: 1º idioma grava (dia,run)→tema; 2º LÊ o mesmo → ES e PT no MESMO vídeo.
    // Fail-open dentro de getOrSetRunTopic → devolve `candidate` (que já não repete).
    return await getOrSetRunTopic(dayBRT(date), runIndex, candidate);
  } catch {
    return getTopicForRun(date, runIndex);
  }
}

// Tom editorial derivado do horário (3 slots), independente do tópico.
const SLOT_FOR_RUN: Slot[] = ["manha", "tarde", "noite", "manha", "tarde", "noite"];

// ─── Instruções por slot ──────────────────────────────────────────────────────

const SLOT_INSTRUCTIONS: Record<Slot, string> = {
  manha: "Ángulo MAÑANA: reflexivo e inspirador. Invita al lector a empezar el día con mayor consciencia. Tono suave y profundo.",
  tarde: "Ángulo TARDE: práctico e informativo. Explica mecanismos, datos o consejos concretos. Tono directo y útil.",
  noite: "Ángulo NOCHE: provocador y de alto engagement. Termina con una pregunta o insight que genere debate. Tono audaz.",
};

// ─── Pesquisa de contexto (GRÁTIS) — DuckDuckGo (web inteira) + Wikipedia (reserva) ─
// Contexto factual de apoio pro prompt; não precisa ser fresco (temas perenes).
// PRIMÁRIA: DuckDuckGo (web inteira, sem chave, sem cartão — src/lib/ddg.ts).
// RESERVA: Wikipedia (enciclopédica) quando o DDG vier vazio/bloqueado. O DDG
// estrangula IP de datacenter (202/403) → a queda pra Wikipedia tende a ser comum
// em prod; por isso o log diz a FONTE (pra medir no teste de uns dias). Espanhol
// (es) porque a pesquisa é COMPARTILHADA ES/PT (conteúdo regenerado por mercado,
// não traduzido). FAIL-OPEN total: erro/zero → [] e a geração segue SEM contexto.
// Histórico: Tavily (paga) aposentada 23/06; Brave virou pago e Google fechou a API
// JSON p/ clientes novos → DDG é a única busca grátis de web inteira (decisão 23/06).
const WIKI_UA = "DrLibertadBot/1.0 (https://www.drlibertad.com; research)";

async function searchTopic(topic: string, _automation: Automation): Promise<SearchResult[]> {
  // 1º DuckDuckGo (web inteira); se vazio/bloqueado, Wikipedia (reserva). Ambos fail-open.
  const ddg = await searchDuckDuckGo(topic);
  if (ddg.length > 0) {
    console.log(`[search] fonte=ddg n=${ddg.length} topic="${topic}"`);
    return ddg;
  }
  const wiki = await searchWikipedia(topic);
  console.log(`[search] fonte=wikipedia(reserva) n=${wiki.length} topic="${topic}"`);
  return wiki;
}

async function searchWikipedia(topic: string): Promise<SearchResult[]> {
  try {
    // Viés leve pro domínio — melhora a relevância de temas-frase
    // (ex.: "El padre ausente" → Rollo May/Idealización em vez de um filme).
    const searchUrl = `https://es.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(topic + " psicología")}&limit=3`;
    const sres = await fetch(searchUrl, { headers: { "User-Agent": WIKI_UA } });
    if (!sres.ok) return [];
    const sdata = await sres.json();
    const pages: any[] = (sdata.pages ?? []).slice(0, 3);
    const summaries = await Promise.all(
      pages.map(async (p): Promise<SearchResult | null> => {
        const key = p.key ?? p.title;
        if (!key) return null;
        try {
          const r = await fetch(
            `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(key)}`,
            { headers: { "User-Agent": WIKI_UA } },
          );
          if (!r.ok) return null;
          const d = await r.json();
          if (!d.extract) return null;
          return { title: d.title ?? p.title ?? "", content: d.extract, url: d.content_urls?.desktop?.page ?? "" };
        } catch { return null; }
      }),
    );
    return summaries.filter((s): s is SearchResult => s !== null);
  } catch {
    return []; // fail-open: gera sem contexto
  }
}

// ─── Geração de conteúdo via Claude ──────────────────────────────────────────

async function generateContent(
  topic: string,
  searchResults: SearchResult[],
  slot: Slot,
  lang: Lang = "es",
  automation: Automation
): Promise<GeneratedContent> {
  const acc = accountFor(lang);
  const L = acc.langName; // "español" | "português do Brasil"
  const context = searchResults.map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`).join("\n\n");
  // Trava anti-amenização: em tema-convicção, o título preserva a frase-verdade (não vira "libertad").
  const literalDirective = buildLiteralDirective(!!TOPIC_LITERAL[topic], acc.freedom);

  const marketSection = acc.marketBrief
    ? `\nMERCADO / VOZ NATIVA — LEIA ANTES DE TUDO (vale mais que qualquer exemplo abaixo):\n${acc.marketBrief}\n`
    : "";

  const prompt = `Eres el editor de ${acc.brand}, estudio editorial sobre psicología, atención y ${acc.freedom} mental.

IMPORTANTE — IDIOMA: genera ABSOLUTAMENTE TODA la salida (postTitle, postBody, slides, cta, instagramCaption, tags/hashtags) en ${L}. NO mezcles idiomas — ni una sola palabra del otro idioma, INCLUIDAS LAS HASHTAGS (ej. en portugués es "livre", NUNCA "libre"; "encontro", NUNCA "cita"). El "Tema" de abajo está escrito en ESPAÑOL como semilla interna: PROHIBIDO copiarlo literal — el postTitle y el PRIMER slide deben estar 100% REESCRITOS en ${L}, nunca el enunciado del Tema palabra por palabra. (videoQueries es la ÚNICA excepción: va en inglés.)
${marketSection}
Tema: "${topic}"
${SLOT_INSTRUCTIONS[slot]}
${literalDirective}
REGLA DE MARCA (${acc.brand}): aborda CUALQUIER tema desde el ángulo de la ${acc.freedom.toUpperCase()} mental — recuperar el control, la atención y la autonomía frente a lo que nos esclaviza (algoritmos, validación, miedo, hábitos). El título y al menos uno de los insights deben conectar explícitamente con esa idea de ${acc.freedom}/liberación (EXCEPCIÓN: en un TEMA-CONVICCIÓN, esa conexión va en un insight, NUNCA en el título — el título preserva la frase). Nada de psicología genérica: siempre remite a la marca.

VOZ EDITORIAL: directa, valiente y sin miedo a la POLÉMICA — la polémica es la herramienta, no el accidente; es lo que genera alcance y debate. Dice VERDADES INCÓMODAS de forma LITERAL: nunca las suavices, relativices ni "equilibres" para hacerlas cómodas — la fuerza de la frase ES el producto. Desafía lo políticamente correcto y defiende la libertad de expresión y el derecho a pensar distinto ("tú tienes derecho a hacer lo que quieras; yo a decir lo que pienso").

ALMA de la marca (impregna el TONO; no la cites literalmente): hombría — fuerza, coraje y responsabilidad, y la capacidad de amar sin anularse; rechazo a la servidumbre voluntaria y al hombre pasivo que entrega su libertad; determinación de ir hasta las últimas consecuencias por un sueño; y un sentido de la vida que solo se completa en lo compartido (nadie nació para vivir solo). Cuando el tema lo permita, mira con ojo crítico la era de las pantallas: filtros y apps venden un estándar de belleza inexistente y una ilusión de opciones infinitas que dejan a la gente más sola, no más libre.

PERO la provocación viene de la IDEA, nunca del odio: atacas la idea, el sistema o el comportamiento — JAMÁS a la persona. Nunca insultes ni deshumanices a personas o grupos (por sexo, raza, orientación, etc.) ni incites violencia — eso hunde la cuenta. Incomoda con argumentos, no con desprecio.

NUNCA DIRÍA (filtro anti-IA-genérica — si la frase huele a esto, reescríbela):
- PROHIBIDO el registro coach/espiritual/corporativo: "resignificar", "empoderar", "sal de tu zona de confort", "el universo conspira", "permítete", "mindset", "fluir", "abundancia", "manifestar", "amor propio", "propósito", "buena vibra", "pensar fuera de la caja". Una palabra entra solo si carga sentido CONCRETO; si es adorno reflejo, fuera.
- NADA de pedir permiso por la idea ("no quiero ofender, pero…") ni moralina tibia ni cierre de autoayuda.
- NO sonar gurú/mesías ni reclutar "seguidores/fieles": la meta es hacer PENSAR, no crear discípulos.
- NO encajar una obra/autor/cita en cada idea (suena derivativo): referencia leve, solo cuando aporta de verdad.

MECÁNICA (que suene a él, no a IA): antítesis de punto y coma (dos mitades que giran en el pivote); veredicto corto y seco; segunda persona directa ("tú/te"); reversión (desmontar la promesa del sistema); concreto siempre (filtro, match, scroll, edición×realidad); termina en el hueso (la última palabra es la que queda).

MOTOR DE ALCANCE (reglas basadas en datos reales del perfil — lo que más empuja el algoritmo es RETENCIÓN + GUARDADOS + COMPARTIDOS, hoy casi en cero):
- GANCHO: el título y el PRIMER insight deben detener el scroll en 1-2 segundos. Háblale a "tú", abre una brecha de curiosidad o da un giro inesperado. Concreto y específico, nunca abstracto ni genérico (ej. "Revisas el móvil 144 veces al día" > "El uso del móvil es alto").
- GUARDABLE: al menos UN insight debe ser un reencuadre o micro-método accionable que la persona quiera GUARDAR para releer (algo aplicable, no solo bonito).
- COMPARTIBLE: el cta debe invitar a comentar Y a etiquetar/compartir con alguien ("¿Conoces a alguien que…?", "Etiqueta a quien…"), porque etiquetar = compartir.
- SEGUIDORES (objetivo PRINCIPAL): mucha gente que ve esto AÚN NO te sigue. La leyenda debe cerrar SIEMPRE, antes de los hashtags, con un CTA explícito a SEGUIR a ${acc.handle} dándole una RAZÓN con la voz de la marca — provocadora, nunca genérica ("Sígueme si prefieres la verdad incómoda al aplauso fácil" SÍ; "Síguenos para más consejos" NO) — además del CTA de guardar (🔖) y compartir (📩).

Contexto investigado:
${context}

Genera un JSON válido (sin markdown, sin backticks) con esta estructura EXACTA:
{
  "postTitle": "GANCHO que detiene el scroll, máx 55 chars, concreto y dirigido a 'tú', en ${L}",
  "postBody": "artículo en markdown mín 300 palabras, TODO EN ${L}",
  "slides": [
    "insight 1 — GANCHO contundente de MÁXIMO 80 chars que abre una brecha de curiosidad",
    "insight 2 — frase contundente de MÁXIMO 80 chars que profundiza",
    "insight 3 — reencuadre o micro-método GUARDABLE de MÁXIMO 80 chars que remata"
  ],
  "cta": "pregunta de 60-100 chars que invite a comentar y a etiquetar/compartir con alguien, en ${L}",
  "instagramCaption": "leyenda IG máx 2200 chars: gancho fuerte en la 1ª línea + desarrollo + cierre con CTA de SEGUIR a ${acc.handle} (con razón provocadora de marca) + guardar (🔖) + compartir (📩) + 4-5 hashtags, en ${L}",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "videoQueries": [
    "término de búsqueda EN INGLÉS para video de stock que represente VISUALMENTE la escena/emoción de ESTE post — concreto y filmable (personas, gestos, objetos, lugares), NO metáfora abstracta. Ej: 'person scrolling phone in bed at night'",
    "segundo término distinto EN INGLÉS, mismo criterio. Ej: 'tired woman staring at glowing screen'",
    "tercer término distinto EN INGLÉS, mismo criterio. Ej: 'hands holding smartphone dark room'"
  ]
}

Para "videoQueries": 3 frases EN INGLÉS, 3-6 palabras, escenas REALES y filmables (no ilustraciones ni metáforas). Deben poder encontrarse en un banco de video como Pexels y conectar con el tema del post.`;

  // O haiku ocasionalmente devolve JSON malformado OU deixa o outro idioma vazar
  // (clássico: copia a frase do Tema, que é ES, como 1º slide). Tentamos 3×: extrai
  // o objeto (parseContentJson) e roda a TRAVA DE PUREZA DE IDIOMA (lang-guard). Se
  // o parse falhar OU o conteúdo vier contaminado, regenera — na contaminação, com
  // uma NOTA listando as palavras achadas. Esgotou sem ficar limpo → BLOQUEIA (não
  // publica post com mescla de idioma; o catchup tenta de novo depois). "BR é BR; ES é ES".
  const MAX_CONTENT_TRIES = 3;
  let lastErr: unknown;
  let contaminationNote = "";
  for (let attempt = 1; attempt <= MAX_CONTENT_TRIES; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt + contaminationNote }],
      }),
    });

    if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
    const data = await res.json();
    await logSpend({ automation, platform: "anthropic", operation: "content", model: "claude-haiku-4-5-20251001", units: (data?.usage?.input_tokens ?? 0) + (data?.usage?.output_tokens ?? 0), costUsd: anthropicCost("claude-haiku-4-5-20251001", data?.usage) });
    const raw = data.content?.[0]?.text ?? "";
    let content: GeneratedContent;
    try {
      content = parseContentJson<GeneratedContent>(raw);
    } catch (e) {
      lastErr = e; // JSON malformado → regenera na próxima volta
      continue;
    }
    // Trava de pureza: nenhuma palavra do outro idioma nos campos que vão pro feed/Reel.
    const hits = scanContentForeign(content, lang);
    if (hits.length === 0) return content;
    lastErr = new Error(`idioma contaminado (${lang}): ${summarizeHits(hits)}`);
    contaminationNote = `\n\n⚠️ CORRECCIÓN OBLIGATORIA: tu respuesta anterior dejó palabras del OTRO idioma (debe ser 100% ${L}). Palabras detectadas → ${summarizeHits(hits)}. Reescribe TODO el contenido en ${L}, sin copiar el enunciado del Tema; revisa también las hashtags.`;
  }
  throw new Error(`generateContent: conteúdo não-publicável após ${MAX_CONTENT_TRIES} tentativas: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
}

// ─── Token do Instagram ───────────────────────────────────────────────────────

async function getAccessToken(lang: Lang = "es"): Promise<string> {
  const acc = accountFor(lang);
  // ES: token no config do DB (refresh automático) → env. PT: só env.
  if (acc.dbTokenKey) {
    try {
      const { sql } = await import("@vercel/postgres");
      const rows = await sql`SELECT value FROM config WHERE key = ${acc.dbTokenKey}`;
      if (rows.rows[0]?.value) return rows.rows[0].value;
    } catch { /* fallback */ }
  }
  return process.env[acc.tokenEnv] ?? "";
}

// ─── Publicação como carrossel ────────────────────────────────────────────────

async function publishCarousel(
  caption: string,
  imageUrls: string[],
  lang: Lang = "es",
): Promise<string> {
  const acc = accountFor(lang);
  const accountId = process.env[acc.accountIdEnv] ?? "";
  const token     = await getAccessToken(lang);
  const base      = `https://graph.instagram.com/v25.0/${accountId}`;

  // 1. Criar container para cada slide
  const childIds: string[] = [];
  for (const url of imageUrls) {
    const r = await fetch(`${base}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: token }),
    });
    if (!r.ok) throw new Error(`Carousel child error: ${await r.text()}`);
    const { id } = await r.json();
    childIds.push(id);
    await new Promise(res => setTimeout(res, 800)); // pausa entre criações
  }

  // 2. Criar container do carrossel
  const carRes = await fetch(`${base}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption,
      access_token: token,
    }),
  });
  if (!carRes.ok) throw new Error(`Carousel container error: ${await carRes.text()}`);
  const { id: carId } = await carRes.json();

  // 3. Aguardar processamento
  await new Promise(res => setTimeout(res, 3000));

  // 4. Publicar
  const pubRes = await fetch(`${base}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: carId, access_token: token }),
  });
  if (!pubRes.ok) throw new Error(`Carousel publish error: ${await pubRes.text()}`);
  // Publicação CONFIRMADA (200). Se a resposta vier sem `id`, o post está vivo mesmo
  // assim → devolve o creation_id como sentinela não-nula p/ a vaga ser GRAVADA no
  // livro-razão (senão vira "post-fantasma" e o watchdog redispara → tema duplicado).
  const pubJson = await pubRes.json().catch(() => ({} as { id?: string }));
  return publishedId(pubJson?.id, carId);
}

// ─── Salvar no banco ──────────────────────────────────────────────────────────

async function savePost(params: {
  topic: string; slot: Slot; title: string; body: string;
  instagramCaption: string; tags: string[];
  instagramPostId: string | null; publishedAt: Date; lang: Lang;
}): Promise<void> {
  const { sql } = await import("@vercel/postgres");
  await sql`
    INSERT INTO posts (
      topic, slot, title, content, body, instagram_caption,
      tags, instagram_post_id, published_at, lang
    ) VALUES (
      ${params.topic}, ${params.slot}, ${params.title},
      ${params.body}, ${params.body}, ${params.instagramCaption},
      ${"{" + params.tags.join(",") + "}"},
      ${params.instagramPostId}, ${params.publishedAt.toISOString()}, ${params.lang}
    )
  `;
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const slotParam = sp.get("slot") as Slot | null;
  const runParam = sp.get("run");
  const topicOverride = sp.get("topic");
  const force = sp.get("force") === "1"; // ignora a trava anti-duplicata de 24h (re-publicação/backfill manual)
  const lang = getLang(sp.get("lang")); // "es" (default, conta atual) | "pt"

  // Quais "runs" (0..5) processar nesta chamada:
  // • ?run=N  → exatamente esse horário (caminho do cron, 1 post distinto por horário)
  // • ?slot=  → um horário representativo daquele slot (1 post)
  // • vazio   → os 3 slots base (compatível com o disparo manual antigo)
  let runs: number[];
  if (runParam !== null && /^[0-5]$/.test(runParam)) {
    runs = [parseInt(runParam, 10)];
  } else if (slotParam && ["manha", "tarde", "noite"].includes(slotParam)) {
    runs = [{ manha: 0, tarde: 1, noite: 2 }[slotParam]];
  } else {
    runs = [0, 1, 2];
  }

  // Diagnóstico: roda só a geração da fal e devolve o resultado SEM publicar.
  if (sp.get("dryrun") === "1") {
    const r = runs[0];
    const topic = topicOverride ?? getTopicForRun(new Date(), r);
    const cat = TOPIC_CAT[topic] ?? "freedom";
    const subject = TOPIC_SUBJECT[topic] ?? "";
    // Teto: testes manuais entram no orçamento "manual" (evita o pico de dev).
    const gate = await checkBudget("manual", EST_RUN_COST.dryrun);
    if (!gate.ok) {
      return NextResponse.json({ blocked: true, automation: "manual", reason: `Orçamento diário estourado (gasto US$${gate.spent.toFixed(3)} + est US$${gate.est.toFixed(3)} > teto US$${gate.budget.toFixed(2)})`, gate }, { status: 402 });
    }
    // Testa a geração da ilustração SEM publicar (útil p/ validar a fal/FAL_KEY).
    // Diagnóstico: 1 tentativa só, e reusa o cache do dia (não paga em reruns).
    // ?fresh=1 força uma geração real na fal (quando o objetivo é mesmo testar a fal).
    const fresh = sp.get("fresh") === "1";
    const ill = await generateIllustration(subject, cat, { maxTries: 1, useCache: !fresh, automation: "manual" });
    return NextResponse.json({ dryrun: true, run: r, topic, cat, subject, illustration: ill, falKeyPresent: !!process.env.FAL_KEY });
  }

  // Prévia: gera o conteúdo do dia (e a ilustração da capa) e devolve SEM publicar.
  // Usado pelo pipeline de Reels — o vídeo é renderizado a partir deste mesmo
  // conteúdo, com a ilustração da fal como fundo da capa.
  if (sp.get("preview") === "1") {
    const r = runs[0];
    const slot = SLOT_FOR_RUN[r];
    const now = new Date();
    const topic = topicOverride ?? await getFreshTopicForRun(now, r, lang);
    const cat = TOPIC_CAT[topic] ?? "freedom";

    // Teto: o preview é o pipeline do Reel diário.
    const gate = await checkBudget("ig-reels", EST_RUN_COST.preview);
    if (!gate.ok) {
      return NextResponse.json({ blocked: true, automation: "ig-reels", reason: `Orçamento diário estourado (gasto US$${gate.spent.toFixed(3)} + est US$${gate.est.toFixed(3)} > teto US$${gate.budget.toFixed(2)})`, gate }, { status: 402 });
    }

    // Base LÍNGUA-INDEPENDENTE compartilhada entre ES e PT (= MESMO vídeo): a
    // pesquisa (Wikipedia) e o footage (Pexels) são resolvidos UMA vez por (tópico,
    // dia) e cacheados; o 2º idioma reusa tudo. Só a COPY muda por idioma.
    const day = dayBRT();
    const shared = await readReelShared(topic, day);

    // Pesquisa: reusa a do cache ou busca agora (Wikipedia, grátis e fail-open).
    const searchResults = shared?.research?.length ? shared.research : await searchTopic(topic, "ig-reels");
    // Copy: reusa o cache por (tópico, dia, idioma) → redisparo NÃO repaga a Anthropic.
    let content = (await readContentCache(topic, day, lang)) as GeneratedContent | null;
    if (!content) {
      content = await generateContent(topic, searchResults, slot, lang, "ig-reels");
      await writeContentCache(topic, day, lang, content);
    }

    // videoQueries CANÔNICOS (inglês, língua-independente): do cache (1º idioma)
    // ou os recém-gerados. Garantem o mesmo footage entre os idiomas.
    const videoQueries = shared?.videoQueries?.length
      ? shared.videoQueries
      : (Array.isArray(content.videoQueries) ? content.videoQueries : []);

    // Footage: reusa os clipes do cache (vídeo IDÊNTICO ES/PT) ou seleciona agora
    // com seed de (tópico,dia) — independente de conta. Só cacheia quando há clipes.
    let clips: string[] = shared?.clips ?? [];
    if (!clips.length) {
      clips = await selectFootage(videoQueries, cat, hashStr(reelSharedKey(topic, day)));
      if (clips.length) await writeReelShared(topic, day, { research: searchResults, videoQueries, clips });
    }

    // Número de edição: por VAGA (dia, run), o MESMO p/ ES e PT (mesmo conteúdo
    // traduzido), monotônico e único — não repete entre Reels (ver edition.ts).
    // Fail-open: se o banco falhar (ed=0), cai no esquema antigo COUNT(posts)+1.
    let editionNum = await editionFor(day, r);
    if (!editionNum) {
      try {
        const { sql } = await import("@vercel/postgres");
        const countResult = await sql`SELECT COUNT(*) as n FROM posts`;
        editionNum = (parseInt(countResult.rows[0]?.n ?? "0") || 0) + 1;
      } catch { editionNum = 1; }
    }
    const ed = String(editionNum).padStart(2, "0");
    const kw = extractKeyword(topic);

    // O Reel de VÍDEO usa FOOTAGE de banco (Pexels) — NÃO gera ilustração na fal
    // aqui (economia; o preview roda várias vezes/dia). EXCEÇÃO: ?illus=1 — o Reel
    // CLÁSSICO (slide animado) usa a ilustração de fundo como a CARA da capa.
    // maxTries=3 (não 1): aqui o "preview" É o render real do clássico (1×/dia) e ele
    // DEPENDE da ilustração; com 1 tentativa, um QA reprovado deixava a capa em branco
    // (só marca d'água). 3 tentativas = mesma robustez do carrossel → a capa quase
    // sempre sai com a ilustração. Reusa o cache do dia (ES/PT compartilham; uma vez
    // aprovada, redisparo não re-paga) e contabiliza na automação ig-reels.
    let illustrationUrl: string | null = null;
    let illustrationError: string | null = null;
    if (sp.get("illus") === "1") {
      const ill = await generateIllustration(TOPIC_SUBJECT[topic] ?? "", cat, { maxTries: 3, automation: "ig-reels", meta: { topic, lang } });
      illustrationUrl = ill.url ?? null;
      illustrationError = ill.error ?? null;
    }

    return NextResponse.json({
      preview: true,
      slot, run: r, topic, cat,
      lang,
      handle: accountFor(lang).handle, // @ correto por idioma (criativo do Reel)
      brand: accountFor(lang).brand, // nome de exibição por idioma
      title: content.postTitle,
      slides: content.slides,
      accentWords: [],
      cta: content.cta,
      caption: content.instagramCaption,
      kw, ed,
      videoQueries, // canônicos (compartilhados entre idiomas)
      clips,        // footage COMPARTILHADO (mesmo vídeo ES/PT); [] → fetch-footage.mjs busca no CI
      sharedFootage: clips.length > 0, // diagnóstico: veio da base compartilhada?
      illustration: illustrationUrl,
      illustrationError,
    });
  }

  const results = [];
  let anyBlocked = false;

  try {
    for (const runIndex of runs) {
      const slot = SLOT_FOR_RUN[runIndex];
      const slotLog: Record<string, unknown> = { slot, run: runIndex };

      try {
        const now   = new Date();

        // IDEMPOTÊNCIA por (dia, run, conta) — a MESMA trava que o Reel já tinha.
        // Sem ela, quando o catchup recupera um run E o cron atrasado do GitHub
        // dispara o MESMO run depois, o carrossel publicava 2× (o anti-dup por
        // TÓPICO não pega porque a seleção fresca dá um tema diferente a cada hora).
        // Aqui: se a vaga já saiu hoje nesta conta, pula (force=1 burla p/ backfill).
        if (!force && await runAlreadyPublished(dayBRT(now), runIndex, lang)) {
          slotLog.skipped = true;
          slotLog.reason = `run ${runIndex} (${lang}) já publicado hoje — idempotência`;
          results.push(slotLog);
          continue;
        }

        // Tópico FRESCO: já pula o que saiu nos últimos 7d em QUALQUER formato
        // (reel ∪ carrossel) — trava anti-dup real, não só a checagem de `posts`.
        const topic = topicOverride ?? await getFreshTopicForRun(now, runIndex, lang);
        slotLog.topic = topic;

        // TRAVA DE PUBLICAÇÃO (rede de segurança INDEPENDENTE da seleção, a menos de
        // force=1): se este tema já saiu em OUTRA vaga (dia,run) nos últimos 7d — em
        // QUALQUER formato e QUALQUER idioma (published_runs unifica reel+carrossel+langs)
        // — NÃO publica. EXCLUI a própria vaga, então o par ES/PT do mesmo (dia,run) passa.
        // Mesmo que a seleção erre por qualquer motivo, a repetição NÃO chega ao feed.
        // (Substitui o backstop antigo, que só olhava `posts`+idioma → cego a reels/PT.)
        if (!force && await topicUsedInOtherVaga(dayBRT(now), runIndex, topic)) {
          slotLog.skipped = true;
          slotLog.reason = "Tópico já publicado em outra vaga nos últimos 7d — trava de publicação";
          results.push(slotLog);
          continue;
        }

        // Teto diário da automação ig-posts: se a próxima publicação estoura o
        // orçamento, BLOQUEIA (não gasta) e sinaliza p/ o GitHub Actions falhar.
        const gate = await checkBudget("ig-posts", EST_RUN_COST.publish);
        if (!gate.ok) {
          anyBlocked = true;
          slotLog.blocked = true;
          slotLog.reason = `Orçamento diário ig-posts estourado (gasto US$${gate.spent.toFixed(3)} + est US$${gate.est.toFixed(3)} > teto US$${gate.budget.toFixed(2)}). Suba budget:ig-posts em config p/ liberar.`;
          // DESISTE DO DIA (hard): o orçamento é um balde DIÁRIO — não reabre até amanhã.
          // Sem isto, a vaga ficava "faltando" e o watchdog redisparava de 15 em 15 min;
          // cada redisparo que passava o portão REGERAVA ilustração (fal) → o gasto subia
          // (chegou a US$0,573 em 24/06), o que causava MAIS 402 → tempestade. Foi a RAIZ
          // real das duplicatas no PT (não o "bloqueio da conta"): o 2º idioma da vaga
          // pega o balde já gasto pelo 1º. Marcar hard = catchup para na hora (anti-martelo).
          await bumpAttempt(dayBRT(now), runIndex, lang, true);
          results.push(slotLog);
          continue;
        }

        // Copy: reusa o cache por (tópico, dia, idioma) → redisparo NÃO repaga
        // a Anthropic. Só busca (Wikipedia, grátis) + gera no MISS.
        let content = (await readContentCache(topic, dayBRT(now), lang)) as GeneratedContent | null;
        if (!content) {
          const searchResults = await searchTopic(topic, "ig-posts");
          content = await generateContent(topic, searchResults, slot, lang, "ig-posts");
          await writeContentCache(topic, dayBRT(now), lang, content);
        }
        slotLog.title = content.postTitle;

        // Número de edição: por VAGA (dia, run), MESMO p/ ES e PT, único e
        // monotônico (ver edition.ts). Fail-open p/ o esquema antigo COUNT(posts)+1.
        let editionNum = await editionFor(dayBRT(now), runIndex);
        if (!editionNum) {
          try {
            const { sql } = await import("@vercel/postgres");
            const countResult = await sql`SELECT COUNT(*) as n FROM posts`;
            editionNum = (parseInt(countResult.rows[0]?.n ?? "0") || 0) + 1;
          } catch { editionNum = 1; }
        }
        const ed   = String(editionNum).padStart(2, "0");
        const kw   = extractKeyword(topic);
        // mood alterna: red para ímpares, ink para pares (igual ao EditorialGrid do site)
        const mood = editionNum % 2 === 0 ? "ink" : "red";

        // Construir URLs dos slides
        const base = process.env.PRODUCTION_URL ?? "https://www.drlibertad.com";
        const enc  = (s: string) => encodeURIComponent(s.slice(0, 120));
        const totalSlides = 2 + content.slides.length; // capa + insights + cta

        // Primeira tag como categoria do rodapé
        const tag = enc(content.tags[0] ?? kw);
        // Direção de arte do slide: cor (categoria) + desenho (motivo por tema)
        const cat   = TOPIC_CAT[topic] ?? "freedom";
        const motif = TOPIC_MOTIF[topic] ?? "gateway";

        // CAPA do carrossel: ILUSTRAÇÃO editorial por IA (fal `flux/dev`, "Cinematic
        // conceptual editorial illustration") — DECISÃO TRAVADA do dono (ver
        // DECISOES-TRAVADAS.md A1/A2; referência ED 82/83). Falha no QA (3 tentativas) →
        // og cai no MOTIVO abstrato como REDE DE SEGURANÇA (nunca publica defeito).
        // [Histórico: o PR #33 pôs o motivo por padrão por um mal-entendido de "motivo";
        //  o dono confirmou (2026-06-19) que "o motivo de ontem" = ESTAS ilustrações. Revertido.]
        const ill = await generateIllustration(TOPIC_SUBJECT[topic] ?? "", cat, { automation: "ig-posts", meta: { topic, lang } });
        slotLog.illustration = ill.url ? "ia" : `fallback: ${ill.error ?? "?"}`;
        const imgParam = ill.url ? `&img=${encodeURIComponent(ill.url)}` : "";

        const slideUrls: string[] = [
          `${base}/api/og?slide=cover&slot=${slot}&title=${enc(content.postTitle)}&kw=${enc(kw)}&ed=${ed}&mood=${mood}&tag=${tag}&cat=${cat}&motif=${motif}${imgParam}&total=${totalSlides}&lang=${lang}`,
          ...content.slides.map((text, i) =>
            `${base}/api/og?slide=insight&slot=${slot}&text=${enc(text)}&num=${i + 2}&total=${totalSlides}&kw=${enc(kw)}&ed=${ed}&mood=${mood}&tag=${tag}&cat=${cat}&motif=${motif}&lang=${lang}`
          ),
          `${base}/api/og?slide=cta&slot=${slot}&text=${enc(content.cta)}&kw=${enc(kw)}&ed=${ed}&mood=${mood}&tag=${tag}&cat=${cat}&motif=${motif}&num=${totalSlides}&total=${totalSlides}&lang=${lang}`,
        ];

        // Publicar carrossel
        let instagramPostId: string | null = null;
        try {
          instagramPostId = await publishCarousel(content.instagramCaption, slideUrls, lang);
          slotLog.instagramPostId = instagramPostId;
          slotLog.slides = slideUrls.length;
        } catch (igErr) {
          slotLog.instagramError = String(igErr);
        }

        // Salvar no banco
        await savePost({
          topic, slot,
          title: content.postTitle,
          body: content.postBody,
          instagramCaption: content.instagramCaption,
          tags: content.tags,
          instagramPostId,
          publishedAt: now,
          lang,
        });

        // Livro-razão (dia,run,lang) p/ o watchdog — só conta como publicado se saiu.
        // Se NÃO saiu, conta a tentativa falha (disjuntor): após MAX, o catchup para
        // de redisparar a vaga; bloqueio/limite do IG já estoura o contador na hora.
        if (instagramPostId) await recordRun(dayBRT(now), runIndex, lang, "carousel", instagramPostId, topic);
        else await bumpAttempt(dayBRT(now), runIndex, lang, isHardPublishBlock(slotLog.instagramError));

        slotLog.ok = true;
      } catch (slotErr) {
        console.error("[publish] erro no slot:", slotErr);
        slotLog.ok    = false;
        slotLog.error = "erro ao publicar slot";
      }

      results.push(slotLog);
    }

    // Se alguma run foi bloqueada pelo teto, devolve 402 para o workflow falhar
    // (::error:: no GitHub Actions) e avisar o dono — mesmo que outras tenham ok.
    if (anyBlocked) {
      return NextResponse.json({ ok: false, blocked: true, posts: results }, { status: 402 });
    }
    return NextResponse.json({ ok: true, posts: results });
  } catch (err) {
    console.error("[publish] erro geral:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
