// ─── Geração de ilustração por IA (fal.ai / Flux) ────────────────────────────
// Gera UMA ilustração figurativa por post (usada na capa). Estilo editorial de
// marca + subject por tema (ver TOPIC_SUBJECT em /api/publish). Em qualquer
// falha retorna null → o /api/og cai no motivo abstrato (nunca quebra o post).
// Direção de arte: memória `art-direction-ia`.
//
// QA antes de publicar: cada imagem passa por um controle de qualidade por
// VISÃO (Claude) que reprova defeitos anatômicos (mão/dedo/membro extra, rosto
// distorcido). Se reprovar, regera; se esgotar as tentativas, devolve null e o
// /api/og usa o motivo abstrato — assim uma imagem com 3 mãos nunca é publicada.

// Acento por categoria — espelha CATS de /api/og (cor) + nome p/ o prompt.
const ACCENTS: Record<string, { word: string; hex: string }> = {
  freedom:  { word: "oxblood wine red",  hex: "#A45A5A" },
  dopamine: { word: "burnt amber ochre", hex: "#BE7A2A" },
  anxiety:  { word: "deep teal",         hex: "#3D6360" },
  network:  { word: "slate blue",        hex: "#3F5E78" },
  self:     { word: "dusty mauve",       hex: "#835A6E" },
  mind:     { word: "olive green",       hex: "#5B6B3C" },
};

// Bloco de estilo de marca (fixo) + slot de subject por tema.
// Direção: cinematográfico/escultural editorial (escolha do usuário, 2026-06-13).
function buildPrompt(subject: string, accentWord: string, accentHex: string): string {
  return [
    `Cinematic conceptual editorial illustration: ${subject}.`,
    `Dramatic chiaroscuro lighting, sculptural and atmospheric, fine film grain and subtle texture.`,
    `Restricted, desaturated palette: warm off-white paper tone (#F4F0E8) and deep ink black (#0B0B0C), with a single muted accent of ${accentWord} (${accentHex}).`,
    `One bold central metaphor, generous negative space, sober and refined like a literary-magazine cover.`,
    // Blindagem anatômica — reduz a chance de mão/dedo/membro extra (defeito nº 1 da difusão).
    `Anatomically correct and photoreal in structure: each person has exactly two arms and two hands, each hand with exactly five fingers; natural, correctly formed limbs, hands and faces. No extra, missing or fused fingers, hands, arms or limbs; no duplicated or distorted body parts.`,
    `No text, no letters, no words, no logo, no watermark. No neon, no purple gradient, no corporate clip-art, no busy clutter.`,
  ].join(" ");
}

export interface IllustrationResult {
  url: string | null;
  error?: string;
  model?: string;
  attempts?: number;   // quantas gerações foram necessárias até aprovar (ou desistir)
  qaReason?: string;   // motivo do último veredito do QA (útil no dryrun/preview)
}

const MAX_TRIES = 3;        // gera no máx. 3 vezes tentando passar no QA
const QA_MODEL = "claude-sonnet-4-6"; // visão confiável p/ contar mãos/dedos

// Gera UMA imagem no fal e confirma que a URL responde. Sem QA aqui.
async function generateOnce(
  model: string,
  key: string,
  prompt: string,
): Promise<{ url: string | null; error?: string }> {
  try {
    const res = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        image_size: { width: 1024, height: 1280 }, // 4:5 — og faz cover-fit p/ 1080×1350
        num_images: 1,
        enable_safety_checker: true,
        // sem seed fixo: cada tentativa gera uma composição diferente
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { url: null, error: `fal HTTP ${res.status}: ${body.slice(0, 220)}` };
    }
    const data = await res.json();
    const url: string | undefined = data?.images?.[0]?.url;
    if (!url) return { url: null, error: `fal resposta sem images[0].url: ${JSON.stringify(data).slice(0, 220)}` };
    let check: Response | null = null;
    try { check = await fetch(url, { method: "GET" }); } catch (e) {
      return { url: null, error: `url gerada não responde (fetch falhou: ${e instanceof Error ? e.message : String(e)})` };
    }
    if (!check.ok) return { url: null, error: `url gerada não responde (HTTP ${check.status})` };
    return { url };
  } catch (e) {
    return { url: null, error: `exceção fal: ${e instanceof Error ? e.message : String(e)}` };
  }
}

