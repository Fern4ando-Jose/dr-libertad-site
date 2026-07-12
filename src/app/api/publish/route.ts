import { NextRequest, NextResponse } from "next/server";
import { generateIllustration } from "@/lib/illustration";
import { Lang, accountFor, getLang } from "@/lib/accounts";
import { type Automation, checkBudget, logSpend, anthropicCost, EST_RUN_COST } from "@/lib/spend";
import { parseContentJson, normalizeContentJson, missingEssentialContent } from "@/lib/content-json";
import { dayBRT, reelSharedKey, hashStr, readReelShared, writeReelShared, selectFootage } from "@/lib/reel-shared";
import { generateNarration } from "@/lib/narration";
import { readContentCache, writeContentCache } from "@/lib/content-cache";
import { recordRun, recentPublishedSlots, runAlreadyPublished, getOrSetRunTopic, clearRunTopic, topicUsedInOtherVaga, publishedId, bumpAttempt, isHardPublishBlock, siblingPublished, attemptsToday, slotSkipGate, MAX_PUBLISH_ATTEMPTS, publishFailureMode, containerStatusOutcome, pinnedTopicsForDay, recordQaFail, recentQaFailedTopics } from "@/lib/run-ledger";
import { buildRotation, topicIndexForRun, selectThemeIndex, slotForDayRun, RANDOM_POOL } from "@/lib/rotation";
import { editionFor } from "@/lib/edition";
import { searchDuckDuckGo } from "@/lib/ddg";
import { buildLiteralDirective, anchorForLang, anchorViolated } from "@/lib/literal-lock";
import { scanContentForeign, summarizeHits } from "@/lib/lang-guard";
import { scanContentForFabricatedStats, summarizeStatHits } from "@/lib/stats-guard";
import { titleDupedInSlides, dedupeSlides } from "@/lib/slide-dedup";
import { clipSlideText } from "@/lib/slide-text";
import { appendSurveyCta } from "@/lib/caption-cta";

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
  narration?: string;      // roteiro FALADO do Reel (~28s), tirado dos slides → voz = tela
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
// `literalPt`: âncora-convicção CANÔNICA em PT-BR (verbatim do §4 da LINHA-EDITORIAL
// ou tradução consagrada da obra do cânone). Em tema `literal`, a frase é fixa POR
// IDIOMA — o PT NUNCA é traduzido livre pelo modelo (foi o bug "cariño"→"cuidado").
// Tema literal SEM literalPt = o dono ainda não fixou o verbatim PT → tradução FIEL
// obrigatória (sem eufemismo, sem quebrar a antítese), ver literal-lock.ts.
interface Theme { topic: string; cat: string; motif: string; subject: string; literal?: boolean; literalPt?: string }
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
  { topic: "En la foto haces match; en la cita aparece otra persona", literal: true, literalPt: "No app você dá match com a foto; no encontro, janta com a realidade", cat: "network", motif: "masks", subject: "a polished filtered portrait on a phone beside the plain real face of the same person arriving at an empty restaurant table, mismatch, no flattery" },
  { topic: "Te enamoras de una edición y cenas con la realidad", literal: true, literalPt: "Você não se apaixonou pela pessoa: se apaixonou por uma edição dela", cat: "network", motif: "mirror", subject: "a figure embracing a glowing edited portrait that dissolves into an ordinary plain reflection in a mirror" },
  { topic: "La ilusión de opciones infinitas te deja solo", literal: true, literalPt: "A ilusão de escolhas infinitas é exatamente o que te deixa sozinho", cat: "network", motif: "spiral", subject: "a figure endlessly scrolling a spiral wall of identical portrait cards, unable to choose, alone in the dark" },
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
  { topic: "El hombre no necesita ser amado: necesita cariño, respeto y admiración", literal: true, literalPt: "O homem não precisa ser amado: precisa de carinho, respeito e admiração", cat: "self", motif: "embrace", subject: "a tall sturdy oak bathed in warm respectful light, standing apart from grasping clinging ivy that recedes into shadow, no people" },
  { topic: "Nadie te debe nada", literal: true, literalPt: "Ninguém te deve nada", cat: "freedom", motif: "boundary", subject: "cut debt-ropes and an empty open ledger dissolving into warm light on a bare wooden table, no people" },
  { topic: "Si no pones límites, te vuelves una opción", literal: true, literalPt: "Se você não põe limites, vira uma opção", cat: "self", motif: "boundary", subject: "one solid firmly crossed-out checkbox standing apart amid an endless grid of identical selectable boxes, no people" },
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
  { topic: "Lo esencial es invisible a los ojos", literal: true, literalPt: "O essencial é invisível aos olhos", cat: "mind", motif: "iris", subject: "a figure with closed eyes before a dazzling empty surface, a faint warm rose of light glowing only in the dark behind the eyelids, no text" },
  { topic: "La servidumbre que más cuesta romper es la que eliges tú mismo", literal: true, cat: "freedom", motif: "boundary", subject: "a seated figure holding its own heavy chain, the open padlock resting in its palm and the cage door already ajar, no captor present" },
  { topic: "La felicidad solo es real cuando se comparte", literal: true, literalPt: "A felicidade só é real quando compartilhada", cat: "network", motif: "ripple", subject: "two figures sharing a single small warm fire in a vast cold wilderness, the firelight rippling outward in warm rings, no screens" },
  { topic: "Prefiero morir de pie a vivir de rodillas", literal: true, literalPt: "Prefiro morrer de pé a viver de joelhos", cat: "freedom", motif: "descent", subject: "a lone figure standing tall and unbowed at the crest of a grey hill as a vast shadow presses down, refusing to kneel, no people around" },
  // ── §4 Verdades incômodas (literais) — adições da Linha editorial ──
  { topic: "El filtro no corrige tu piel: corrige tu expectativa", literal: true, literalPt: "O filtro não corrige a pele — corrige a sua expectativa", cat: "network", motif: "masks", subject: "a figure admiring a flawless filtered reflection in a phone while the plain real face behind the glass waits unseen, the gap between the promise and the skin" },
  { topic: "Nunca cambies lo que eres por nadie", literal: true, literalPt: "Nunca mude o que você é por ninguém", cat: "self", motif: "mirror", subject: "a single true sculpted form keeping its shape in a mirror while a ring of identical empty molds around it crack and crumble, no people" },
  { topic: "Solo cambias cuando tú quieres — y duele", literal: true, literalPt: "Só existe mudança quando a pessoa quer — e isso é doloroso", cat: "self", motif: "descent", subject: "a figure carving a faint path through thick dark brush by sheer will, the trail appearing only from passing again and again, effort before ease" },
  { topic: "La mujer elige con quién acostarse; el hombre, con quién casarse", literal: true, literalPt: "A mulher escolhe com quem transar; o homem escolhe com quem casar", cat: "self", motif: "boundary", subject: "two diverging paths from a single crossroads — one a brief bright spark, the other a long steady flame — weighed in silence, symbolic, no people" },
  { topic: "El hombre puede ser feliz con cualquier mujer, mientras no la ame", literal: true, literalPt: "O homem pode ser feliz com qualquer mulher, desde que não a ame", cat: "self", motif: "embrace", subject: "a serene figure holding a small calm flame at arm's length untroubled, while the same flame pressed to the chest scorches — detachment versus attachment, symbolic, no people" },

  // ─── Temas dos livros (leva 1, aprovada 2026-07-08) — fonte: src/content/temas-livros/*.md ───
// === I love Dopamina (21 temas) ===
  { topic: "La dopamina no es placer, es querer", cat: "dopamine", motif: "synapse", subject: "a glowing neural pathway reaching hungrily toward a distant fruit that stays just out of grasp, no people" }, // DOP1 · Dopamina não é prazer, é querer
  { topic: "La dopamina vive en la anticipación", cat: "dopamine", motif: "ripple", subject: "a wrapped glowing gift radiating light far brighter than the dim prize beside it, the peak in the promise, no people" }, // DOP2 · A dopamina vive na antecipação
  { topic: "La incertidumbre es lo que engancha", cat: "dopamine", motif: "spiral", subject: "spinning slot-machine reels frozen mid-spin, blurred symbols suggesting a maybe-win, hypnotic glow, no people" }, // DOP3 · A incerteza é o que vicia
  { topic: "El feed es una tragamonedas en tu bolsillo", cat: "dopamine", motif: "bars", subject: "a smartphone morphing into a slot machine, glowing reels spinning behind the glass screen, no people" }, // DOP4 · O feed é um caça-níquel
  { topic: "Querer sin gustar", cat: "dopamine", motif: "decay", subject: "a withered grey flower still chased by a glowing moth, desire outliving the faded bloom, no people" }, // DOP5 · Querer sem gostar
  { topic: "Tú eres el producto", cat: "mind", motif: "web", subject: "a human silhouette displayed inside a glowing product box on a store shelf of screens, sold for attention" }, // DOP6 · Você é o produto
  { topic: "El algoritmo te conoce mejor que tú", cat: "mind", motif: "mirror", subject: "a mirror reflecting a person as streams of glowing data and code, the reflection more detailed than the figure" }, // DOP7 · O algoritmo te conhece melhor
  { topic: "La carrera hacia el fondo del cerebro", cat: "mind", motif: "descent", subject: "a glowing staircase spiraling downward into a dark primal brain-stem, screens lining every step, no people" }, // DOP8 · A corrida pro fundo do cérebro
  { topic: "Lo falso le gana a lo real", cat: "dopamine", motif: "burst", subject: "an oversaturated artificial fruit glowing intensely beside a plain real one, exaggerated colors overwhelming, no people" }, // DOP9 · O falso vence o real
  { topic: "Comida diseñada para que no pares", cat: "dopamine", motif: "orbit", subject: "an endless loop of glossy engineered snacks orbiting with the brakes visibly removed, no stopping point, no people" }, // DOP10 · Comida desenhada pra não parar
  { topic: "La novedad infinita como cebo", cat: "dopamine", motif: "waves", subject: "an infinite waterfall of glowing cards cascading endlessly downward, a hidden hook in the current, no people" }, // DOP11 · A novidade infinita como isca
  { topic: "Es biología explotada a escala industrial", cat: "dopamine", motif: "synapse", subject: "industrial gears and factory pipes wired directly into a glowing human brain, biology on an assembly line, no people" }, // DOP13 · Biologia explorada, não fraqueza
  { topic: "Dopamina barata vs. lenta", cat: "dopamine", motif: "waves", subject: "a jagged neon spike beside a slow steady rising hill of warm light, two very different rewards, no people" }, // DOP14 · Dopamina barata × lenta
  { topic: "Tolerancia: el precio de tanto pico", cat: "dopamine", motif: "decay", subject: "a worn-down dial where real-world colors fade to grey while past peaks still glow, tolerance's price, no people" }, // DOP15 · Tolerância
  { topic: "Pagar el aburrimiento", cat: "mind", motif: "ripple", subject: "a still calm pond where a single ripple begins in empty quiet space, slow renewal restarting, no people" }, // DOP17 · Pagar o tédio
  { topic: "Cambia el entorno (fricción)", cat: "dopamine", motif: "boundary", subject: "a glowing temptation blocked behind a simple physical barrier, friction added to the path, no people" }, // DOP18 · O ambiente vence a vontade
  { topic: "El motor no es el villano", cat: "dopamine", motif: "orbit", subject: "a glowing engine-heart at the center powering orbiting paths of purpose, energy as ally not enemy, no people" }, // DOP19 · Amar a dopamina
  { topic: "El mito del suplemento", cat: "dopamine", motif: "boundary", subject: "a supplement pill stopped by a glowing wall before reaching the brain, a false promise blocked, no people" }, // DOP20 · O mito do suplemento
  { topic: "Molécula del movimiento, no del placer", cat: "dopamine", motif: "burst", subject: "a running figure trailing glowing molecular sparks of motion, the chemistry of movement not pleasure" }, // DOP21 · Dopamina é do movimento
  { topic: "El chef que no come de su cocina", cat: "mind", motif: "unplug", subject: "a chef pushing away his own glowing dish while a locked, dark phone sits on the counter behind him" }, // DOP22 · Quem constrói mantém os filhos longe
  { topic: "El libre albedrío en un pulso", cat: "mind", motif: "burst", subject: "a human arm straining in an arm-wrestle against a glowing tireless mechanical arm, a match that never ends" }, // DOP23 · Livre-arbítrio numa queda de braço

