import { NextRequest, NextResponse } from "next/server";
import { generateIllustration } from "@/lib/illustration";
import { Lang, accountFor, getLang } from "@/lib/accounts";
import { type Automation, checkBudget, logSpend, anthropicCost, tavilyCost, EST_RUN_COST } from "@/lib/spend";
import { parseContentJson } from "@/lib/content-json";
import { dayUTC, reelSharedKey, hashStr, readReelShared, writeReelShared, selectFootage } from "@/lib/reel-shared";
import { readContentCache, writeContentCache } from "@/lib/content-cache";
import { recordRun, recentTopicsAllLangs, runAlreadyPublished } from "@/lib/run-ledger";
import { buildRotation, topicIndexForRun, slotForRun, pickFreshTopicIndex } from "@/lib/rotation";
import { editionFor } from "@/lib/edition";

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
interface Theme { topic: string; cat: string; motif: string; subject: string }
const THEMES: Theme[] = [
  // ── Pilar 1 — Dopamina e seus seguimentos ──
  { topic: "Dopamina y recompensa inmediata", cat: "dopamine", motif: "burst", subject: "a brain with only a few glowing reward receptors lit by a single bright spark" },
  { topic: "Adicción a las redes sociales", cat: "dopamine", motif: "spiral", subject: "a hand reaching into an endless downward spiral emerging from a phone screen" },
  { topic: "La validación externa como droga", cat: "dopamine", motif: "ripple", subject: "a lone figure seen from behind, a silhouette gazing up at floating glowing heart-shaped lights drifting just out of reach in a dark void" },
  { topic: "El doomscrolling sin fin", cat: "anxiety", motif: "spiral", subject: "a figure sinking into a dark endless newsfeed river pouring out of a phone" },
  { topic: "La pornografía y el cerebro secuestrado", cat: "dopamine", motif: "decay", subject: "a male figure entangled in glowing screen-threads slowly draining his vitality" },
  { topic: "El placer fácil que mata el deseo real", cat: "dopamine", motif: "burst", subject: "fast bright sparks swirling around a figure while a distant warm fire fades" },
  { topic: "La hiperestimulación y la incapacidad de aburrirse", cat: "dopamine", motif: "orbit", subject: "a restless figure unable to sit still in a quiet room while screens orbit frantically" },
  { topic: "El reseteo de dopamina", cat: "mind", motif: "unplug", subject: "a calm figure unplugging glowing cables from its own head" },
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
  { topic: "En la foto haces match; en la cita aparece otra persona", cat: "network", motif: "masks", subject: "a polished filtered portrait on a phone beside the plain real face of the same person arriving at an empty restaurant table, mismatch, no flattery" },
  { topic: "Te enamoras de una edición y cenas con la realidad", cat: "network", motif: "mirror", subject: "a figure embracing a glowing edited portrait that dissolves into an ordinary plain reflection in a mirror" },
  { topic: "La ilusión de opciones infinitas te deja solo", cat: "network", motif: "spiral", subject: "a figure endlessly scrolling a spiral wall of identical portrait cards, unable to choose, alone in the dark" },
  { topic: "Pasas más tiempo eligiendo que viviendo", cat: "anxiety", motif: "orbit", subject: "a paralyzed figure before an infinite shelf of glowing options, hours dissolving, nothing chosen" },
  // ── Pilar 3 — A guerra invisível do Homem (temas incômodos) ──
  { topic: "La guerra invisible del hombre", cat: "freedom", motif: "descent", subject: "a lone male figure carrying an unseen heavy weight up a grey hill" },
  { topic: "El hombre al que no se le permite llorar", cat: "self", motif: "masks", subject: "a male figure pressing a stone mask over a face about to break" },
  { topic: "La soledad masculina que nadie ve", cat: "network", motif: "isolation", subject: "a man in a crowd enclosed by an invisible glass wall" },
  { topic: "El vacío del proveedor", cat: "self", motif: "decay", subject: "a male figure as a burning candle giving light to others while melting unseen" },
  { topic: "La fuerza mal entendida", cat: "freedom", motif: "boundary", subject: "a male figure mistaking a rigid iron armor for real strength" },
  { topic: "El padre ausente dentro de ti", cat: "self", motif: "mirror", subject: "a grown figure facing the faded silhouette of an absent father" },
  { topic: "La rabia que esconde tristeza", cat: "anxiety", motif: "decay", subject: "a figure whose angry shadow hides a small grieving child" },
  { topic: "El hombre tratado como desechable", cat: "freedom", motif: "descent", subject: "a male figure used as a stepping stone and then stepped past" },
  { topic: "Reconstruir al hombre, no destruirlo", cat: "mind", motif: "synapse", subject: "a cracked male statue regrowing with golden kintsugi veins" },
  // ── Pilar 4 — Verdades incômodas que precisam ser ditas ──
  { topic: "El hombre no necesita ser amado: necesita cariño, respeto y admiración", cat: "self", motif: "embrace", subject: "a male figure standing tall receiving a warm light of respect rather than clinging to affection" },
  { topic: "Nadie te debe nada", cat: "freedom", motif: "boundary", subject: "a lone figure seen from behind walking away into light as a heavy open sack and cut ropes fall away into the dark behind" },
  { topic: "Si no pones límites, te vuelves una opción", cat: "self", motif: "boundary", subject: "a figure fading into a faint optional silhouette among many doors" },
  { topic: "La comodidad te está matando lentamente", cat: "anxiety", motif: "decay", subject: "a figure sinking comfortably into a soft chair that slowly swallows it" },
  { topic: "Te respetan por lo que toleras, no por lo que dices", cat: "freedom", motif: "mirror", subject: "a figure whose spoken words fade while the firm line it draws glows" },
  { topic: "El victimismo es una cárcel cómoda", cat: "anxiety", motif: "spiral", subject: "a figure locking its own cage from the inside and pocketing the key" },
  { topic: "Nadie va a venir a salvarte", cat: "self", motif: "descent", subject: "a figure at the bottom of a well building its own ladder" },
  { topic: "Tu potencial no vale nada sin acción", cat: "dopamine", motif: "burst", subject: "a bright seed rotting unplanted while a figure only admires it" },
  { topic: "La verdad incomoda más que la mentira amable", cat: "freedom", motif: "mirror", subject: "a figure choosing a sharp clear mirror over a flattering blurred one" },
  // ── Pilar 5 — Liberdade (e o direito de falar) ──
  { topic: "Tú tienes derecho a hacer lo que quieras; yo a decir lo que pienso", cat: "freedom", motif: "gateway", subject: "two figures standing in opposite open doorways, each free, a line of mutual respect between them" },
  { topic: "La libertad de expresión incómoda", cat: "freedom", motif: "gateway", subject: "a figure speaking through an open arch while soft hands try to push it closed" },
  { topic: "El miedo a la opinión ajena", cat: "anxiety", motif: "mirror", subject: "a figure shrinking before a wall of judging eyes, then rising tall" },
  { topic: "La cultura de la ofensa", cat: "freedom", motif: "squares", subject: "fragile glass figures shattering at every spoken word" },
  { topic: "Pensar diferente no es un crimen", cat: "freedom", motif: "branches", subject: "a single tree branching the opposite way from a uniform forest" },
  { topic: "La libertad empieza donde acaba el miedo", cat: "freedom", motif: "gateway", subject: "a figure stepping through a doorway out of a cage of shadows" },
  { topic: "Decir 'no' es un acto de libertad", cat: "self", motif: "boundary", subject: "a single upright closed door standing calm against a swirling storm of paper demands that breaks around it, no people" },
  { topic: "La autocensura silenciosa", cat: "anxiety", motif: "masks", subject: "a sculptural human head in profile, a line of fine grey stitches sealing shut where the mouth would be, deep shadow, no hands" },
  { topic: "Ser libre incomoda a quien quiere controlarte", cat: "freedom", motif: "branches", subject: "a lone figure seen from behind walking forward as cut marionette strings fall slack around it and the dark control-cross collapses above, no hands" },
];