const QA_PROMPT =
  "Eres un inspector de control de calidad ESTRICTO de ilustraciones editoriales generadas por IA. " +
  "Examina la imagen SOLO en busca de defectos anatómicos o estructurales que avergonzarían a una revista: " +
  "manos o dedos de más o de menos (cada mano debe tener exactamente cinco dedos), " +
  "brazos/piernas/miembros de más, de menos o fusionados, partes del cuerpo duplicadas o deformadas, " +
  "rostros malformados (ojos de más, rasgos derretidos), o cualquier anatomía imposible. " +
  "IGNORA el estilo, el ánimo, la iluminación, el encuadre, el recorte y la elección del tema: juzga SOLO la corrección física. " +
  'Responde ÚNICAMENTE con un objeto JSON: {"ok": true|false, "reason": "breve motivo"}. ' +
  "ok debe ser false si hay CUALQUIER defecto de ese tipo visible.";

// Controle de qualidade por visão. Em erro de infra (API caída etc.) é
// fail-open: aceita a imagem para não travar o pipeline (a Claude já é usada
// antes, em generateContent — se estivesse fora, o publish nem chegaria aqui).
async function checkAnatomy(imageUrl: string): Promise<{ ok: boolean; reason: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: true, reason: "QA pulado (sem ANTHROPIC_API_KEY)" };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: QA_MODEL,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "url", url: imageUrl } },
              { type: "text", text: QA_PROMPT },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return { ok: true, reason: `QA indisponível (HTTP ${res.status}) — aceitando` };
    const data = await res.json();
    const raw: string = data?.content?.[0]?.text ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { ok: true, reason: `QA sem JSON ("${raw.slice(0, 80)}") — aceitando` };
    const verdict = JSON.parse(match[0]) as { ok?: boolean; reason?: string };
    return { ok: verdict.ok !== false, reason: verdict.reason ?? "" };
  } catch (e) {
    return { ok: true, reason: `QA exceção (${e instanceof Error ? e.message : String(e)}) — aceitando` };
  }
}

// Gera a ilustração com QA. Retorna { url } aprovada, ou { url:null, error } se
// nenhuma das tentativas passou no controle de qualidade (→ og usa o abstrato).
export async function generateIllustration(subject: string, cat: string): Promise<IllustrationResult> {
  // Lê no momento da chamada (igual CRON_SECRET) — evita leitura em hora errada do build.
  const FAL_KEY = process.env.FAL_KEY;
  const FAL_MODEL = process.env.FAL_MODEL || "fal-ai/flux/dev";
  if (!FAL_KEY) return { url: null, error: "FAL_KEY ausente no runtime" };
  if (!subject)  return { url: null, error: "subject vazio" };
  const accent = ACCENTS[cat] ?? ACCENTS.freedom;
  const prompt = buildPrompt(subject, accent.word, accent.hex);

  let lastErr = "";
  let lastQa = "";
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    const gen = await generateOnce(FAL_MODEL, FAL_KEY, prompt);
    if (!gen.url) { lastErr = gen.error ?? "erro de geração"; continue; }
    const qa = await checkAnatomy(gen.url);
    if (qa.ok) {
      return { url: gen.url, model: FAL_MODEL, attempts: attempt, qaReason: qa.reason };
    }
    lastQa = qa.reason;
    lastErr = `QA reprovou na tentativa ${attempt}: ${qa.reason}`;
    // segue o loop → regera uma composição nova
  }
  return {
    url: null,
    error: `${MAX_TRIES} tentativas sem imagem aprovada. Último: ${lastErr}`,
    model: FAL_MODEL,
    attempts: MAX_TRIES,
    qaReason: lastQa,
  };
}