// === 100 Dias para a Liberdade (17 temas) ===
  { topic: "La servidumbre voluntaria", cat: "freedom", motif: "bars", subject: "a prison cell whose open door is held shut by a chain gripped from the inside, self-imposed servitude, no people" }, // DIA1 · A servidão voluntária
  { topic: "La Matrix digital y la píldora roja", cat: "freedom", motif: "gateway", subject: "two glowing pills before an open doorway of light breaking through a wall of screens, an awakening threshold, no people" }, // DIA2 · A Matrix digital
  { topic: "Querer no es disfrutar", cat: "dopamine", motif: "synapse", subject: "a hand-shaped glow grasping a glittering prize that turns hollow on contact, wanting without enjoying, no people" }, // DIA4 · Querer não é gostar
  { topic: "El detonante de la recaída es el estrés, no el deseo", cat: "anxiety", motif: "descent", subject: "a lone figure sinking into a numbing fog of screen-light to escape a looming pressure overhead, no explicit imagery" }, // DIA5 · O gatilho da recaída é o estresse, não o desejo (reenquadrado p/ segurança Meta 2026-07-08)
  { topic: "La pantalla donde nadie te mide", cat: "self", motif: "isolation", subject: "a man turning away from a real silhouette toward a glowing screen where no one judges him" }, // DIA6 · A tela onde ninguém te mede
  { topic: "El malestar voluntario", cat: "self", motif: "waves", subject: "a lone figure standing calmly under a cascade of cold water, choosing hardship to forge the will" }, // DIA9 · O desconforto voluntário
  { topic: "Regla de cine, tiempo de stories", cat: "network", motif: "masks", subject: "a couple posed on a glowing cinema screen while real shadows watch, the showcase selling impossible expectation" }, // DIA12 · Régua de cinema, tempo de stories
  { topic: "El amor se cultiva, no se consume", cat: "network", motif: "branches", subject: "two hands tending a small growing plant beside a discarded pile of consumed wrappers, love as cultivation" }, // DIA13 · O amor se cultiva
  { topic: "La confianza como copa de cristal", cat: "self", motif: "decay", subject: "a crystal glass shattered on the floor, its pieces impossible to reassemble, trust once broken, no people" }, // DIA14 · Confiança de cristal
  { topic: "La cabeza de abajo", cat: "self", motif: "boundary", subject: "a man holding steady reins over a wild lower impulse, governing the instinct instead of being ruled by it" }, // DIA16 · A cabeça de baixo
  { topic: "La moral no es ética", cat: "self", motif: "boundary", subject: "a set of scales where an unseen hand quietly tips the balance toward comfort, relativism as easy excuse, no people" }, // DIA17 · Moral não é ética
  { topic: "Pedir ayuda no es una derrota", cat: "self", motif: "embrace", subject: "a man in heavy rusted armor cracking open to finally reach out a bare hand, asking help as strength" }, // DIA20 · Pedir ajuda não é derrota
  { topic: "La tiranía de la espera", cat: "self", motif: "clock", subject: "an hourglass whose falling sand builds a figure on one side and erodes it on the other, time making or unmaking, no people" }, // DIA22 · A tirania da espera
  { topic: "Un desliz no es una recaída", cat: "self", motif: "ripple", subject: "a single stumble on a long glowing path that continues onward, the next step still open, no people" }, // DIA23 · Lapso não é recaída
  { topic: "La voluntad sin método no basta", cat: "self", motif: "branches", subject: "four glowing roads branching from a single compass, will needing a map to reach anywhere, no people" }, // DIA24 · Vontade sem método
  { topic: "Escribir para verse", cat: "self", motif: "mirror", subject: "an open journal reflecting a face back like a mirror, writing as a way to truly see oneself, no people" }, // DIA25 · Escrever para se enxergar
  { topic: "El fin del secreto", cat: "freedom", motif: "burst", subject: "a locked box opening to release its secret into open daylight, the private struggle made public as healing, no people" }, // DIA26 · O fim do segredo

// === Como perdi a mulher da minha vida (21 temas) ===
  { topic: "La conversación entre hombres que está en extinción", cat: "self", motif: "isolation", subject: "two empty chairs facing each other in fading light, a vanishing conversation between men, no people" }, // CP1 · A conversa entre homens em extinção
  { topic: "Salvar no es amar", cat: "self", motif: "masks", subject: "a figure pulling another from deep water while a heart-shaped shadow reveals the act as rescue disguised as love" }, // CP2 · Salvar não é amar
  { topic: "El sexo solo no sostiene una casa", cat: "self", motif: "boundary", subject: "a fragile bridge arching over a chasm but touching neither bank, connection that holds nothing together, no people" }, // CP3 · O sexo sozinho não sustenta uma casa
  { topic: "Encontrarse antes de elegir pareja", cat: "self", motif: "mirror", subject: "a man studying his own clear reflection before two open doorways, finding himself before choosing" }, // CP4 · Encontrar-se antes de escolher
  { topic: "El valor se prueba cuando mantenerlo cuesta caro", cat: "self", motif: "boundary", subject: "a glowing coin held firm in an open hand as a storm tries to blow it away, worth proven under cost" }, // CP5 · O valor se prova quando custa caro
  { topic: "El amor se construye, no se cae en él", cat: "self", motif: "squares", subject: "hands laying warm glowing bricks into a rising wall, love built stone by stone not stumbled into" }, // CP6 · O amor se constrói
  { topic: "Entregarlo todo de una vez mata la admiración", cat: "self", motif: "descent", subject: "a treasure chest dumped out all at once, its glow draining away as mystery escapes, no people" }, // CP7 · Entregar tudo mata a admiração
  { topic: "La mujer no ama al hombre: lo admira", cat: "self", motif: "iris", subject: "a figure gazing upward at another lit on a pedestal, admiration holding the bond aloft" }, // CP9 · A mulher o admira
  { topic: "La puerta y la llave: abrir vs. mantener", cat: "network", motif: "gateway", subject: "a single door surrounded by many different glowing keys, opening easy but keeping needing the right one, no people" }, // CP10 · A porta e a chave
  { topic: "Por qué la mujer elige con criterio", cat: "network", motif: "iris", subject: "a discerning eye carefully weighing many glowing options, selectivity as ancient evolutionary caution" }, // CP11 · Por que a mulher escolhe com critério
  { topic: "La monogamia no es automática", cat: "self", motif: "branches", subject: "a wild tangled branch beside a neatly tied cultural knot, monogamy as choice not instinct, no people" }, // CP12 · Monogamia não é automática
  { topic: "El cuerpo no miente", cat: "self", motif: "decay", subject: "a warm flame naturally cooling to glowing embers over time, passion fading by design not fault, no people" }, // CP13 · O corpo não mente
  { topic: "La naturaleza explica, no absuelve", cat: "self", motif: "boundary", subject: "a hand pausing over a rising impulse, a clear bright line drawn between explanation and permission" }, // CP14 · A natureza explica, não absolve
  { topic: "El precio de una relación real", cat: "self", motif: "waves", subject: "a wedding ring dissolving into a thousand tiny glowing coins scattered across ordinary days, no people" }, // CP15 · O preço de uma relação real
  { topic: "Entrenados para elegir, nunca para mantener", cat: "network", motif: "squares", subject: "a wall of countless unfinished glowing beginnings, none ever tended past their start, no people" }, // CP16 · Treinados para escolher, não manter
  { topic: "La disponibilidad total te vuelve invisible", cat: "self", motif: "isolation", subject: "a figure fading to transparency while endlessly available, total presence becoming invisibility" }, // CP17 · Disponibilidade total te torna invisível
  { topic: "Hablar de más: la boca callada", cat: "self", motif: "boundary", subject: "a sealed glowing mouth beside a scattered pile of spilled words, restraint as freedom from regret, no people" }, // CP18 · Falar demais
  { topic: "La joya en el tiempo equivocado", cat: "self", motif: "clock", subject: "a precious jewel offered against a clock stopped at the wrong hour, timing deciding everything, no people" }, // CP19 · A joia no tempo errado
  { topic: "Perderse de sí antes de perder a la otra", cat: "self", motif: "decay", subject: "a man's silhouette dissolving piece by piece in installments, losing himself before losing her, no people" }, // CP20 · Perder-se de si
  { topic: "La autopreservación no es blindarse", cat: "self", motif: "boundary", subject: "a strong upright spine of light standing without heavy armor, self-preservation as backbone not shield, no people" }, // CP21 · Autopreservação não é blindar-se
  { topic: "Tu mente no es tu amiga", cat: "mind", motif: "synapse", subject: "a glowing brain misfiring with craving after a loss, a dark switched-off screen resting nearby, no people" }, // CP22 · Sua mente não é sua amiga