const TOPICS = THEMES.map((t) => t.topic);
const TOPIC_CAT: Record<string, string> = Object.fromEntries(THEMES.map((t) => [t.topic, t.cat]));
const TOPIC_MOTIF: Record<string, string> = Object.fromEntries(THEMES.map((t) => [t.topic, t.motif]));
const TOPIC_SUBJECT: Record<string, string> = Object.fromEntries(THEMES.map((t) => [t.topic, t.subject]));

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
    // Base UNIFICADA (qualquer conta): ES e PT veem os MESMOS recentes → escolhem o
    // MESMO tema por vaga (vídeo compartilhado) e nenhum repete.
    const recent = await recentTopicsAllLangs(7);
    const used = new Set<number>();
    for (const t of recent) {
      const i = TOPIC_INDEX.get(t);
      if (i !== undefined) used.add(i);
    }
    // THREADING intra-dia: inclui os temas que os runs ANTERIORES de hoje escolhem
    // (deterministicamente, mesma base) → 6 temas DISTINTOS no dia, sem depender da
    // ordem/timing de gravação no livro-razão (robusto a re-disparo do catchup).
    for (let i = 0; i < runIndex; i++) {
      used.add(pickFreshTopicIndex(ROTATION, slotForRun(date, i), used));
    }
    return TOPICS[pickFreshTopicIndex(ROTATION, slotForRun(date, runIndex), used)];
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

