// Estructura de Atención — la MECÁNICA de retención de la casa, codificada para el
// generador de posts (se inyecta en el prompt de generateContent).
//
// Fuente única (la régua): D:\Claude\.claude\marca\atencao\ESTRUTURA-ATENCAO.html
// (las 5 ranuras fijas · el portón de 4 preguntas · las palancas de distribución),
// que a su vez DERIVA del Playbook y del Checklist-Portón de Atención. Este archivo NO
// recopia esos documentos: codifica SOLO la MECÁNICA genérica y reutilizable para que
// TODA pieza nazca con el molde correcto.
//
// REGLA DE ORO (P4): esto es MECÁNICA, no contenido. NUNCA se hardcodea aquí un
// reframe-título concreto (ej. "...está secuestrado") — esos son CONTENIDO que el dueño
// aprueba pieza por pieza. Aquí solo va el ESQUELETO: el modelo lo rellena con la voz de
// la marca (científico-leve que DESMITIFICA, nunca autoayuda ni promesa mágica).
//
// Complementa —no sustituye— el bloque "MOTOR DE ATENCIÓN" del prompt (los principios
// CON fuente): el MOTOR dice POR QUÉ; esta estructura dice DÓNDE va cada cosa (el molde)
// y CUÁNDO se descarta (el portón). Mapea las 5 ranuras sobre los campos que YA existen
// (postTitle + 3 slides + cta + instagramCaption) — no cambia el esquema del JSON.
//
// Probado OFFLINE en attention-structure.invariants.test.ts (sin llamar API paga — P2).

// ── Las 5 ranuras fijas (el molde que el generador rellena) ────────────────────────
// Orden fijo. Mapeadas sobre los campos existentes para NO cambiar el esquema/pipeline.
export const ATTENTION_STRUCTURE = `ESTRUCTURA FIJA DE LA PIEZA — 5 RANURAS (el MOLDE que rellenas; si una ranura queda vacía, la pieza NO pasa el portón). Mapea sobre los campos que ya devuelves — NO añadas slides ni cambies el formato:
- RANURA 1 · GANCHO EN 3s → va en "postTitle" + slide 1. Pregunta provocadora, dato contraintuitivo o tensión ligada a la DOR nombrada del tema. Genera "uau" (sorpresa/curiosidad), nunca morno. (No repitas el título en el slide 1: el slide 1 DESARROLLA el gancho.)
- RANURA 2 · VERDAD DESMITIFICADORA → va en slide 2. UNA verdad que rompe un mito o reencuadra la culpa — el corazón informativo que nos separa de la autoayuda rasa. Patrón: "No es X como crees; es Y".
- RANURA 3 · MICRO-PRUEBA → va DENTRO del slide 2/3 o del "postBody". Un MECANISMO cerebral/psicológico concreto que SOSTIENE la verdad (por qué pasa: un circuito, un hormona, una conducta observable). Es lo que hace la pieza creíble y GUARDABLE. ⛔ NUNCA una estadística citada/inventada (%, estudio, universidad, "X de cada Y", año) — eso lo descarta la regla de CREDIBILIDAD; la micro-prueba va por MECANISMO, no por cifra de autoridad.
- RANURA 4 · FRASE-ESPEJO → va en slide 3. La frase en 1ª/2ª persona tan EXACTA que la persona se reconoce ("eres tú") y la ENVÍA a un amigo. Es el motor del alcance a NO-seguidores (send). Patrón: "Haces [conducta íntima específica] y crees que es solo cosa tuya. No lo es." Sigue siendo GUARDABLE (remata con un reencuadre que dé pertenencia, no vergüenza).
- RANURA 5 · CTA LEVE → va en "cta" (y el cierre de la leyenda). Baja fricción: ENVIAR a alguien nombrado / GUARDAR / "hay un capítulo sobre esto en el libro" — NUNCA "compra ya" agresivo. La venta viene de la audiencia acumulada, no de la pieza suelta.`;

// ── El portón de 4 preguntas (autochequeo ANTES de devolver el JSON) ────────────────
// Es el portón MÍNIMO y objetivo del generador (la revisión humana de 9 ítems —
// Checklist-Portón— sigue siendo aparte, antes de publicar).
export const ATTENTION_GATE = `PORTÓN DE ATENCIÓN — 4 preguntas que la pieza CRUZA antes de que la devuelvas (todas "sí" o REESCRIBE la ranura que falle):
1) ¿GANCHO EN 3s validado? El título + slide 1 clavan el scroll y generan "uau"/curiosidad — NO son mornos ni genéricos.
2) ¿DOR NOMBRADA? La pieza se ancla en un dolor reconocible del tema (la persona se reconoce en la dor), no en una abstracción.
3) ¿MOTIVO-DE-COMPARTIR explícito? Existe la FRASE-ESPEJO (slide 3) que hace que alguien la ENVÍE a una persona concreta, y el "cta" NOMBRA a ese destinatario.
4) ¿SUSTANCIA DESMITIFICADORA (no promesa mágica)? Hay VERDAD + MICRO-PRUEBA (mecanismo real, sin cifra inventada). La promesa es ENTENDIMIENTO que libera — JAMÁS "cura/duerme/deja de X en 5 minutos".`;

// ── Persuasión PROHIBIDA (gate ético — cierra la pendencia sid 621) ─────────────────
// Refuerza y consolida bans ya dispersos en el prompt (gurú, cifras inventadas, loop de
// recompensa). Genérico y reutilizable.
export const FORBIDDEN_PERSUASION = `PERSUASIÓN PROHIBIDA (GATE — si la pieza usa alguna, REESCRÍBELA; son manipulación, chocan con la marca anti-adicción y con el tono terapéutico):
- ESCASEZ / URGENCIA ARTIFICIAL: "solo hoy", "últimas plazas", "queda poco tiempo", contadores o plazos falsos. La pieza es ATEMPORAL.
- PRUEBA SOCIAL VANIDOSA: alardear de seguidores/likes/ventas o "miles ya lo hicieron". La pertenencia va por experiencia compartida ("no estás solo"), nunca por cifra de vanidad (además la regla de credibilidad prohíbe inventar números).
- AUTORIDAD / GURÚ: posar de mesías o reclutar "seguidores/fieles/discípulos"; imponer por rango en vez de por argumento. La meta es hacer PENSAR, no crear discípulos.
- CTA MANIPULADOR: chantaje emocional, cebo, loop de recompensa intermitente, o cerrar la brecha de curiosidad "a medias" para forzar el clic. El CTA es leve y honesto (enviar/guardar), y el gancho SIEMPRE cumple su promesa en el cuerpo.`;

// Bloque completo que el prompt de generateContent inyecta (una sola pieza).
export function buildAttentionMechanics(): string {
  return [ATTENTION_STRUCTURE, ATTENTION_GATE, FORBIDDEN_PERSUASION].join("\n\n");
}