// === Tolos, Inteligentes e Sábios (22 temas) ===
  { topic: "El tonto que renuncia al mañana", cat: "mind", motif: "burst", subject: "a loud burst of confetti dissolving into empty grey, joy with no memory of tomorrow, no people" }, // TOL1 · O tolo que dispensa o amanhã
  { topic: "La inteligencia sin coraje", cat: "mind", motif: "iris", subject: "a figure perched high measuring the world through a telescope, intelligence watching life without living it" }, // TOL2 · Inteligência sem coragem
  { topic: "El sabio ausente", cat: "mind", motif: "isolation", subject: "a wise figure seated apart on a distant hill while the street below struggles unaided, knowledge that never descends" }, // TOL3 · O sábio ausente
  { topic: "Vivir para el público", cat: "network", motif: "masks", subject: "a person on a lit stage performing to a faceless crowd instead of living, life as constant performance" }, // TOL4 · Viver para a plateia
  { topic: "La máscara que se vuelve rostro", cat: "network", motif: "mirror", subject: "a mask lifted to reveal it has fused into the actual face beneath, the persona replacing the person" }, // TOL5 · A máscara que vira o rosto
  { topic: "La etiqueta que te ponen", cat: "self", motif: "masks", subject: "a paper label pinned to a person growing until it covers them entirely, the village's stamp becoming the self" }, // TOL6 · O rótulo que a vila cola
  { topic: "La escuela que castiga la pregunta", cat: "mind", motif: "bars", subject: "a single raised curious hand pressed down inside rigid classroom bars, curiosity punished while rote answers glow" }, // TOL7 · A escola que pune a pergunta
  { topic: "La validación como moneda", cat: "network", motif: "burst", subject: "an open hand catching applause that turns into hollow glowing coins, validation as a currency that never satisfies" }, // TOL8 · Validação como moeda
  { topic: "El precio del silencio", cat: "self", motif: "ripple", subject: "a sealed mouth at the center while distant figures bear the widening ripples of its silence" }, // TOL9 · O preço do silêncio
  { topic: "La libertad de no deber nada incomoda", cat: "freedom", motif: "waves", subject: "a confident swimmer gliding freely across water while onlookers frown from the shore, self-sufficiency unsettling others" }, // TOL10 · A liberdade de não dever nada
  { topic: "Amar es presentarse", cat: "network", motif: "embrace", subject: "a figure offering gifts and applause from the doorway but never stepping fully inside to embrace" }, // TOL11 · Amar é comparecer
  { topic: "El amor genérico", cat: "network", motif: "squares", subject: "a mass-produced identical heart on an assembly line, a love that fits everyone and therefore no one, no people" }, // TOL12 · O amor genérico
  { topic: "El amor idealizado que consume", cat: "network", motif: "spiral", subject: "a figure chasing a glowing idealized silhouette that keeps dissolving, the real love fading behind, unreachable fantasy" }, // TOL13 · O amor idealizado
  { topic: "La soledad masculina", cat: "self", motif: "isolation", subject: "a man laughing behind a strong mask while a heavy shadow of loneliness pools at his feet, alone under the strength" }, // TOL14 · A solidão masculina
  { topic: "La herencia invisible del padre", cat: "self", motif: "branches", subject: "a son's silhouette growing from the roots of a father-shaped tree, inheriting the decided image, no people" }, // TOL15 · A herança invisível do pai
  { topic: "El trabajo como escondite", cat: "self", motif: "bars", subject: "a desk piled with endless work forming walls around a hidden figure, busyness as a respectable hiding place" }, // TOL16 · O trabalho como esconderijo
  { topic: "¿De qué se vive?", cat: "mind", motif: "gateway", subject: "a simple plate of food beside a vast open question-shaped horizon, survival easy and meaning the real question, no people" }, // TOL17 · Vive-se de quê?
  { topic: "La prisión sin muros", cat: "freedom", motif: "bars", subject: "an open field with no walls where a figure stays frozen inside an invisible cell, fear as the only bar" }, // TOL18 · A prisão sem muro
  { topic: "No somos un tipo", cat: "mind", motif: "boundary", subject: "three overlapping glowing territories within a single silhouette, not fixed types but shifting inner regions" }, // TOL19 · Tolo, inteligente e sábio no mesmo homem
  { topic: "El pueblo se volvió pantalla", cat: "mind", motif: "iris", subject: "a village square replaced by a giant glowing screen where figures only watch and judge, never living what they see" }, // TOL20 · A vila virou tela
  { topic: "Sin hondura no cabe gente honda", cat: "mind", motif: "waves", subject: "a deep ocean flattened to a thin glowing puddle by relentless stimulation, no room left for depth, no people" }, // TOL21 · Sem profundidade não cabe gente funda
  { topic: "Morir como se vivió", cat: "mind", motif: "clock", subject: "a nearly empty hourglass beside an unopened door to life, dying as one lived without ever beginning, no people" }, // TOL22 · Morrer como se viveu

// === A Guerra Invisível dos Homens (8 temas) ===
  { topic: "El silencio que enferma al hombre", cat: "self", motif: "isolation", subject: "a row of solitary male silhouettes each sealed in silence, the taboo passed down unspoken with no shared voice" }, // GUE2 · O silêncio masculino que adoece
  { topic: "Pedir ayuda no es debilidad", cat: "self", motif: "embrace", subject: "a strong hand reaching out to grasp another offered hand, asking for help as the highest form of courage" }, // GUE4 · Pedir ajuda é coragem
  { topic: "La mente es un órgano como los demás", cat: "mind", motif: "synapse", subject: "a glowing brain resting on a medical scale beside a heart, the mind treated as any other organ, no people" }, // GUE5 · A mente é um órgão como os outros
  { topic: "Vergüenza y culpa", cat: "anxiety", motif: "descent", subject: "one figure looking down at a wrong deed while another dissolves into the shadow of being wrong, guilt versus shame" }, // GUE6 · Vergonha × culpa
  { topic: "La industria de la inseguridad", cat: "anxiety", motif: "masks", subject: "a glittering market stall selling glowing promises of hope over a hollow empty crate, insecurity sold as cure, no people" }, // GUE7 · A indústria da insegurança
  { topic: "La segunda flecha", cat: "self", motif: "burst", subject: "a first arrow striking a target while a second self-fired arrow doubles the wound, self-criticism as the second arrow, no people" }, // GUE8 · A segunda flecha
  { topic: "Aceptar no es rendirse", cat: "self", motif: "waves", subject: "hands calmly redirecting a flowing stream instead of pushing against an immovable rock, acceptance as wisdom, no people" }, // GUE9 · Aceitar não é resignar
  { topic: "Evitar la intimidad", cat: "anxiety", motif: "isolation", subject: "a figure retreating into shadow away from an open warm embrace, shame fleeing intimacy for fear of being seen" }, // GUE11 · Evitar a intimidade

// === Ensaio sobre a Morte (12 temas) ===
  { topic: "Memento mori", cat: "mind", motif: "clock", subject: "a skull resting beside a sprouting seedling under a falling hourglass, the awareness of death as a beginning, no people" }, // MOR1 · Saber que vamos morrer
  { topic: "La banalización de la muerte hoy", cat: "mind", motif: "masks", subject: "a solemn skull hidden behind a cheerful cartoon mask amid bright noise, death trivialized and concealed, no people" }, // MOR2 · A banalização da morte
  { topic: "Vivir olvidando que vas a morir", cat: "mind", motif: "spiral", subject: "a figure walking an endless glowing road that quietly crumbles away behind each step, living as if time were infinite" }, // MOR3 · Viver esquecendo que vai morrer
  { topic: "La muerte no es la villana", cat: "mind", motif: "branches", subject: "a bare branch and a blossoming branch on the same tree turning in seasons, death as part of the natural cycle, no people" }, // MOR4 · A morte é companheira, não vilã
  { topic: "Dejar de temerle a la muerte", cat: "mind", motif: "bars", subject: "a cell of fear-shaped bars dissolving into open sky, releasing the fear of death, no people" }, // MOR5 · Deixar de temer a morte
  { topic: "Sin muerte no hay vida", cat: "mind", motif: "decay", subject: "fallen decaying leaves feeding a bright new sprout rising up from them, death fueling renewal, no people" }, // MOR6 · Sem morte não há vida
  { topic: "El fin de los rituales", cat: "mind", motif: "isolation", subject: "an empty ritual hall with a single unlit candle, the vanished place for collective mourning, no people" }, // MOR7 · O fim dos rituais
  { topic: "El duelo y la aceptación", cat: "mind", motif: "waves", subject: "turbulent grey waves gradually settling into calm still water, grief moving from shock to acceptance, no people" }, // MOR8 · O luto e a aceitação
  { topic: "El día después de tu muerte", cat: "mind", motif: "ripple", subject: "a single fading footprint on a busy street where life keeps flowing on unchanged, the world after one's death, no people" }, // MOR9 · O dia seguinte à sua morte
  { topic: "El olvido", cat: "mind", motif: "decay", subject: "a name carved in stone slowly eroding to smooth blankness over ages, permission to live without asking leave, no people" }, // MOR10 · Seu nome em 1000 anos
  { topic: "Cómo la humanidad encaró la muerte", cat: "mind", motif: "gateway", subject: "a long corridor of ancient doorways from cave to cathedral marking how humanity faced death across ages, no people" }, // MOR11 · Como a humanidade encarou a morte
  { topic: "El misterio del después", cat: "mind", motif: "descent", subject: "a single glowing doorway opening into unknowable darkness, the enigma of what comes after, no people" }, // MOR12 · O mistério do depois

  // ─── Guerra Invisível: 3 temas nicho NÃO-explícitos (aprovados 2026-07-08; GUE13/14 reprovados) ───
  { topic: "La inseguridad como enfermedad, no vanidad", cat: "anxiety", motif: "masks", subject: "a figure hiding behind a calm mask while an unseen weight presses down, insecurity as a real ailment not vanity, no people" }, // GUE12 · Insegurança é doença, não vaidade
  { topic: "El placer es encuentro, no medida", cat: "self", motif: "embrace", subject: "two hands meeting in warm mutual connection instead of a measuring tape, presence over performance, no people" }, // GUE15 · Prazer é encontro, não medida
  { topic: "El cuerpo masculino como construcción cultural", cat: "mind", motif: "mirror", subject: "an old measuring ruler and cultural emblems reflected in a mirror shaping a plain silhouette, a standard inherited from culture not natural law, no people" }, // GUE16 · O corpo como construção cultural
];