// ─── Pesquisa de contexto ─────────────────────────────────────────────────────

async function searchTopic(topic: string, automation: Automation): Promise<SearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: topic + " psicología neurociencia",
      search_depth: "advanced",
      max_results: 5,
      include_answer: true,
    }),
  });
  if (!res.ok) throw new Error(`Tavily error: ${res.status}`);
  await logSpend({ automation, platform: "tavily", operation: "search", model: "advanced", units: 1, costUsd: tavilyCost() });
  const data = await res.json();
  return (data.results ?? []).map((r: any) => ({
    title: r.title ?? "", content: r.content ?? "", url: r.url ?? "",
  }));
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

  const marketSection = acc.marketBrief
    ? `\nMERCADO / VOZ NATIVA — LEIA ANTES DE TUDO (vale mais que qualquer exemplo abaixo):\n${acc.marketBrief}\n`
    : "";

  const prompt = `Eres el editor de ${acc.brand}, estudio editorial sobre psicología, atención y ${acc.freedom} mental.

IMPORTANTE — IDIOMA: genera ABSOLUTAMENTE TODA la salida (postTitle, postBody, slides, cta, instagramCaption, tags) en ${L}. NO mezcles idiomas. (videoQueries es la ÚNICA excepción: va en inglés.)
${marketSection}
Tema: "${topic}"
${SLOT_INSTRUCTIONS[slot]}

REGLA DE MARCA (${acc.brand}): aborda CUALQUIER tema desde el ángulo de la ${acc.freedom.toUpperCase()} mental — recuperar el control, la atención y la autonomía frente a lo que nos esclaviza (algoritmos, validación, miedo, hábitos). El título y al menos uno de los insights deben conectar explícitamente con esa idea de ${acc.freedom}/liberación. Nada de psicología genérica: siempre remite a la marca.

VOZ EDITORIAL: directa, valiente y sin miedo a la POLÉMICA — la polémica es la herramienta, no el accidente; es lo que genera alcance y debate. Dice VERDADES INCÓMODAS de forma LITERAL: nunca las suavices, relativices ni "equilibres" para hacerlas cómodas — la fuerza de la frase ES el producto. Desafía lo políticamente correcto y defiende la libertad de expresión y el derecho a pensar distinto ("tú tienes derecho a hacer lo que quieras; yo a decir lo que pienso").

ALMA de la marca (impregna el TONO; no la cites literalmente): hombría — fuerza, coraje y responsabilidad, y la capacidad de amar sin anularse; rechazo a la servidumbre voluntaria y al hombre pasivo que entrega su libertad; determinación de ir hasta las últimas consecuencias por un sueño; y un sentido de la vida que solo se completa en lo compartido (nadie nació para vivir solo). Cuando el tema lo permita, mira con ojo crítico la era de las pantallas: filtros y apps venden un estándar de belleza inexistente y una ilusión de opciones infinitas que dejan a la gente más sola, no más libre.

PERO la provocación viene de la IDEA, nunca del odio: atacas la idea, el sistema o el comportamiento — JAMÁS a la persona. Nunca insultes ni deshumanices a personas o grupos (por sexo, raza, orientación, etc.) ni incites violencia — eso hunde la cuenta. Incomoda con argumentos, no con desprecio.

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

  // O haiku ocasionalmente devolve JSON malformado → o post falhava silencioso.
  // Tentamos 2×: extrai o objeto (parseContentJson) e, se o parse falhar, regenera.
  const MAX_CONTENT_TRIES = 2;
  let lastErr: unknown;
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
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
    const data = await res.json();
    await logSpend({ automation, platform: "anthropic", operation: "content", model: "claude-haiku-4-5-20251001", units: (data?.usage?.input_tokens ?? 0) + (data?.usage?.output_tokens ?? 0), costUsd: anthropicCost("claude-haiku-4-5-20251001", data?.usage) });
    const raw = data.content?.[0]?.text ?? "";
    try {
      return parseContentJson<GeneratedContent>(raw);
    } catch (e) {
      lastErr = e; // JSON malformado → regenera na próxima volta
    }
  }
  throw new Error(`generateContent: JSON inválido após ${MAX_CONTENT_TRIES} tentativas: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
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
  const { id: postId } = await pubRes.json();
  return postId;
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
    // pesquisa (Tavily) e o footage (Pexels) são resolvidos UMA vez por (tópico,
    // dia) e cacheados; o 2º idioma reusa tudo. Só a COPY muda por idioma.
    const day = dayUTC();
    const shared = await readReelShared(topic, day);

    // Pesquisa: reusa a do cache (sem pagar Tavily de novo) ou busca agora.
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
        if (!force && await runAlreadyPublished(dayUTC(now), runIndex, lang)) {
          slotLog.skipped = true;
          slotLog.reason = `run ${runIndex} (${lang}) já publicado hoje — idempotência`;
          results.push(slotLog);
          continue;
        }

        // Tópico FRESCO: já pula o que saiu nos últimos 7d em QUALQUER formato
        // (reel ∪ carrossel) — trava anti-dup real, não só a checagem de `posts`.
        const topic = topicOverride ?? await getFreshTopicForRun(now, runIndex, lang);
        slotLog.topic = topic;

        // Backstop defensivo (a menos que force=1): se mesmo assim o tópico já saiu
        // como CARROSSEL nesta conta em 7d, pula. Com o tópico fresco acima isto
        // praticamente nunca dispara (N=51 > 6×7); fica como rede de segurança.
        if (!force) {
          try {
            const { sql } = await import("@vercel/postgres");
            const existing = await sql`SELECT id FROM posts WHERE topic = ${topic} AND lang = ${lang} AND published_at > NOW() - INTERVAL '7 days' LIMIT 1`;
            if (existing.rows.length > 0) {
              slotLog.skipped = true;
              slotLog.reason = "Tópico já publicado nesta conta nos últimos 7 dias";
              continue;
            }
          } catch { /* ignora erro de banco */ }
        }

        // Teto diário da automação ig-posts: se a próxima publicação estoura o
        // orçamento, BLOQUEIA (não gasta) e sinaliza p/ o GitHub Actions falhar.
        const gate = await checkBudget("ig-posts", EST_RUN_COST.publish);
        if (!gate.ok) {
          anyBlocked = true;
          slotLog.blocked = true;
          slotLog.reason = `Orçamento diário ig-posts estourado (gasto US$${gate.spent.toFixed(3)} + est US$${gate.est.toFixed(3)} > teto US$${gate.budget.toFixed(2)}). Suba budget:ig-posts em config p/ liberar.`;
          results.push(slotLog);
          continue;
        }

        // Copy: reusa o cache por (tópico, dia, idioma) → redisparo NÃO repaga
        // Tavily+Anthropic. Só busca+gera no MISS.
        let content = (await readContentCache(topic, dayUTC(now), lang)) as GeneratedContent | null;
        if (!content) {
          const searchResults = await searchTopic(topic, "ig-posts");
          content = await generateContent(topic, searchResults, slot, lang, "ig-posts");
          await writeContentCache(topic, dayUTC(now), lang, content);
        }
        slotLog.title = content.postTitle;

        // Número de edição: por VAGA (dia, run), MESMO p/ ES e PT, único e
        // monotônico (ver edition.ts). Fail-open p/ o esquema antigo COUNT(posts)+1.
        let editionNum = await editionFor(dayUTC(now), runIndex);
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
        if (instagramPostId) await recordRun(dayUTC(now), runIndex, lang, "carousel", instagramPostId, topic);

        slotLog.ok = true;
      } catch (slotErr) {
        slotLog.ok    = false;
        slotLog.error = String(slotErr);
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