const TOPICS = THEMES.map((t) => t.topic);
const TOPIC_CAT: Record<string, string> = Object.fromEntries(THEMES.map((t) => [t.topic, t.cat]));
const TOPIC_MOTIF: Record<string, string> = Object.fromEntries(THEMES.map((t) => [t.topic, t.motif]));
const TOPIC_SUBJECT: Record<string, string> = Object.fromEntries(THEMES.map((t) => [t.topic, t.subject]));
// Temas-convicção (frase-verdade do dono): título/slide preservam a frase, NUNCA viram
// "libertad". Derivado do flag `literal` (fonte única THEMES). Trava em src/lib/literal-lock.ts.
const TOPIC_LITERAL: Record<string, boolean> = Object.fromEntries(THEMES.filter((t) => t.literal).map((t) => [t.topic, true]));
// Âncora-convicção canônica em PT-BR (verbatim do dono, §4 LINHA-EDITORIAL/cânone).
// Em tema literal, a frase é fixa POR IDIOMA — o PT com âncora NUNCA é traduzido livre.
const TOPIC_LITERAL_PT: Record<string, string> = Object.fromEntries(THEMES.filter((t) => t.literal && t.literalPt).map((t) => [t.topic, t.literalPt!]));

// ─── Extrai keyword curta do tópico ──────────────────────────────────────────

// Palavra-chave do rótulo de categoria ("RECOMPENSA · {kw}"). DEVE respeitar o idioma:
// o `topic` é a chave CANÔNICA em ESPANHOL dos THEMES, então usá-lo no BR vazava espanhol
// no feed ("RECOMPENSA · PAREJA" no @dr.liberdade.br, 26/06) — defeito "BR é BR; ES é ES".
// Por isso o chamador passa o TÍTULO já no idioma (PT) e o lang escolhe os stopwords. ES
// fica IDÊNTICO: STOP_ES é o conjunto original e a regex só GANHOU acentos PT (que não
// aparecem em palavra ES) → mesma saída p/ espanhol.
const STOP_ES = new Set(["y","e","o","de","del","la","el","los","las","a","en","con","por","un","una","sus","su","al","se","lo"]);
const STOP_PT = new Set(["e","ou","o","a","os","as","de","do","da","dos","das","no","na","nos","nas","um","uma","em","com","por","para","pra","sem","que","se","ao","à","você","voce","não","nao","seu","sua","mais","te","me"]);
function extractKeyword(text: string, lang: Lang = "es"): string {
  const STOP = lang === "pt" ? STOP_PT : STOP_ES;
  const word = text.split(/\s+/).find(w => !STOP.has(w.toLowerCase())) ?? text.split(" ")[0];
  return word.toUpperCase().replace(/[^A-ZÁÉÍÓÚÜÑÃÕÂÊÔÀÇ]/g, "");
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

// Tópico do (data, run) pelo SHUFFLE BAG (saco de cartas): o catálogo é um baralho
// balanceado por categoria e um tema só REPETE depois que ~todos os outros saíram
// (janela de recência: pula os N-POOL temas mais recentes; gap ≥ 55 de 61 ≈ 9 dias).
// O "usado" vem do que REALMENTE PUBLICOU (livro-razão) → tema que FALHOU continua no
// baralho e ainda trabalha. Conserta o sub-uso (P1-Dopamina ia a 22%): agora os 61
// temas trabalham antes de qualquer repetir, cross-formato (reel ∪ carrossel) e
// cross-idioma. Determinístico → ES=PT (mesmo livro-razão) e catchup idempotente;
// re-embaralho por ciclo dá a variação. Substitui a trava antiga de 7d (que era mais
// curta e presa ao calendário → pulava vaga falhada pra sempre). Lógica pura/testada
// em selectThemeIndex (rotation.ts). Fail-open: erro de banco → rotação-base legada.
// A rede de segurança no PUBLISH (topicUsedInOtherVaga, 7d) segue intacta.
const CATS = THEMES.map((t) => t.cat);
async function getFreshTopicForRun(date: Date, runIndex: number, _lang: Lang): Promise<string> {
  try {
    const dayStr = dayBRT(date);
    // Vagas já publicadas (qualquer formato/idioma) → índice + slot, pro shuffle bag
    // saber o que já saiu NESTE ciclo. Só PUBLICADO entra (tema não-publicado fica no baralho).
    const slots = await recentPublishedSlots(16);
    const publishedIdxSlots: { idx: number; slot: number }[] = [];
    for (const s of slots) {
      const i = TOPIC_INDEX.get(s.topic);
      if (i !== undefined) publishedIdxSlots.push({ idx: i, slot: slotForDayRun(s.day, s.run) });
    }
    // Causa 3: pins REAIS dos runs de HOJE (run_topics) → o threading evita o que os
    // runs anteriores COMMITARAM (não re-deriva) → sem duplicata same-day.
    const pins = await pinnedTopicsForDay(dayStr);
    const pinnedByRun: Record<number, number> = {};
    for (const p of pins) {
      const i = TOPIC_INDEX.get(p.topic);
      if (i !== undefined) pinnedByRun[p.run] = i;
    }
    // Quarentena: temas cuja capa reprovou no QA nos últimos 7d são EVITADOS (senão o
    // tema "sem capa possível" volta todo dia e queima orçamento — lição 06-07/07).
    const banned = new Set<number>();
    for (const t of await recentQaFailedTopics(7)) {
      const i = TOPIC_INDEX.get(t);
      if (i !== undefined) banned.add(i);
    }
    const candidate = TOPICS[selectThemeIndex(CATS, dayStr, runIndex, publishedIdxSlots, RANDOM_POOL, pinnedByRun, banned)];
    // Livro-razão: 1º idioma grava (dia,run)→tema; 2º LÊ o mesmo → ES e PT no MESMO vídeo.
    // Fail-open dentro de getOrSetRunTopic → devolve `candidate` (que já não repete).
    return await getOrSetRunTopic(dayStr, runIndex, candidate);
  } catch {
    return getTopicForRun(date, runIndex);
  }
}

// Tom editorial derivado do horário (3 slots), independente do tópico.
const SLOT_FOR_RUN: Slot[] = ["manha", "tarde", "noite", "manha", "tarde", "noite", "manha"];

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
  // Trava anti-amenização: em tema-convicção, o título preserva a frase-verdade (não vira
  // "libertad"). A âncora é fixa POR IDIOMA: PT usa o verbatim canônico do dono (literalPt)
  // — nunca tradução livre (bug "cariño"→"cuidado"). ES segue usando o próprio tema.
  const isLiteral = !!TOPIC_LITERAL[topic];
  const literalDirective = buildLiteralDirective(isLiteral, acc.freedom, { lang, anchorPt: TOPIC_LITERAL_PT[topic] });
  // Âncora p/ o guardião do texto GERADO (vazamentos 27/06 e 01/07: eufemismo/antítese
  // quebrada passavam pela diretiva). null = sem verbatim p/ comparar (PT sem literalPt).
  const literalAnchor = isLiteral ? anchorForLang(topic, lang, TOPIC_LITERAL_PT[topic]) : null;

  const marketSection = acc.marketBrief
    ? `\nMERCADO / VOZ NATIVA — LEIA ANTES DE TUDO (vale mais que qualquer exemplo abaixo):\n${acc.marketBrief}\n`
    : "";

  // Funil comment→DM: quando LIGADO, a leyenda convida a comentar a palavra de marca
  // (LIBERTAD/LIBERDADE) p/ receber a prévia do livro. A palavra exata casa com a
  // detecção do funil; o nome do livro é universal (não traduzir). Desligado → "".
  const funnelOn = (process.env.ENGAGEMENT_FUNNEL_ENABLED ?? "").toLowerCase() === "on";
  const guideWord = acc.freedom.toUpperCase();
  const guideCaptionRule = funnelOn
    ? ` + una invitación clara a COMENTAR exactamente la palabra «${guideWord}» para recibir GRATIS, por mensaje privado, una PREVIA del libro «I Love Dopamina». ATENCIÓN: SOLO «${guideWord}» y «I Love Dopamina» van TAL CUAL (sin traducir); TODO LO DEMÁS de esta invitación va en ${L} NATURAL — en portugués «adelanto/avance»→«prévia», «libro»→«livro», «mensaje privado»→«mensagem privada», «gratis»→«grátis» (NUNCA dejes la palabra «adelanto» en un texto en portugués)`
    : "";

  const prompt = `Eres el editor de ${acc.brand}, estudio editorial sobre psicología, atención y ${acc.freedom} mental.

IMPORTANTE — IDIOMA: genera ABSOLUTAMENTE TODA la salida (postTitle, postBody, slides, cta, instagramCaption, tags/hashtags) en ${L}. NO mezcles idiomas — ni una sola palabra del otro idioma NI EN INGLÉS (nada de "gagged", "minefield", "mindset"…), INCLUIDAS LAS HASHTAGS (ej. en portugués es "livre", NUNCA "libre"; "encontro", NUNCA "cita"). El "Tema" de abajo está escrito en ESPAÑOL como semilla interna: PROHIBIDO copiarlo literal — el postTitle y el PRIMER slide deben estar 100% REESCRITOS en ${L}, nunca el enunciado del Tema palabra por palabra. (videoQueries es la ÚNICA excepción: va en inglés.) REVISIÓN FINAL OBLIGATORIA antes de devolver el JSON: reléelo entero y corrige cualquier ERRATA o palabra pegada (p.ej. "Yesa"→"Y esa", "#LlbertadMental"→"#LibertadMental") y elimina cualquier palabra en inglés o del otro idioma que se haya colado.
${marketSection}
Tema: "${topic}"
${SLOT_INSTRUCTIONS[slot]}
${literalDirective}
REGLA DE MARCA (${acc.brand}) — RODÍZIO DE ÁNGULOS, no la misma palabra siempre: NO fuerces "${acc.freedom}" en todos los posts (hoy TODO desemboca en "${acc.freedom} mental" y suena repetitivo y de molde). Ancla cada post en el ÁNGULO de marca que MEJOR encaje con ESTE tema — elige UNO: autonomía · atención/foco · autocontrol · coraje · presencia · límites · rechazo a la servidumbre voluntaria · autenticidad · o ${acc.freedom} (usa la palabra "${acc.freedom}"/"liberación" SOLO cuando el tema trata de hecho sobre eso). El título y al menos un insight deben ENCARNAR ese ángulo con la mirada de la marca (recuperar el control frente a lo que nos esclaviza: algoritmos, validación, miedo, hábitos) — pero SIN clichés: PROHIBIDA la muletilla "la ${acc.freedom} mental empieza cuando…" y todo cierre-plantilla de autoayuda. Como el ángulo se ancla en el TEMA, ES y PT eligen el mismo. Nada de psicología genérica: siempre con la voz de la marca. (EXCEPCIÓN tema-convicción: la conexión va en un insight, NUNCA en el título — el título preserva la frase.)

VOZ EDITORIAL: directa, valiente y sin miedo a la POLÉMICA — la polémica es la herramienta, no el accidente; es lo que genera alcance y debate. Dice VERDADES INCÓMODAS de forma LITERAL: nunca las suavices, relativices ni "equilibres" para hacerlas cómodas — la fuerza de la frase ES el producto. Desafía lo políticamente correcto y defiende la libertad de expresión y el derecho a pensar distinto ("tú tienes derecho a hacer lo que quieras; yo a decir lo que pienso").

ALMA de la marca (impregna el TONO; no la cites literalmente): hombría — fuerza, coraje y responsabilidad, y la capacidad de amar sin anularse; rechazo a la servidumbre voluntaria y al hombre pasivo que entrega su libertad; determinación de ir hasta las últimas consecuencias por un sueño; y un sentido de la vida que solo se completa en lo compartido (nadie nació para vivir solo). Cuando el tema lo permita, mira con ojo crítico la era de las pantallas: filtros y apps venden un estándar de belleza inexistente y una ilusión de opciones infinitas que dejan a la gente más sola, no más libre.

PERO la provocación viene de la IDEA, nunca del odio: atacas la idea, el sistema o el comportamiento — JAMÁS a la persona. Nunca insultes ni deshumanices a personas o grupos (por sexo, raza, orientación, etc.) ni incites violencia — eso hunde la cuenta. Incomoda con argumentos, no con desprecio.

NUNCA DIRÍA (filtro anti-IA-genérica — si la frase huele a esto, reescríbela):
- PROHIBIDO el registro coach/espiritual/corporativo: "resignificar", "empoderar", "sal de tu zona de confort", "el universo conspira", "permítete", "mindset", "fluir", "abundancia", "manifestar", "amor propio", "propósito", "buena vibra", "pensar fuera de la caja". Una palabra entra solo si carga sentido CONCRETO; si es adorno reflejo, fuera.
- NADA de pedir permiso por la idea ("no quiero ofender, pero…") ni moralina tibia ni cierre de autoayuda.
- NO sonar gurú/mesías ni reclutar "seguidores/fieles": la meta es hacer PENSAR, no crear discípulos.
- NO encajar una obra/autor/cita en cada idea (suena derivativo): referencia leve, solo cuando aporta de verdad.

MECÁNICA (que suene a él, no a IA): antítesis de punto y coma (dos mitades que giran en el pivote); veredicto corto y seco; segunda persona directa ("tú/te"); reversión (desmontar la promesa del sistema); concreto siempre (filtro, match, scroll, edición×realidad); termina en el hueso (la última palabra es la que queda).

MOTOR DE ATENCIÓN (6 principios verificados con fuente — Playbook de Atención, aprob. 2026-07-11; lo que más empuja el algoritmo es RETENCIÓN + GUARDADOS + ENVÍOS, hoy casi en cero):
- GANCHO EN 3 SEGUNDOS, y que CASE con el contenido (lo que MÁS mueve la retención — sin ella no hay seguidores): el título y el PRIMER insight CLAVAN el scroll en ~1 segundo. Preferí una PREGUNTA directa que te IMPLIQUE a "tú" y REENCUADRE el tema ("¿Y si lo que llamas amor es miedo a estar solo?", "¿Cuánto te cuesta fingir que estás bien?") — o un dato/giro concreto y contraintuitivo. Corto y filoso. Nunca abstracto ni genérico (ej. "Revisas el móvil decenas de veces al día" > "El uso del móvil es alto"). ⚠️ El gancho DEBE cumplir su promesa en el cuerpo: nada de clickbait vacío — un gancho engañoso hunde el completion, que es justo lo que destraba el alcance.
- BRECHA DE CURIOSIDAD (dosificada, NO "a medias"): abre con una pregunta GENUINA, vívida y concreta — la brecha entre lo que la persona sabe y lo que querría saber. Da un POCO de contexto (lo justo para confianza moderada: ni cero ni todo — el tirón es máximo a mitad de camino) y CIERRA el loop con honestidad al final (esa es la recompensa honesta). ⛔ Nunca des largas/"enrolar" ni cortes la respuesta prometida: la fuerza es la curiosidad REAL dosificada, no dejar algo inacabado.
- EMOCIÓN-OBJETIVO = AROUSAL POSITIVO (admiración · sorpresa · deleite): la pieza aterriza en el "uau" de ENTENDER un mecanismo, en el giro que REENCUADRA, en la SORPRESA de un dato contraintuitivo o en el DELEITE de una transformación. La provocación y la verdad incómoda siguen siendo la herramienta —esa incomodidad es sorpresa/insight, no furia—. ⛔ NUNCA ancles la pieza en RABIA, INDIGNACIÓN ni en un "enemigo" a odiar: es eficaz para viralizar pero CHOCA con el tono terapéutico de la marca (y el odio ya está prohibido). Atacas la IDEA, el sistema o el comportamiento — JAMÁS a la persona. Polémica que hace PENSAR/debatir SÍ; pieza que hace ODIAR NO.
- GUARDABLE + RECOMPENSA HONESTA: al menos UN insight es un reencuadre o micro-método accionable que la persona quiera GUARDAR (🔖) para releer. Cada pieza deja UNA lección concreta —la recompensa honesta—; el ÚLTIMO slide RESUELVE la tensión que abrió el gancho (completion), no la deja en el aire.
- ENVÍOS (sends) — la palanca nº1 de alcance NUEVO (no-seguidores): el cta invita a ENVIAR la pieza a una persona concreta ("manda esto a alguien que…", "etiqueta a quien…") — enviar/etiquetar = compartir, el señal que más trae público que aún no te sigue. Súmalo a guardar (🔖).
- PRUEBA SOCIAL HONESTA (real, local y SIN avergonzar): cuando encaje, ancla en la EXPERIENCIA COMPARTIDA — "no estás solo en esto", "le pasa a cualquiera que dejó de…", un grupo de referencia identificable ("gente como tú que…") — para dar PERTENENCIA (reduce la vergüenza, tono terapéutico de la marca). ⛔ JAMÁS inventes números, cuentas de seguidores/likes ni "X personas ya…" (además de falso, lo bloquea la regla de credibilidad): la prueba social honesta va por PERTENENCIA, no por estadística. Y NUNCA uses el dato de forma que avergüence a quien aún no llegó — empareja siempre con pertenencia ("cada día cuenta", "no estás roto"), nunca la cifra sola.
- TRAVA ÉTICA (marca ANTI-adicción a la dopamina — GATE, no sugerencia): la pieza EXPONE el mecanismo del enganche (nuestro territorio: "por qué no puedes parar de scrollear") — NUNCA lo REPLICA. Prohibido diseñar el contenido como loop de recompensa intermitente o cebo manipulador; el "enganche" es la VERDAD que ilumina, no una trampa.
- SEGUIDORES (objetivo PRINCIPAL): mucha gente que ve esto AÚN NO te sigue. La leyenda cierra SIEMPRE, antes de los hashtags, con un CTA explícito a SEGUIR a ${acc.handle} dándole una RAZÓN con la voz de la marca — provocadora, nunca genérica ("Sígueme si prefieres la verdad incómoda al aplauso fácil" SÍ; "Síguenos para más consejos" NO) — además del CTA de guardar (🔖) y enviar (📩).
- CREDIBILIDAD (REGLA DURA — si la violas, el post se DESCARTA): PROHIBIDO inventar datos con AUTORIDAD: porcentajes ("el 67%"), estudios o investigaciones ("según un estudio", "los estudios dicen"), universidades o instituciones nombradas (Harvard, Pew, OMS…), "X de cada Y" ("1 de cada 3"), y años o fechas concretas ("en 2024"): la frase debe ser ATEMPORAL. EN ESPECIAL, JAMÁS cites multiplicadores de retención/alcance ("+85% de retención = 2,8× alcance" y similares): son FALSOS (refutados). Si no es un dato REAL y verificable con fuente, NO lo pongas — la fuerza viene de la VERDAD cruda, no de cifras falsas. SÍ puedes usar un número concreto de COMPORTAMIENTO como gancho ("revisas el móvil decenas de veces al día"), pero JAMÁS presentado como estadística citada ni atribuido a nadie.
- BREVEDAD + COMPLETION: los slides son CORTOS de verdad — máx 80 chars, frases que se leen en 1-2 segundos, para que la pieza se vea ENTERA (completion + rewatch dominan la distribución). El PT-BR ya sale así de punzante; el ES también debe serlo (nada de slides de 110 chars).

Contexto investigado:
${context}

Genera un JSON válido (sin markdown, sin backticks) con esta estructura EXACTA:
{
  "postTitle": "GANCHO que clava el scroll, máx 55 chars: preferí una PREGUNTA provocadora dirigida a 'tú' que reencuadre el tema (o un giro crudo y concreto). Osado e incómodo, no cómodo. En ${L}",
  "postBody": "artículo en markdown mín 300 palabras, TODO EN ${L}",
  "slides": [
    "insight 1 — GANCHO de MÁXIMO 80 chars: una PREGUNTA filosa o una afirmación cruda que IMPLIQUE a 'tú' y abra una brecha de curiosidad. NO repitas el postTitle: el slide 1 DESARROLLA el gancho con una IDEA NUEVA, no lo replantea con otras palabras",
    "insight 2 — frase contundente de MÁXIMO 80 chars que profundiza",
    "insight 3 — reencuadre o micro-método GUARDABLE de MÁXIMO 80 chars que remata"
  ],
  "cta": "pregunta de 60-100 chars que invite a comentar y a etiquetar/compartir con alguien, en ${L}",
  "instagramCaption": "leyenda IG máx 2200 chars: gancho fuerte en la 1ª línea + desarrollo + cierre con CTA de SEGUIR a ${acc.handle} (con razón provocadora de marca) + guardar (🔖) + compartir (📩)${guideCaptionRule} + 3-5 hashtags ESPECÍFICAS DEL TEMA de este post (p.ej. dopamina→#dopamina #detoxdigital; soledad→#soledad #vínculos), NUNCA la misma etiqueta de marca en todos — como MÁXIMO una de marca y solo si encaja, en ${L}",
  "tags": ["etiqueta específica del tema", "otra del tema", "otra del tema", "(máx 1 de marca, opcional)"],
  "videoQueries": [
    "término de búsqueda EN INGLÉS para video de stock que represente VISUALMENTE la escena/emoción de ESTE post — concreto y filmable (personas, gestos, objetos, lugares), NO metáfora abstracta. Ej: 'lone man walking empty street at dusk'",
    "segundo término DISTINTO en tipo de escena (otro sujeto/lugar/gesto, NO repitas el primero). Ej: 'close up tense hands gripping coffee cup'",
    "tercer término DISTINTO otra vez (varía: persona sola, gesto, naturaleza, objeto, lugar…). Ej: 'woman alone looking out rainy window'"
  ]
}

Para "videoQueries": 3 frases EN INGLÉS, 3-6 palabras, escenas REALES y filmables (no ilustraciones ni metáforas). Deben poder encontrarse en un banco de video como Pexels y conectar con el tema del post. Las 3 tienen que ser VISUALMENTE DISTINTAS entre sí (distinto sujeto/lugar/gesto). ⚠️ EVITA el plano genérico de teléfono/pantalla — se repite en TODOS los Reels y aburre: úsalo COMO MÁXIMO en 1 de las 3, y solo si el teléfono ES el tema; prefiere escenas humanas, gestos, rostros, lugares, naturaleza, objetos. ⛔ PROHIBIDO pedir primeros planos extremos de PIEL o partes del cuerpo, texturas abstractas de cuerpo/piel, o nada sugerente/NSFW (marca de psicología, cuenta en riesgo): cada término DEBE ser un plano MEDIO o ABIERTO con un sujeto CLARO EN CONTEXTO (una persona haciendo algo, un lugar, un objeto), nunca un macro de cuerpo.`;

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
      // Normaliza os TIPOS logo após o parse (bug C4): campo omitido pelo haiku (ex.:
      // sem "tags"/"slides") vira array/string vazio → o downstream (content.tags[0],
      // content.slides.map) NUNCA lança e derruba a vaga no catch.
      content = normalizeContentJson(parseContentJson<GeneratedContent>(raw)) as GeneratedContent;
    } catch (e) {
      lastErr = e; // JSON malformado → regenera na próxima volta
      continue;
    }
    // Campos ESSENCIAIS vazios (título/slides/cta) → não publica carrossel/reel vazio:
    // trata como geração malformada e REGENERA (mesmo caminho do JSON inválido).
    const missing = missingEssentialContent(content);
    if (missing.length) {
      lastErr = new Error(`generateContent: campos essenciais ausentes/vazios → ${missing.join(", ")}`);
      continue;
    }
    // Três travas de QUALIDADE antes de aceitar a copy:
    //  (1) PUREZA DE IDIOMA (lang-guard) — bloqueio DURO (mescla não vai ao feed).
    //  (2) CREDIBILIDADE (stats-guard, item 3) — dado FABRICADO (%, ano, "X de cada Y",
    //      universidade, "según un estudio") → bloqueio DURO (reputacional). Número de
    //      comportamento como gancho ("144 veces") é PERMITIDO — só a atribuição barra.
    //  (3) DE-DUP: o 1º slide não pode repetir o título (capa × insight 1 idênticos).
    //      Conserta Reel E carrossel na origem. NÃO é bloqueio: se persistir no fim,
    //      publica mesmo assim (perder a vaga é pior; o ReelV2 ainda de-dupa no render).
    const hits = scanContentForeign(content, lang);
    const statsHits = scanContentForFabricatedStats(content);
    // Em tema-convicção com âncora conhecida, título ≈ slide 1 é POR DESIGN (os dois
    // preservam a frase; o render de-dupa) — flagrar aqui queimava 2 regenerações
    // pagas em TODO tema literal curto. O caso ruim (título e slide repetindo uma
    // frase que NÃO é a âncora) cai no guardião abaixo.
    const duped = !literalAnchor && titleDupedInSlides(content.postTitle, content.slides);
    //  (4) GUARDIÃO DA CONVICÇÃO (tema literal): a frase-âncora TEM de sair verbatim
    //      no 1º slide (ES = o tema; PT = literalPt canônico). Suavizar/eufemizar/
    //      quebrar a antítese é o "pecado-mor" da linha editorial — vazou 2× no feed
    //      (27/06 "transar"→"deita"; 01/07 fecho estufado) → bloqueio DURO.
    const anchorBroken = anchorViolated(content.slides, literalAnchor);
    if (hits.length === 0 && statsHits.length === 0 && !duped && !anchorBroken) return content;

    let note = "";
    if (hits.length) {
      lastErr = new Error(`idioma contaminado (${lang}): ${summarizeHits(hits)}`);
      note += `\n\n⚠️ CORRECCIÓN OBLIGATORIA: tu respuesta anterior dejó palabras del OTRO idioma (debe ser 100% ${L}). Palabras detectadas → ${summarizeHits(hits)}. Reescribe TODO el contenido en ${L}, sin copiar el enunciado del Tema; revisa también las hashtags.`;
    }
    if (statsHits.length) {
      if (!hits.length) lastErr = new Error(`dados fabricados: ${summarizeStatHits(statsHits)}`);
      note += `\n\n⚠️ CORRECCIÓN OBLIGATORIA (CREDIBILIDAD): incluiste datos con AUTORIDAD INVENTADA → ${summarizeStatHits(statsHits)}. PROHIBIDO porcentajes, años/fechas, "X de cada Y", nombres de universidad/estudio o "según un estudio". Reescribe SIN esas cifras: la fuerza viene de la verdad cruda, no de datos falsos. Puedes usar un número concreto de comportamiento cotidiano como gancho (ej. "revisas el móvil decenas de veces al día"), pero NUNCA presentado como estadística citada.`;
    }
    if (duped) {
      if (!hits.length) lastErr = new Error("slide repete o título");
      note += `\n\n⚠️ El slide 1 REPITE el postTitle (capa e insight idénticos). Reescribe los slides para que NINGUNO repita el título: el slide 1 DESARROLLA el gancho con una idea NUEVA.`;
    }
    if (anchorBroken) {
      if (!hits.length && !statsHits.length) lastErr = new Error(`convicção suavizada/alterada: o 1º slide não contém a âncora verbatim («${literalAnchor}»)`);
      note += `\n\n⚠️ CORRECCIÓN OBLIGATORIA (TEMA-CONVICCIÓN): el PRIMER slide DEBE contener la frase-verdad EXACTA, palabra por palabra: «${literalAnchor}». Tu respuesta anterior la reformuló/suavizó — PROHIBIDO. Copia la frase TAL CUAL como primer slide (sin eufemismos, sin explicar después del cierre, sin romper la antítesis).`;
    }
    contaminationNote = note;

    // Última tentativa: idioma contaminado, dado fabricado OU convicção alterada
    // BLOQUEIAM (caem no throw); repetição sozinha NÃO bloqueia — devolve a copy
    // (melhor publicar que perder a vaga).
    if (attempt === MAX_CONTENT_TRIES && !hits.length && !statsHits.length && !anchorBroken) return content;
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
  // TRAVA de tamanho: o IG rejeita legenda > 2200 chars (erro 36004 "Caption Too Long"),
  // e isso DERRUBAVA a publicação de UM idioma enquanto o outro passava ("só sai em 1 IG").
  // O prompt PEDE ≤2200 mas o modelo às vezes estoura → cortamos word-safe como rede.
  const IG_CAPTION_MAX = 2200;
  let safeCaption = caption ?? "";
  if (safeCaption.length > IG_CAPTION_MAX) {
    const cut = safeCaption.slice(0, IG_CAPTION_MAX);
    const lastSpace = cut.lastIndexOf(" ");
    safeCaption = (lastSpace > IG_CAPTION_MAX - 200 ? cut.slice(0, lastSpace) : cut).trimEnd();
  }
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
      caption: safeCaption,
      access_token: token,
    }),
  });
  if (!carRes.ok) throw new Error(`Carousel container error: ${await carRes.text()}`);
  const { id: carId } = await carRes.json();

  // 3. Aguardar o processamento do container ANTES de publicar (bug C1). Antes eram
  //    3s FIXOS → se o container demorasse >3s, o media_publish dava "Media not ready"
  //    (erro NÃO-duro) → a vaga falhava INTERMITENTE (provável causa-raiz nº1 dos furos
  //    do carrossel). Agora ESPELHA o poll do reel: consulta ?fields=status_code até
  //    FINISHED. Container consultado pelo ID na RAIZ do graph (NÃO sob accountId).
  //    Imagens processam rápido → cap curto ~20×3s=60s, bem abaixo do maxDuration=300
  //    (mesmo no disparo manual de 3 slots: 3×60=180s). Timeout/ERROR → lança (erro
  //    transitório: o disjuntor conta a tentativa e o catchup tenta de novo).
  let carFinished = false;
  let lastCarStatus = "?";
  for (let attempt = 1; attempt <= 20; attempt++) {
    await new Promise(res => setTimeout(res, 3000));
    const stRes = await fetch(`https://graph.instagram.com/v25.0/${carId}?fields=status_code&access_token=${token}`);
    if (!stRes.ok) continue; // transitório — segue tentando dentro do limite
    const { status_code } = await stRes.json();
    lastCarStatus = status_code ?? "(sem status_code)";
    const outcome = containerStatusOutcome(status_code);
    if (outcome === "finished") { carFinished = true; break; }
    if (outcome === "error") throw new Error(`Carousel processamento falhou (status ${lastCarStatus}) na tentativa ${attempt}`);
    // "pending" (IN_PROGRESS / PUBLISHED) → continua o poll
  }
  if (!carFinished) throw new Error(`Timeout: carrossel não finalizou (último status=${lastCarStatus})`);

  // 4. Publicar
  const pubRes = await fetch(`${base}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: carId, access_token: token }),
  });
  if (!pubRes.ok) {
    const errText = await pubRes.text();
    // ANTI-FANTASMA no ERRO DURO: um action-block/limite do IG ("Application request
    // limit reached", code 4 / 2207051) responde ERRO no media_publish MAS o post VAI
    // pro feed mesmo assim (observado: carrossel PT "O casal fake…", 26/06). Se a gente
    // LANÇA aqui, o chamador grava id NULL → a vaga fica invisível ao runAlreadyPublished
    // → o catchup re-publica → DUPLICATA. Como o post provavelmente está VIVO, devolve o
    // creation_id como SENTINELA (a vaga é gravada no livro-razão e ninguém republica).
    // Erro NÃO-duro (ex.: "media not ready", transitório, post NÃO vivo) → lança normal,
    // o disjuntor conta a tentativa e o catchup pode tentar de novo. Doutrina do dono:
    // "tem de ser ÚNICA" — melhor uma vaga marcada que uma duplicata no feed.
    if (publishFailureMode(errText) === "sentinel") return publishedId(undefined, carId);
    throw new Error(`Carousel publish error: ${errText}`);
  }
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
  // IDEMPOTÊNCIA na TABELA `posts` (anti-duplicata) — a trava que faltava. Este INSERT
  // rodava SEM guarda e em TODA tentativa da vaga (inclusive publish falho com id NULL e
  // cada redisparo do catchup) → o MESMO (lang, topic) acumulava 2–4 linhas no MESMO dia
  // (medido no ledger: 25/06 dois temas 4× cada; 01/07 "La guerra invisible del hombre" 3×).
  // Isso NÃO duplica no feed do IG (a trava topicUsedInOtherVaga já barra lá), mas duplica
  // no BLOG do site (fallback de /api/posts renderiza direto de `posts`), polui a base de
  // dedup (recentPublishedSlots lê `posts`) e infla a numeração de edição (COUNT(posts)).
  // Um tema só REPETE após ~9 dias (shuffle bag), então uma janela de 20h NUNCA barra um
  // re-air legítimo — só a duplicata do mesmo dia. Best-effort/FAIL-OPEN: se a checagem
  // falhar (ex.: sem coluna `lang` pré-migrate), segue e insere (comportamento antigo).
  try {
    const dup = await sql`
      SELECT 1 FROM posts
      WHERE lang = ${params.lang} AND topic = ${params.topic}
        AND published_at > NOW() - INTERVAL '20 hours'
      LIMIT 1
    `;
    if (dup.rows.length > 0) return; // já salvo hoje → não duplica a linha
  } catch { /* fail-open: sem tabela/coluna → cai no INSERT abaixo (estado anterior) */ }
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

  // Quais "runs" (0..6) processar nesta chamada:
  // • ?run=N  → exatamente esse horário (caminho do cron, 1 post distinto por horário)
  // • ?slot=  → um horário representativo daquele slot (1 post)
  // • vazio   → os 3 slots base (compatível com o disparo manual antigo)
  let runs: number[];
  if (runParam !== null && /^[0-6]$/.test(runParam)) {
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
      // ATOMICIDADE ES+PT (espelha o gate do carrossel): se a língua-IRMÃ desta MESMA
      // vaga JÁ publicou, NÃO bloqueia por orçamento — senão o par vira ÓRFÃO (foi o
      // PT do run 0 em 07/07: ES publicou 14:27, PT morreu no 402 do preview).
      // Bounded: no máx +1 preview por vaga; footage/pesquisa vêm do cache compartilhado.
      if (await siblingPublished(dayBRT(now), r, lang)) {
        // segue p/ completar o par — não bloqueia
      } else {
        // DISJUNTOR: 402 de orçamento é motivo que NÃO muda hoje (balde DIÁRIO). Sem o
        // hard aqui, o curl do CI falhava ANTES de qualquer bumpAttempt → o catchup
        // redisparava o workflow de 15 em 15 min até meia-noite (tempestade de 07/07).
        // Subir o teto reabre a vaga (reopenCircuitForAutomation em /api/spend).
        await bumpAttempt(dayBRT(now), r, lang, true);
        return NextResponse.json({ blocked: true, automation: "ig-reels", reason: `Orçamento diário estourado (gasto US$${gate.spent.toFixed(3)} + est US$${gate.est.toFixed(3)} > teto US$${gate.budget.toFixed(2)})`, gate }, { status: 402 });
      }
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
      clips = await selectFootage(videoQueries, cat, hashStr(reelSharedKey(topic, day)), 5, reelSharedKey(topic, day));
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
    // BR usa o TÍTULO PT (não a chave ES do tema) → sem espanhol no rótulo. ES inalterado.
    const kw = extractKeyword(lang === "pt" ? content.postTitle : topic, lang);

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

    // End-card do FUNIL no Reel (comment→DM) — SÓ quando o funil está LIGADO (a chamada
    // "comenta a palavra" só aparece se a DM consegue mesmo entregar a prévia). Mesma
    // palavra-chave/voz do slide-final do carrossel; fundo = a capa do livro (por idioma).
    const funnelOn = (process.env.ENGAGEMENT_FUNNEL_ENABLED ?? "").toLowerCase() === "on";
    const FUNNEL_TXT: Record<string, { action: string; note: string }> = {
      es: { action: "Comenta esta palabra:", note: "y te lo enviamos al Direct — gratis." },
      pt: { action: "Comente esta palavra:", note: "e mandamos no seu Direct — grátis." },
    };
    const funnel = funnelOn
      ? {
          keyword: accountFor(lang).freedom.toUpperCase(), // LIBERTAD / LIBERDADE
          action: (FUNNEL_TXT[lang] ?? FUNNEL_TXT.es).action,
          note: (FUNNEL_TXT[lang] ?? FUNNEL_TXT.es).note,
          cover: `images/dopamina-funnel-bg-${lang === "pt" ? "pt" : "es"}.png`,
        }
      : undefined;

    // Narração (voz TTS) — GATED por REEL_NARRATION_ENABLED. O roteiro é o TEXTO DA TELA
    // (gancho + insights, VERBATIM, na ordem) + cierre de seguir → a voz SEMPRE bate com a
    // tela (não é reescrita do modelo). Cache por (tópico,dia,idioma); fail-open (sem narração
    // → Reel só com música). No ReelV2 a música vira leito suave (ducking).
    const followLine = lang === "pt"
      ? "Me siga se você prefere a verdade incômoda ao aplauso."
      : "Sígueme si prefieres la verdad incómoda al aplauso.";
    const narrationText =
      [content.postTitle, ...(Array.isArray(content.slides) ? content.slides : [])]
        .map((s) => String(s).trim()).filter(Boolean)
        .map((s) => (/[.!?]$/.test(s) ? s : s + "."))
        .join(" ") + " " + followLine;
    // Janela de voz = capa(3) + insights(5,6×n) + cta(4,6), SEM o end-card. A narração ajusta
    // a velocidade p/ CABER nela → o texto acaba junto com a voz (mesmo sincronismo ES/PT, sem
    // a voz "atrasada" quando o idioma é mais verboso). n = nº de slides mostrados (cap 3).
    // nº de slides que o RENDER mostra (dedupado, cap 3) — MESMA contagem do ReelV2.
    // Usar slides.length CRU calibrava a voz p/ um vídeo mais longo → a frase final cortava.
    const nSlides = Math.min(Math.max(dedupeSlides(content.postTitle, content.slides).length, 1), 3);
    const voiceWindowSec = 3.0 + 5.6 * nSlides + 4.6 - 0.6;
    const narr = await generateNarration(narrationText, lang, topic, day, { automation: "ig-reels", meta: { run: r }, targetSeconds: voiceWindowSec });

    return NextResponse.json({
      preview: true,
      slot, run: r, topic, cat,
      lang,
      handle: accountFor(lang).handle, // @ correto por idioma (criativo do Reel)
      brand: accountFor(lang).brand, // nome de exibição por idioma
      ctaFollow: accountFor(lang).ctaFollow, // "Sigue"/"Siga" — CTA do Reel no idioma certo
      ctaBio: accountFor(lang).ctaBio, // "→ Más en el link de la bio" / "→ Mais no link da bio"
      title: content.postTitle,
      slides: content.slides,
      accentWords: [],
      cta: content.cta,
      caption: content.instagramCaption,
      kw, ed,
      funnel, // end-card do funil (só quando ENGAGEMENT_FUNNEL_ENABLED); ausente → Reel inalterado
      videoQueries, // canônicos (compartilhados entre idiomas)
      clips,        // footage COMPARTILHADO (mesmo vídeo ES/PT); [] → fetch-footage.mjs busca no CI
      sharedFootage: clips.length > 0, // diagnóstico: veio da base compartilhada?
      narrationUrl: narr.url ?? undefined, // voz TTS (gated REEL_NARRATION_ENABLED); ausente → Reel só com música
      narrationError: narr.error,
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
      const now = new Date(); // hoisted: o catch externo (disjuntor) também precisa do dia

      try {

        // As DUAS primeiras portas da vaga, na ORDEM load-bearing (slotSkipGate, PURA +
        // invariante): (1) IDEMPOTÊNCIA — se a vaga já saiu hoje nesta conta, pula (sem
        // ela, catchup + cron atrasado publicavam o carrossel 2×; o anti-dup por TÓPICO
        // não pega porque a seleção fresca dá tema diferente a cada hora). (2) DISJUNTOR de
        // fronteira — antes SÓ o watchdog lia o teto de tentativas; o próprio /api/publish
        // re-entrava sem freio no redisparo do catchup. Foi a RAIZ da DUPLICATA do carrossel
        // PT (26/06, "O casal fake…"): action-block do IG publica-e-erra → id NULL → o
        // runAlreadyPublished (exige id NOT NULL) é cego ao post-fantasma → catchup republica.
        // A ordem "publicada ANTES de desistiu" é o que impede o fantasma de reabrir, então
        // vive numa função pura testada. Só consulta attemptsToday se NÃO já publicou
        // (curto-circuito). force=1 burla as duas (backfill). Fail-open: attempts=0 → sem freio.
        const alreadyPub = !force && await runAlreadyPublished(dayBRT(now), runIndex, lang);
        const slotAttempts = (force || alreadyPub) ? 0 : await attemptsToday(dayBRT(now), runIndex, lang);
        const skipGate = slotSkipGate(alreadyPub, slotAttempts, force);
        if (skipGate === "published") {
          slotLog.skipped = true;
          slotLog.reason = `run ${runIndex} (${lang}) já publicado hoje — idempotência`;
          results.push(slotLog);
          continue;
        }
        if (skipGate === "circuit-open") {
          slotLog.skipped = true;
          slotLog.reason = `run ${runIndex} (${lang}) desistiu hoje (≥${MAX_PUBLISH_ATTEMPTS} tentativas) — disjuntor de publicação`;
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
          // Tema BLOQUEADO → libera o pin (run_topics) para a vaga recomputar um tema fresco
          // na próxima retentativa do dia. Sem isto o pin congelava o tema bloqueado e a vaga
          // ficava presa o dia todo (regressão do sub-uso). O caminho feliz não passa aqui.
          // ⚠️ MAS só se a língua-IRMÃ desta MESMA vaga AINDA NÃO publicou: se ela já saiu com
          // este tema, apagar o pin faz a retentativa deste idioma recomputar um tema DIFERENTE
          // → ES/PT viram posts divergentes na mesma vaga (quebra "mesmo tema ES/PT"). Com a
          // irmã publicada a vaga está travada no tema: mantém o pin (vira órfão, detectado)
          // em vez de par divergente. Fail-open: siblingPublished=false em erro → limpa (antigo).
          if (!(await siblingPublished(dayBRT(now), runIndex, lang))) await clearRunTopic(dayBRT(now), runIndex);
          results.push(slotLog);
          continue;
        }

        // Teto diário da automação ig-posts: se a próxima publicação estoura o
        // orçamento, BLOQUEIA (não gasta) e sinaliza p/ o GitHub Actions falhar.
        const gate = await checkBudget("ig-posts", EST_RUN_COST.publish);
        if (!gate.ok) {
          // ATOMICIDADE ES+PT (regra do dono "tem de sair nas DUAS contas"): se a língua-
          // IRMÃ desta MESMA vaga JÁ publicou, NÃO bloqueia por orçamento — senão a vaga
          // fica ÓRFÃ (ES-only). Era a causa nº1 de órfão: o balde ig-posts é compartilhado,
          // o 1º idioma gasta e o 2º bate no teto. Bounded: no máx +1 publish por vaga; a
          // ilustração do 2º vem do cache (barato). Liberar aqui COMPLETA o par.
          if (await siblingPublished(dayBRT(now), runIndex, lang)) {
            slotLog.budgetBypassPair = true; // segue p/ não orfanar o par ES+PT
          } else {
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
        // BR usa o TÍTULO PT (não a chave ES do tema) → sem espanhol no rótulo. ES inalterado.
        const kw   = extractKeyword(lang === "pt" ? content.postTitle : topic, lang);
        // mood alterna: red para ímpares, ink para pares (igual ao EditorialGrid do site)
        const mood = editionNum % 2 === 0 ? "ink" : "red";

        // Construir URLs dos slides
        const base = process.env.PRODUCTION_URL ?? "https://www.drlibertad.com";
        // Corte WORD-SAFE (nunca no meio da palavra — bug "estar viv" do ED 04 PT, onde
        // o slice(0,120) cego partia "vivo"). Default 120 (título/kw curtos); o insight e
        // o CTA têm duas orações → orçamento maior, passado explícito (ver clipSlideText).
        const enc  = (s: string, max = 120) => encodeURIComponent(clipSlideText(s, max));
        // Slide-final do FUNIL (comment→DM): só entra quando o funil está LIGADO (assim
        // a chamada "comente a palavra" só aparece quando a DM consegue mesmo entregar).
        const funnelOn = (process.env.ENGAGEMENT_FUNNEL_ENABLED ?? "").toLowerCase() === "on";
        const guideKw  = accountFor(lang).freedom.toUpperCase(); // LIBERTAD / LIBERDADE
        const totalSlides = 2 + content.slides.length + (funnelOn ? 1 : 0); // capa + insights + cta + [guia]
        const ctaNum = 2 + content.slides.length; // posição do cta (capa=1, insights=2..N+1, cta=N+2)

        // Primeira tag como categoria do rodapé
        const tag = enc(content.tags[0] ?? kw);
        // Direção de arte do slide: cor (categoria) + desenho (motivo por tema)
        const cat   = TOPIC_CAT[topic] ?? "freedom";
        const motif = TOPIC_MOTIF[topic] ?? "gateway";

        // CAPA do carrossel: ILUSTRAÇÃO editorial por IA (fal `flux/dev`, "Cinematic
        // conceptual editorial illustration") — DECISÃO TRAVADA do dono (ver
        // DECISOES-TRAVADAS.md A1/A2; referência ED 82/83).
        // [Histórico: o PR #33 pôs o motivo por padrão por um mal-entendido de "motivo";
        //  o dono confirmou (2026-06-19) que "o motivo de ontem" = ESTAS ilustrações. Revertido.]
        // 2026-06-26: best-of-3 → best-of-5. Mais candidatas → o juiz quase sempre aprova
        // uma, então a capa abstrata (motivo) some do feed. ES e PT usam o MESMO baseSeed →
        // mesmos 5 candidatos → mesma decisão (sem órfão). Surgical: SÓ a capa do carrossel;
        // o Reel clássico (linha ~605) segue best-of-3.
        // best-of-2 (era best-of-5 no Flux): a Nano Banana passa muito mais no QA (anatomia
        // boa, sem nudez), então 2 candidatas bastam — e 2×US$0,08 mantém 2 vagas/dia dentro
        // do teto US$0,50 (5× nano seria US$0,80). Troca travada 2026-07-07 (ver spend.ts).
        const ill = await generateIllustration(TOPIC_SUBJECT[topic] ?? "", cat, { automation: "ig-posts", maxTries: 2, meta: { topic, lang } });
        slotLog.illustration = ill.url ? "ia" : `fallback: ${ill.error ?? "?"}`;

        // O carrossel NÃO sai sem ilustração (decisão do dono 2026-06-26): a capa abstrata
        // (motivo) QUEBRA o padrão visual do feed — "sem capa quebra o padrão; com capa fica
        // muito melhor". Trocou a antiga "REDE DE SEGURANÇA" (que publicava o motivo) por "ou
        // com capa, ou não publica". Se o best-of-5 reprovar TUDO (raríssimo), PULA a vaga.
        // Marca desistência do dia (hard) → o catchup NÃO regenera (anti-storm/custo, lição de
        // 25/06); ES e PT pulam juntos (mesmos candidatos → mesma decisão), sem órfão. Melhor
        // 1 post a menos que 1 fora do padrão. `force=1` não chega aqui sem ilustração também.
        if (!ill.url) {
          slotLog.skipped = true;
          slotLog.reason = `capa reprovada no QA (best-of-2) — carrossel NÃO publica sem ilustração (padrão do feed). ${ill.error ?? ""}`.trim();
          await bumpAttempt(dayBRT(now), runIndex, lang, true);
          // QUARENTENA: marca o tema como "sem capa possível" → getFreshTopicForRun o
          // evita por 7d e a vaga passa a escolher um tema ilustrável AMANHÃ (em vez de
          // bater no mesmo muro todo dia queimando orçamento). Best-effort, fail-open.
          await recordQaFail(dayBRT(now), runIndex, lang, topic);
          results.push(slotLog);
          continue;
        }
        const imgParam = `&img=${encodeURIComponent(ill.url)}`;

        const slideUrls: string[] = [
          `${base}/api/og?slide=cover&slot=${slot}&title=${enc(content.postTitle)}&kw=${enc(kw)}&ed=${ed}&mood=${mood}&tag=${tag}&cat=${cat}&motif=${motif}${imgParam}&total=${totalSlides}&lang=${lang}`,
          ...content.slides.map((text, i) =>
            `${base}/api/og?slide=insight&slot=${slot}&text=${enc(text, 200)}&num=${i + 2}&total=${totalSlides}&kw=${enc(kw)}&ed=${ed}&mood=${mood}&tag=${tag}&cat=${cat}&motif=${motif}&lang=${lang}`
          ),
          `${base}/api/og?slide=cta&slot=${slot}&text=${enc(content.cta, 160)}&kw=${enc(kw)}&ed=${ed}&mood=${mood}&tag=${tag}&cat=${cat}&motif=${motif}&num=${ctaNum}&total=${totalSlides}&lang=${lang}`,
          // Slide-final do funil (comente a palavra → DM com a prévia). Só quando ligado.
          ...(funnelOn
            ? [`${base}/api/og?slide=guide&slot=${slot}&kw=${enc(guideKw)}&ed=${ed}&mood=${mood}&tag=${tag}&cat=${cat}&motif=${motif}&num=${totalSlides}&total=${totalSlides}&lang=${lang}`]
            : []),
        ];

        // Publicar carrossel — CTA da pesquisa APENSADO no rodapé da legenda na
        // fronteira do publish (append-only, idempotente, fail-open no limite de
        // 2200; ver src/lib/caption-cta.ts). O banco (savePost) guarda a legenda
        // original; generateContent/temas/rotação não são tocados.
        let instagramPostId: string | null = null;
        try {
          instagramPostId = await publishCarousel(appendSurveyCta(content.instagramCaption, lang), slideUrls, lang);
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
        // Erro REAL (era a string genérica "erro ao publicar slot" → diagnóstico CEGO no
        // incidente 25/06; agora vai na resposta HTTP que o catchup/log enxerga).
        slotLog.error = String(slotErr).slice(0, 300);
        // DISJUNTOR — TODA saída "não publicou" tem de FREAR (doutrina CLAUDE.md). Uma falha
        // FORA do publishCarousel (ilustração fal, montagem do slide, savePost) caía aqui e
        // NÃO contava tentativa → o catchup redisparava p/ sempre, REGERANDO ilustração a
        // cada vez → ralo de orçamento (25/06: 12 ilustrações, balde estourado, 0 carrossel,
        // os 2 carrosséis ES+PT órfãos com att=3 só pelo hard do 402). Conta a tentativa:
        // após MAX o catchup para. hard se for bloqueio duro do IG.
        try {
          await bumpAttempt(dayBRT(now), runIndex, lang, isHardPublishBlock(slotLog.error));
        } catch { /* best-effort: nunca quebra o pipeline por causa do freio */ }
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
